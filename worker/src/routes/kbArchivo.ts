import { Hono } from 'hono'
import type { Env } from '../types.js'
import {
  subirKbArchivo,
  borrarKbDocumento,
  adjuntarDocumentoAlAgente,
  quitarDocumentoDelAgente
} from '../lib/elevenlabs.js'

export const kbArchivo = new Hono<{ Bindings: Env }>()

// Subir un archivo entero (una guía docente en PDF, unos apuntes en Word, un reglamento) al
// Knowledge Base de Maite.
//
// Es distinto de "Actualizar mi info" (routes/kbUpload.ts): allí se le hace una foto a algo, Claude
// extrae el contenido y se FUSIONA dentro de un documento temático que ya existe. Aquí el archivo
// es el documento: ElevenLabs lo procesa y extrae el texto él mismo (verificado con un PDF real
// el 28-jul-2026; devuelve el contenido como HTML al leerlo). Si el PDF es escaneado sin capa de
// texto o está corrupto, responde 400 "EmptyDocumentError" en vez de crear un documento vacío.
//
// El índice de lo subido vive en KV, no se deduce de la lista de ElevenLabs. Motivo: en la cuenta
// hay 60 documentos que se cargaron a mano y no son de este flujo; sin un índice propio no habría
// forma de distinguir "lo que Carmen subió desde la app" de "el KB base", y la pantalla ofrecería
// borrar documentos que no debería.

const KEY_INDICE = 'kb-archivos:indice'

// Los que ElevenLabs sabe procesar. Se valida aquí además de allí para poder dar un mensaje que
// se entienda: su 400 habla de extracción de contenido, no de "esto es un .jpg".
const EXTENSIONES = ['.pdf', '.txt', '.md', '.html', '.htm', '.docx', '.epub']

// 20 MB. El límite real lo pone ElevenLabs, pero rechazar aquí evita subir 50 MB por una red
// móvil para que fallen al final del camino.
const TAMANO_MAXIMO = 20 * 1024 * 1024

export interface ArchivoKb {
  documentId: string
  nombre: string
  archivo: string
  bytes: number
  subidoEn: string
}

async function leerIndice(env: Env): Promise<ArchivoKb[]> {
  const raw = await env.KV.get(KEY_INDICE)
  return raw ? (JSON.parse(raw) as ArchivoKb[]) : []
}

async function escribirIndice(env: Env, indice: ArchivoKb[]): Promise<void> {
  await env.KV.put(KEY_INDICE, JSON.stringify(indice))
}

function extensionValida(nombre: string): boolean {
  const bajo = nombre.toLowerCase()
  return EXTENSIONES.some((e) => bajo.endsWith(e))
}

// GET /kb-archivos — lo que Carmen ha subido, para poder verlo y borrarlo.
kbArchivo.get('/kb-archivos', async (c) => {
  const archivos = await leerIndice(c.env)
  return c.json({
    archivos,
    // El peso importa y no es obvio: el agente tiene RAG desactivado, así que todo lo que hay en
    // el KB entra en el contexto de CADA conversación. Enseñarlo en la app es lo que evita que
    // alguien suba veinte PDFs sin entender por qué Maite empieza a ir lenta.
    bytesTotales: archivos.reduce((t, a) => t + a.bytes, 0)
  })
})

