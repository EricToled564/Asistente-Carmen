import type { Env } from '../types.js'
import { structureText } from './claude.js'
import {
  getKbDocument,
  updateKbDocument,
  crearKbDocumentoTexto,
  adjuntarDocumentoAlAgente
} from './elevenlabs.js'
import { getKbDocId, setKbDocId } from './kbRegistry.js'
import type { Apunte } from './apuntesStore.js'

// Los apuntes de clase también llegan al Knowledge Base de Maite — el RESUMEN, nunca la
// transcripción.
//
// Lo que sube es exactamente `apunte.apuntes`: la versión que Claude ya estructuró al procesar la
// grabación (resumen de 2-3 líneas + puntos clave + entregas con su fecha, ver routes/audio.ts).
// No se le hace un segundo resumen encima: sería comprimir lo ya comprimido, y cada pasada se
// come nombres propios y fechas, que es justo lo que hace útiles unos apuntes.
//
// La transcripción cruda no sube, y la razón es de tamaño: con `rag.enabled: false` en el agente,
// los 60 documentos del KB entran ENTEROS en el contexto de cada conversación. Medido el
// 28-jul-2026: 102 525 caracteres, unos 25 600 tokens. Una sola clase de 60 minutos transcrita son
// ~50 000 caracteres: media base de conocimiento de una tacada. Un semestre de 8 materias × 15
// semanas serían varios millones. Maite dejaría de arrancar mucho antes de diciembre.
//
// Así que el reparto es:
//   - KV (apuntesStore)  -> la clase COMPLETA, transcripción incluida. No se pierde nada nunca, y
//                           es de donde sale el detalle vía la tool `consultar_apuntes`.
//   - KB (este archivo)  -> el resumen de cada clase, agrupado por materia. Sirve para que Maite
//                           SEPA de qué fue cada clase sin llamar a ninguna tool.
//
// Y no se espejan al repo como el resto del KB (ver lib/kbMerge.ts): el repo es público, y las
// notas de clase de Carmen no tienen por qué acabar ahí. El respaldo de estos es KV.

// Tope por materia, en caracteres del documento.
//
// Un resumen de clase ronda los 1 000-2 000 caracteres, así que 10 000 dan para unas 6-8 clases
// recientes íntegras por asignatura. Con 8 materias son ~80 000 caracteres ≈ 20 000 tokens
// añadidos al contexto: casi duplica el KB actual, que es mucho, pero es el precio de que Maite
// sepa de qué van las clases sin preguntar. Sin tope esto crecería sin freno todo el curso, y el
// día que dejara de caber no habría ningún aviso — solo conversaciones que empiezan a fallar.
const TOPE_POR_MATERIA = 10000

// Al pasarse del tope, las clases más viejas no se borran: se condensan en un bloque único. El
// detalle íntegro sigue en KV, así que lo que se pierde aquí es recuperable con `consultar_apuntes`.
const TITULO_CONDENSADO = 'Clases anteriores (condensado)'

const PROMPT_CONDENSAR = `Te doy varios resúmenes de clases de una misma asignatura. Condénsalos \
en un solo bloque de 150 palabras como MÁXIMO, en español.

Conserva los conceptos y los nombres propios (temas, autores, técnicas) y cualquier fecha de \
examen o entrega. Puedes perder el detalle de los ejemplos. No inventes nada. Responde solo con \
el texto condensado, sin encabezados.`

