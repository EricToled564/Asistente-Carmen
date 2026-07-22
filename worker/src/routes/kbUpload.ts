import { Hono } from 'hono'
import type { Env } from '../types.js'
import { describeImage, structureText } from '../lib/claude.js'
import { updateKbDocument } from '../lib/elevenlabs.js'
import { getKbDocId } from '../lib/kbRegistry.js'

export const kbUpload = new Hono<{ Bindings: Env }>()

// Mecanismo B (self-service): a qué código de KB corresponde cada tipo del selector. El
// document_id real de cada código vive en el registro de KV (ver lib/kbRegistry.ts), no aquí.
const TIPO_A_KB_CODE: Record<string, string> = {
  horario: 'KB8',
  tramite: 'KB6',
  otro: 'KB7'
}

const EXTRACCION_PROMPT = `Eres Maite. Te suben una foto o texto para actualizar el Knowledge Base de \
tu propio agente. Extrae el contenido útil y estructurable. Si NO reconoces esto como información \
estructurable (por ejemplo es una foto irrelevante o texto sin sentido), responde EXACTAMENTE con \
la palabra "ACLARACION" seguido de una pregunta corta pidiendo que se lo describan — nunca inventes \
contenido para rellenar. Si sí lo reconoces, responde solo con el contenido extraído en texto plano.`

function formatoPrompt(tipo: string) {
  return `Formatea el siguiente contenido como un documento markdown limpio para el Knowledge Base \
de un agente conversacional, tipo "${tipo}". Usa encabezados y viñetas donde tenga sentido. No \
agregues información que no esté en el contenido original.`
}

kbUpload.post('/kb-upload', async (c) => {
  const formData = await c.req.formData()
  const tipo = String(formData.get('tipo') || 'otro')
  // Ver nota en routes/vision.ts sobre el tipado incompleto de FormData.get() en workers-types.
  const imagen = formData.get('imagen') as unknown as File | null
  const texto = formData.get('texto')

  let contenidoCrudo = ''

  if (imagen instanceof File) {
    const buffer = await imagen.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    contenidoCrudo = await describeImage(c.env.ANTHROPIC_API_KEY, base64, imagen.type || 'image/jpeg', EXTRACCION_PROMPT)
  } else if (typeof texto === 'string' && texto.trim()) {
    contenidoCrudo = await structureText(c.env.ANTHROPIC_API_KEY, EXTRACCION_PROMPT, texto)
  } else {
    return c.json({ error: 'Sube una imagen o pega texto' }, 400)
  }

  if (contenidoCrudo.trim().startsWith('ACLARACION')) {
    return c.json({ necesitaAclaracion: true, mensaje: contenidoCrudo.replace('ACLARACION', '').trim() })
  }

  const markdown = await structureText(c.env.ANTHROPIC_API_KEY, formatoPrompt(tipo), contenidoCrudo)

  const uploadId = crypto.randomUUID()
  await c.env.KV.put(`kb-upload:${uploadId}`, JSON.stringify({ tipo, markdown }), { expirationTtl: 60 * 60 * 24 })

  return c.json({ uploadId, markdown, tipo })
})

kbUpload.post('/kb-confirm', async (c) => {
  const body = await c.req.json<{ uploadId: string; markdown: string; tipo: string }>()

  const kbCode = TIPO_A_KB_CODE[body.tipo]
  const documentId = kbCode ? await getKbDocId(c.env, kbCode) : null
  if (!documentId) {
    return c.json({ error: `Falta cargar el document_id de ${kbCode || body.tipo} en el registro de KV` }, 500)
  }

  try {
    await updateKbDocument(c.env.ELEVENLABS_API_KEY, documentId, body.markdown)
    await c.env.KV.delete(`kb-upload:${body.uploadId}`)
    return c.json({ ok: true })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No se pudo actualizar el documento. Intenta de nuevo.' }, 502)
  }
})
