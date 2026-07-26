import type { Env } from '../types.js'

// Apuntes de clase de Carmen: lo que sale de una captura de audio post-clase (/audio), ya
// estructurado por Claude, más la transcripción cruda.
//
// Por qué viven aquí y no en el Knowledge Base de ElevenLabs: el KB son documentos curados que
// alguien validó (planes de estudio, guías docentes, trámites). Una transcripción automática de
// una clase ruidosa no tiene esa calidad, y metida en el KB Maite la trataría con el mismo peso
// que una guía docente oficial. Aquí quedan separados: Maite los consulta explícitamente con la
// tool `consultar_apuntes` y sabe que son notas de Carmen, no fuente oficial.
//
// Y por qué no en la memoria conversacional (memoryStore): esa está pensada para frases de una o
// dos líneas y devuelve 5 resultados. Unos apuntes de clase completos desplazarían todo lo
// personal y emocional que es justo para lo que esa memoria existe.

const PREFIX = 'apunte:'
const KEY_INDICE = 'apuntes:indice'

export interface Apunte {
  id: string
  kbCode: string | null // materia (KB9-x); null si no la eligió al guardar
  materia: string // nombre legible
  titulo: string // primera línea útil de los apuntes, para la lista
  apuntes: string // versión estructurada: resumen + puntos clave + tareas
  transcripcion: string // versión cruda, tal como salió del reconocimiento de voz
  creadoEn: string
}

// Lo que guarda el índice: todo menos la transcripción cruda, que es lo pesado.
//
// El motivo es de latencia, no de espacio: la búsqueda la va a llamar un agente de voz a mitad de
// una conversación. Si cada búsqueda tuviera que leer un registro de KV por clase grabada, en un
// semestre serían más de cien lecturas y el silencio se notaría. Con el índice, buscar es UNA
// lectura, y solo se va a buscar el registro completo de los pocos que de verdad hicieron match.
export type ApunteIndexado = Omit<Apunte, 'transcripcion'>

async function leerIndice(env: Env): Promise<ApunteIndexado[]> {
  const raw = await env.KV.get(KEY_INDICE)
  return raw ? (JSON.parse(raw) as ApunteIndexado[]) : []
}

async function escribirIndice(env: Env, indice: ApunteIndexado[]): Promise<void> {
  await env.KV.put(KEY_INDICE, JSON.stringify(indice))
}