function fechaLegible(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Madrid'
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

// Código de registro para el documento de una materia. Se normaliza el nombre porque llega tal
// como Carmen lo eligió en la app, y "Form and Image (Geometries)" y "form and image (geometries)"
// tienen que dar el MISMO documento — si no, cada variación de mayúsculas crearía un documento
// nuevo y acabaríamos con la información de una asignatura repartida en tres sitios.
export function codigoKbDeMateria(materia: string): string {
  const slug = materia
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `APUNTES-${slug || 'sin-materia'}`
}

function cabeceraDe(materia: string): string {
  return (
    `# Apuntes de clase — ${materia}\n\n` +
    'Resúmenes de las clases que Carmen grabó en la app, la más reciente primero. Son notas suyas, ' +
    'no material oficial de la asignatura.\n\n' +
    'Para el detalle de una clase concreta —los ejemplos del profesor, sus palabras exactas, o para ' +
    'montar un quiz fiel a lo que se dijo— usa la tool `consultar_apuntes`: ahí está la clase entera, ' +
    'esto solo es el índice.\n'
  )
}

// El documento se guarda como HTML en ElevenLabs (lo convierten ellos), así que al releerlo hay
// que volver a texto antes de partirlo por secciones. Sin esto, la separación por "## " no
// encontraría nada y cada actualización empezaría de cero, borrando las clases anteriores.
function aTextoPlano(contenido: string): string {
  return contenido
    .replace(/<\/(h[1-6]|p|div|li)>/gi, '\n')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

interface Entrada {
  titulo: string
  cuerpo: string
}

function partirEnEntradas(contenido: string): Entrada[] {
  const texto = aTextoPlano(contenido)
  const partes = texto.split(/\n##\s+/)
  // partes[0] es la cabecera (título del documento + explicación), que se regenera siempre.
  return partes
    .slice(1)
    .map((p) => {
      const salto = p.indexOf('\n')
      return salto === -1
        ? { titulo: p.trim(), cuerpo: '' }
        : { titulo: p.slice(0, salto).trim(), cuerpo: p.slice(salto + 1).trim() }
    })
    .filter((e) => e.titulo)
}

function componer(materia: string, entradas: Entrada[]): string {
  return (
    cabeceraDe(materia) +
    entradas.map((e) => `\n## ${e.titulo}\n\n${e.cuerpo}\n`).join('')
  )
}

// El título de un apunte lo deriva apuntesStore de su primera línea útil, y esa primera línea casi
// siempre es "Resumen: ..." (así es como Claude estructura las capturas, ver routes/audio.ts). Sin
// limpiarlo, cada entrada del documento sale con el encabezado repitiendo literalmente la frase
// que viene justo debajo:
//
//   ## 28 de julio de 2026 — Resumen: perspectiva cónica, punto de fuga y línea de horizonte.
//
//   Resumen: perspectiva cónica, punto de fuga y línea de horizonte.
//
// No rompe nada, pero se lee mal y duplica una frase por clase dentro de un documento que está
// limitado justo por tamaño.
export function limpiarTitulo(titulo: string): string {
  return titulo
    .replace(/^\s*resumen(\s+de\s+la\s+clase)?\s*:\s*/i, '')
    .replace(/[…\s.]+$/, '')
    .trim()
}

// Y si el cuerpo empieza por esa misma frase, se quita de ahí en vez de del título: el encabezado
// es lo que se ve en el índice, así que es el que conviene conservar.
export function quitarPrimeraLineaSiRepite(cuerpo: string, tituloLimpio: string): string {
  const lineas = cuerpo.split('\n')
  const i = lineas.findIndex((l) => l.trim())
  if (i === -1) return cuerpo
  const primera = limpiarTitulo(lineas[i])
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  // Se compara por prefijo porque el título viene recortado con "…" cuando es largo.
  if (primera && norm(primera).startsWith(norm(tituloLimpio).slice(0, 40)) && tituloLimpio.length >= 12) {
    return lineas.slice(i + 1).join('\n').trim()
  }
  return cuerpo
}

// Crea el documento de la materia si es la primera clase que se graba de ella, y lo adjunta al
// agente. Sin el adjuntar, el documento existiría en la cuenta de ElevenLabs pero Maite no lo
// vería: todo respondería 200 y ella seguiría sin saber nada de esa asignatura.
async function crearYRegistrar(env: Env, materia: string, kbCode: string): Promise<string> {
  const nombre = `Apuntes de clase — ${materia}`
  const creado = await crearKbDocumentoTexto(env.ELEVENLABS_API_KEY, nombre, cabeceraDe(materia))
  await setKbDocId(env, kbCode, creado.id)

  if (env.ELEVENLABS_AGENT_ID) {
    await adjuntarDocumentoAlAgente(env.ELEVENLABS_API_KEY, env.ELEVENLABS_AGENT_ID, {
      type: 'text',
      name: nombre,
      id: creado.id,
      usage_mode: 'auto'
    })
  }
  return creado.id
}

async function asegurarDocumento(env: Env, materia: string): Promise<{ documentId: string; kbCode: string }> {
  const kbCode = codigoKbDeMateria(materia)
  const existente = await getKbDocId(env, kbCode)
  if (existente) return { documentId: existente, kbCode }
  return { documentId: await crearYRegistrar(env, materia, kbCode), kbCode }
}

// El id registrado puede apuntar a un documento que ya no existe: basta con que alguien lo borre
// desde el panel de ElevenLabs. Sin esto, esa materia se quedaría rota PARA SIEMPRE — cada clase
// nueva intentaría escribir en un documento fantasma y fallaría en silencio, y no habría forma de
// arreglarlo desde la app. Recrearlo es lo único que deja el sistema en el estado que se esperaba.
async function documentoExiste(env: Env, documentId: string): Promise<boolean> {
  try {
    await getKbDocument(env.ELEVENLABS_API_KEY, documentId)
    return true
  } catch (err) {
    if (String(err).includes('404')) return false
    throw err
  }
}

export interface ResultadoApunteKb {
  ok: boolean
  motivo?: string
  kbCode?: string
  documentId?: string
  clasesEnElDocumento?: number
  caracteres?: number
  condensado?: boolean
}

export async function agregarApunteAlKb(env: Env, apunte: Apunte): Promise<ResultadoApunteKb> {
  let { documentId, kbCode } = await asegurarDocumento(env, apunte.materia)

  // Tal cual, sin volver a resumir: esto ya es la salida de Claude sobre la transcripción.
  const resumen = apunte.apuntes.trim()
  if (!resumen) {
    return { ok: false, motivo: 'El apunte venía vacío, no se tocó el documento.', kbCode, documentId }
  }

  if (!(await documentoExiste(env, documentId))) {
    console.warn(`[kbApuntes] ${kbCode} apuntaba a un documento borrado (${documentId}); recreando`)
    documentId = await crearYRegistrar(env, apunte.materia, kbCode)
  }

  const actual = await getKbDocument(env.ELEVENLABS_API_KEY, documentId).catch(() => '')
  const previas = partirEnEntradas(actual)

  const tituloLimpio = limpiarTitulo(apunte.titulo)
  const nueva: Entrada = {
    titulo: `${fechaLegible(apunte.creadoEn)} — ${tituloLimpio || apunte.titulo}`,
    cuerpo: quitarPrimeraLineaSiRepite(resumen, tituloLimpio)
  }

  // El condensado siempre va al final, así que se separa antes de reordenar. Si se dejara en la
  // lista normal, la clase nueva lo empujaría hacia abajo pero seguiría contando como "clase" y
  // acabaría condensándose sobre sí mismo una y otra vez.
  const condensadoPrevio = previas.find((e) => e.titulo === TITULO_CONDENSADO)
  const clases = previas.filter((e) => e.titulo !== TITULO_CONDENSADO)

  let entradas = [nueva, ...clases]
  let huboCondensacion = false

  // Recortar por el final (lo más viejo) hasta caber. La clase recién grabada nunca se toca: es la
  // que Carmen acaba de guardar y la que va a querer repasar hoy.
  const sobra = () =>
    componer(apunte.materia, condensadoPrevio ? [...entradas, condensadoPrevio] : entradas).length > TOPE_POR_MATERIA

  const aCondensar: Entrada[] = []
  while (entradas.length > 1 && sobra()) {
    aCondensar.push(entradas.pop() as Entrada)
  }

  let condensadoFinal = condensadoPrevio
  if (aCondensar.length) {
    huboCondensacion = true
    const material = [
      ...(condensadoPrevio ? [condensadoPrevio.cuerpo] : []),
      ...aCondensar.map((e) => `${e.titulo}: ${e.cuerpo}`)
    ].join('\n\n')
    const texto = (await structureText(env.ANTHROPIC_API_KEY, PROMPT_CONDENSAR, material)).trim()
    condensadoFinal = {
      titulo: TITULO_CONDENSADO,
      cuerpo:
        (texto || material.slice(0, 900)) +
        '\n\nEl contenido completo de estas clases sigue guardado: pídelo con `consultar_apuntes`.'
    }
  }

  const finales = condensadoFinal ? [...entradas, condensadoFinal] : entradas
  const documento = componer(apunte.materia, finales)

  await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, documento)

  return {
    ok: true,
    kbCode,
    documentId,
    clasesEnElDocumento: entradas.length,
    caracteres: documento.length,
    condensado: huboCondensacion
  }
}