// POST /kb-archivo — multipart con `archivo` y, opcionalmente, `nombre`.
kbArchivo.post('/kb-archivo', async (c) => {
  // Ver la nota en routes/vision.ts: sin esto, una petición sin formulario sale como 500 cuando
  // en realidad es un 400.
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'La petición no trae un formulario válido (multipart/form-data)' }, 400)
  }

  const archivo = formData.get('archivo') as unknown as File | null
  if (!(archivo instanceof File)) {
    return c.json({ error: 'Falta el archivo' }, 400)
  }
  if (!extensionValida(archivo.name)) {
    return c.json(
      { error: `Ese tipo de archivo no se puede leer. Sirven: ${EXTENSIONES.join(', ')}` },
      400
    )
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return c.json(
      { error: `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 20 MB.` },
      400
    )
  }
  if (archivo.size === 0) {
    return c.json({ error: 'El archivo está vacío.' }, 400)
  }

  const nombre = String(formData.get('nombre') || '').trim() || archivo.name

  const indice = await leerIndice(c.env)
  // Volver a subir el mismo archivo REEMPLAZA el anterior en vez de crear un segundo documento.
  //
  // Es el caso normal, no el raro: se sube la guía docente, sale una versión corregida y se vuelve
  // a subir. Con dos documentos, Maite tendría delante la versión vieja y la nueva a la vez, sin
  // forma de saber cuál manda — exactamente la información duplicada y contradictoria que hace que
  // un agente empiece a contestar cosas distintas a la misma pregunta.
  const previo = indice.find((a) => a.nombre.toLowerCase() === nombre.toLowerCase())

  let creado
  try {
    creado = await subirKbArchivo(c.env.ELEVENLABS_API_KEY, archivo, nombre)
  } catch (err) {
    const detalle = String(err)
    if (detalle.includes('EmptyDocumentError') || detalle.includes('No content could be extracted')) {
      return c.json(
        {
          error:
            'No se pudo leer texto de ese archivo. Si es un PDF escaneado (una foto de unas hojas), ' +
            'no tiene texto que extraer: prueba a subirlo desde "Cambió algo — cuéntaselo", que sí lee imágenes.'
        },
        400
      )
    }
    console.error('[kb-archivo] fallo al subir', err)
    return c.json({ error: 'No se pudo subir el archivo. Inténtalo de nuevo.' }, 502)
  }

  // Adjuntarlo al agente es imprescindible: sin esto el documento existe en la cuenta pero Maite
  // no lo ve, y la app diría "subido ✅" sobre algo que ella no puede leer.
  try {
    if (c.env.ELEVENLABS_AGENT_ID) {
      await adjuntarDocumentoAlAgente(c.env.ELEVENLABS_API_KEY, c.env.ELEVENLABS_AGENT_ID, {
        type: 'file',
        name: nombre,
        id: creado.id,
        usage_mode: 'auto'
      })
    }
  } catch (err) {
    // Si no se pudo adjuntar, el documento suelto no sirve para nada y encima quedaría contando
    // como subido. Se borra para no dejar basura, y se dice la verdad.
    console.error('[kb-archivo] subido pero no adjuntado, revirtiendo', err)
    await borrarKbDocumento(c.env.ELEVENLABS_API_KEY, creado.id).catch(() => {})
    return c.json({ error: 'El archivo se subió pero no se pudo conectar con Maite. No se guardó nada.' }, 502)
  }

  // Solo ahora se retira el anterior: si se hubiera borrado antes y la subida fallara, Carmen se
  // quedaría sin la versión vieja Y sin la nueva.
  if (previo) {
    await quitarDocumentoDelAgente(c.env.ELEVENLABS_API_KEY, c.env.ELEVENLABS_AGENT_ID, previo.documentId).catch(
      () => {}
    )
    await borrarKbDocumento(c.env.ELEVENLABS_API_KEY, previo.documentId).catch(() => {})
  }

  const registro: ArchivoKb = {
    documentId: creado.id,
    nombre,
    archivo: archivo.name,
    bytes: archivo.size,
    subidoEn: new Date().toISOString()
  }
  await escribirIndice(c.env, [registro, ...indice.filter((a) => a.documentId !== previo?.documentId)])

  return c.json({ ok: true, archivo: registro, reemplazo: Boolean(previo) })
})

// DELETE /kb-archivo/:documentId — quitarlo del agente y borrarlo de verdad.
kbArchivo.delete('/kb-archivo/:documentId', async (c) => {
  const documentId = c.req.param('documentId')
  const indice = await leerIndice(c.env)
  if (!indice.some((a) => a.documentId === documentId)) {
    // Se limita a borrar lo que se subió desde la app. Sin esta comprobación, este endpoint
    // permitiría borrar cualquiera de los 60 documentos base del KB con solo conocer su id.
    return c.json({ error: 'Ese documento no se subió desde la app' }, 404)
  }

  if (c.env.ELEVENLABS_AGENT_ID) {
    await quitarDocumentoDelAgente(c.env.ELEVENLABS_API_KEY, c.env.ELEVENLABS_AGENT_ID, documentId)
  }
  await borrarKbDocumento(c.env.ELEVENLABS_API_KEY, documentId)
  await escribirIndice(
    c.env,
    indice.filter((a) => a.documentId !== documentId)
  )
  return c.json({ ok: true })
})