// Título para la lista: la primera línea con contenido real, sin encabezados de markdown ni
// viñetas, recortada. Si los apuntes no dan nada usable, cae al nombre de la materia — nunca se
// queda en blanco, que en una lista se ve como un registro roto.
function derivarTitulo(apuntes: string, materia: string): string {
  const linea = apuntes
    .split('\n')
    .map((l) => l.replace(/^[#\-*\d.\s]+/, '').trim())
    .find((l) => l.length > 10)
  if (!linea) return materia
  return linea.length > 90 ? `${linea.slice(0, 87)}…` : linea
}

export async function guardarApunte(
  env: Env,
  datos: { kbCode?: string | null; materia: string; apuntes: string; transcripcion?: string }
): Promise<Apunte> {
  const creadoEn = new Date().toISOString()
  const apunte: Apunte = {
    id: crypto.randomUUID(),
    kbCode: datos.kbCode?.trim() || null,
    materia: datos.materia.trim(),
    titulo: derivarTitulo(datos.apuntes, datos.materia.trim()),
    apuntes: datos.apuntes.trim(),
    transcripcion: (datos.transcripcion || '').trim(),
    creadoEn
  }

  await env.KV.put(`${PREFIX}${apunte.id}`, JSON.stringify(apunte))

  const { transcripcion: _cruda, ...indexado } = apunte
  const indice = await leerIndice(env)
  await escribirIndice(env, [...indice, indexado])

  return apunte
}

export async function listarApuntes(env: Env, kbCode?: string): Promise<ApunteIndexado[]> {
  const indice = await leerIndice(env)
  const filtrados = kbCode ? indice.filter((a) => a.kbCode === kbCode) : indice
  return filtrados.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
}

export async function obtenerApunte(env: Env, id: string): Promise<Apunte | null> {
  const raw = await env.KV.get(`${PREFIX}${id}`)
  return raw ? (JSON.parse(raw) as Apunte) : null
}

export async function borrarApunte(env: Env, id: string): Promise<void> {
  await env.KV.delete(`${PREFIX}${id}`)
  const indice = await leerIndice(env)
  await escribirIndice(
    env,
    indice.filter((a) => a.id !== id)
  )
}

function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

export interface ResultadoBusqueda extends ApunteIndexado {
  extractoTranscripcion?: string
}

// Ventana de transcripción cruda alrededor de donde apareció lo que se buscaba.
//
// Devolver la transcripción entera no es opción: una clase de dos horas son miles de palabras y
// se comerían el contexto del agente. Pero recortarla del principio tampoco sirve, porque lo que
// Carmen pregunta suele estar a la mitad. Así que se recorta alrededor del match.
function extractoAlrededor(transcripcion: string, tokens: Set<string>, radio = 400): string | undefined {
  if (!transcripcion) return undefined
  const plano = transcripcion
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  let posicion = -1
  for (const token of tokens) {
    const encontrado = plano.indexOf(token)
    if (encontrado !== -1 && (posicion === -1 || encontrado < posicion)) posicion = encontrado
  }
  if (posicion === -1) return undefined

  const desde = Math.max(0, posicion - radio)
  const hasta = Math.min(transcripcion.length, posicion + radio)
  const trozo = transcripcion.slice(desde, hasta).trim()
  // Los puntos suspensivos importan: le dicen al agente que eso es un fragmento y no la clase
  // completa, para que no afirme que el profesor "solo dijo eso".
  return `${desde > 0 ? '…' : ''}${trozo}${hasta < transcripcion.length ? '…' : ''}`
}

// Cuenta cuántas palabras de la consulta aparecen en el texto de un apunte.
//
// El match es por prefijo y no exacto porque en español la misma palabra cambia de forma todo el
// rato: buscar "axonométrica" no debe fallar contra unos apuntes que dicen "axonométricas", ni
// "proyección" contra "proyecciones". Comparar tokens enteros hacía justo eso — devolvía cero
// coincidencias en apuntes que hablaban exactamente del tema.
//
// El mínimo de 4 caracteres evita el efecto contrario: sin él, "sol" haría match con "solución",
// "solidario" y "sólido".
function contarCoincidencias(tokensTexto: string[], tokensQuery: Set<string>): number {
  let total = 0
  for (const t of tokensTexto) {
    for (const q of tokensQuery) {
      const minimo = Math.min(t.length, q.length)
      if (t === q || (minimo >= 4 && (t.startsWith(q) || q.startsWith(t)))) {
        total++
        break
      }
    }
  }
  return total
}

// Búsqueda por solape de palabras con bonus de recencia: para un solo usuario con unas cientas de
// entradas no hace falta una base vectorial.
//
// Puntúa sobre el índice (título + apuntes + materia). La transcripción cruda NO puntúa a
// propósito: está llena de muletillas y errores de reconocimiento, y dejarla puntuar hace que
// gane la clase más larga en vez de la más relevante. Solo se usa para el extracto, ya elegido
// el apunte.
export async function buscarApuntes(
  env: Env,
  query: string,
  opciones: { kbCode?: string; limite?: number } = {}
): Promise<ResultadoBusqueda[]> {
  const limite = opciones.limite ?? 3
  const indice = await listarApuntes(env, opciones.kbCode)

  if (!query.trim()) return indice.slice(0, limite)

  const tokensQuery = new Set(tokenizar(query))
  const ahora = Date.now()

  const puntuados = indice.map((a) => {
    const tokens = tokenizar(`${a.titulo} ${a.apuntes} ${a.materia}`)
    const coincidencias = contarCoincidencias(tokens, tokensQuery)
    const diasDesde = (ahora - new Date(a.creadoEn).getTime()) / (1000 * 60 * 60 * 24)
    const bonusRecencia = Math.max(0, 1 - diasDesde / 120) // un semestre
    return { apunte: a, coincidencias, score: coincidencias + bonusRecencia * 0.5 }
  })

  // El filtro es por coincidencias, NO por score: si fuera por score, el bonus de recencia por sí
  // solo bastaría para colar cualquier apunte reciente en CUALQUIER búsqueda. Maite recibiría unos
  // apuntes de otra materia como si respondieran a la pregunta y armaría el quiz con ellos. La
  // recencia solo desempata entre apuntes que sí hablan del tema.
  const ganadores = puntuados
    .filter((p) => p.coincidencias > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)

  // Solo aquí se leen los registros completos, y solo los que ganaron.
  return Promise.all(
    ganadores.map(async ({ apunte }) => {
      const completo = await obtenerApunte(env, apunte.id)
      return {
        ...apunte,
        extractoTranscripcion: completo ? extractoAlrededor(completo.transcripcion, tokensQuery) : undefined
      }
    })
  )
}
