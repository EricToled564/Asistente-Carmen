import type { Env } from '../types.js'
import { getKbDocument, updateKbDocument } from './elevenlabs.js'
import { structureText } from './claude.js'
import { espejarKbEnRepo } from './github.js'

// Actualizar un documento del Knowledge Base sin perder lo que ya decía.
//
// El PATCH de ElevenLabs REEMPLAZA el documento entero — no añade. Así que actualizar de verdad
// es siempre leer, fusionar y volver a escribir el documento completo. Escribir solo el fragmento
// nuevo borra todo lo demás, y como el agente sigue respondiendo con normalidad (solo que con
// menos información), no hay ningún síntoma hasta que alguien pregunta por algo que ya no está.
//
// La fusión la hace el modelo porque no es pegar texto al final: si Carmen sube su nuevo horario,
// el anterior tiene que DESAPARECER, no quedarse debajo. Pero si sube el recibo de la villavesa,
// eso se AÑADE a lo que ya había de transporte. Distinguir esos dos casos es justo lo que un
// concatenado tonto no puede hacer, y es de donde salen los documentos con información duplicada
// y contradictoria que dejan al agente sin saber cuál de las dos versiones es la buena.

const PROMPT_FUSION = `Te doy el contenido ACTUAL de un documento de una base de conocimiento, y \
información NUEVA que hay que incorporar. Devuelve el documento COMPLETO ya actualizado, en \
markdown, sin texto extra antes ni después.

Reglas:
1. CONSERVA todo lo que siga siendo cierto. No resumas, no acortes, no reescribas por estilo lo \
que ya estaba bien. El documento resultante debe seguir teniendo todas las secciones que tenía.
2. Si la información nueva CONTRADICE o SUSTITUYE algo que ya estaba (un horario nuevo, una \
dirección nueva, un trámite ya hecho), reemplaza esa parte. No dejes las dos versiones conviviendo.
3. Si la información nueva es ADICIONAL, intégrala en la sección que le corresponda. Si no encaja \
en ninguna, crea una sección nueva al final.
4. No inventes nada que no esté ni en el documento actual ni en la información nueva.
5. Si la información nueva ya estaba dicha en el documento, devuelve el documento actual tal cual, \
sin duplicarla.`

export interface ResultadoFusion {
  ok: boolean
  motivo?: string
  largoAntes: number
  largoDespues: number
}

// Si el documento fusionado es mucho más corto que el original, algo salió mal: el modelo resumió,
// se comió secciones, o la lectura del actual falló y "fusionó" contra el vacío. Ninguno de esos
// casos debe llegar a escribirse, porque la pérdida es silenciosa e irreversible — el contenido
// anterior ya no está en ningún sitio del que recuperarlo.
//
// 0.6 deja margen para una limpieza legítima (quitar un semestre entero que ya no aplica) sin
// dejar pasar un borrado. Si un cambio legítimo choca con el límite, se ve el aviso y se hace a
// mano; es preferible a perder el documento sin enterarse.
const PROPORCION_MINIMA = 0.6

// El guardia mide INFORMACIÓN, no marcado.
//
// ElevenLabs no guarda los documentos como se subieron: los convierte a HTML
// (`<h1>...</h1><p>...</p>`). La fusión, en cambio, devuelve markdown. Comparar las longitudes
// crudas compararía dos formatos distintos y el HTML siempre pesa más por las etiquetas, así que
// una fusión perfectamente correcta podría parecer una pérdida del 20% y quedar bloqueada.
//
// Quitando etiquetas y espacio sobrante, los dos lados quedan medidos en lo único que importa:
// cuánto texto real tiene el documento.
function largoDeTexto(contenido: string): number {
  return contenido
    .replace(/<[^>]*>/g, ' ') // etiquetas HTML
    .replace(/[#*_`>|-]/g, ' ') // marcado de markdown
    .replace(/\s+/g, ' ')
    .trim().length
}

// El modelo tiende a envolver un documento entero en ```html … ``` aunque se le pida que no ponga
// nada extra. Visto en la primera prueba real contra KB5: el documento quedó correcto pero con la
// cerca de código dentro. No es cosmético — se guarda tal cual en el KB, el agente la lee como
// parte del contenido, y en cada fusión posterior se anida otra.
function quitarCercaDeCodigo(texto: string): string {
  return texto
    .trim()
    .replace(/^```[a-z]*\s*\n?/i, '')
    .replace(/\n?```\s*$/, '')
    .trim()
}

// Escribir el espejo del repo SIN dejar que un fallo suyo tumbe la actualización.
//
// El KB de ElevenLabs ya se actualizó cuando esto corre: si GitHub está caído, el token expiró o
// alguien renombró un archivo, lo único que se pierde es el historial de ESE cambio. Maite sigue
// funcionando igual. Hacer que la actualización fallara por no poder escribir el respaldo sería
// cambiar un problema pequeño por uno grande.
async function espejarSinRomper(env: Env, kbCode: string | undefined, contenido: string) {
  if (!kbCode || !env.GITHUB_TOKEN) return
  try {
    const r = await espejarKbEnRepo(env, kbCode, contenido, 'actualizado desde la app')
    if (r.ok) console.log(`[kb-espejo] ${kbCode} → ${r.archivo} (commit ${r.commit})`)
    else console.warn(`[kb-espejo] ${kbCode}: no se pudo respaldar. ${r.motivo}`)
  } catch (err) {
    console.warn(`[kb-espejo] ${kbCode}: error al respaldar`, err)
  }
}

export async function fusionarYActualizarKb(
  env: Env,
  documentId: string,
  informacionNueva: string,
  kbCode?: string
): Promise<ResultadoFusion> {
  const actual = await getKbDocument(env.ELEVENLABS_API_KEY, documentId)
  const largoAntes = largoDeTexto(actual)

  // Documento vacío: no hay nada que fusionar ni que perder.
  if (largoAntes === 0) {
    await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, informacionNueva)
    await espejarSinRomper(env, kbCode, informacionNueva)
    return { ok: true, largoAntes: 0, largoDespues: largoDeTexto(informacionNueva) }
  }

  const fusionado = quitarCercaDeCodigo(
    await structureText(
      env.ANTHROPIC_API_KEY,
      PROMPT_FUSION,
      `DOCUMENTO ACTUAL:\n${actual}\n\n---\n\nINFORMACIÓN NUEVA:\n${informacionNueva}`
    )
  )

  const largoDespues = largoDeTexto(fusionado)

  if (largoDespues < largoAntes * PROPORCION_MINIMA) {
    return {
      ok: false,
      motivo:
        `La actualización habría dejado el documento en ${largoDespues} caracteres cuando tenía ${largoAntes}. ` +
        'Eso no parece una actualización sino una pérdida de contenido, así que no se guardó nada.',
      largoAntes,
      largoDespues
    }
  }

  await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, fusionado)
  // El espejo guarda el markdown fusionado, no lo que devuelve ElevenLabs: ellos lo convierten a
  // HTML al guardarlo, y un .md lleno de etiquetas no se puede leer ni revisar en un diff.
  await espejarSinRomper(env, kbCode, fusionado)
  return { ok: true, largoAntes, largoDespues }
}
