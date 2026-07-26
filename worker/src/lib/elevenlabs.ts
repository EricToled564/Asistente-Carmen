// Helpers sobre la API de ElevenLabs: Scribe (speech-to-text) y el Knowledge Base del
// agente Conversational AI. La API key vive solo en el Worker.
//
// Los endpoints de Knowledge Base están VERIFICADOS contra la API real (26-jul-2026), creando un
// documento de prueba, leyéndolo, actualizándolo y borrándolo:
//
//   GET  /v1/convai/knowledge-base/{id}           -> METADATOS. No trae el contenido.
//   GET  /v1/convai/knowledge-base/{id}/content   -> el contenido, como texto plano
//   PATCH /v1/convai/knowledge-base/{id}          -> {content} REEMPLAZA el documento entero
//
// Las tres líneas importan. Antes esto leía el contenido del GET normal, que no lo trae: devolvía
// siempre cadena vacía. Y como el PATCH reemplaza en vez de añadir, cualquier flujo que hiciera
// "lee el actual, mézclalo, escribe" estaba en realidad haciendo "lee nada, escribe solo lo
// nuevo" — o sea, borrando el documento completo y dejando el fragmento. En silencio.

const BASE = 'https://api.elevenlabs.io'

export async function transcribirAudio(apiKey: string, audioBlob: Blob, filename: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, filename)
  formData.append('model_id', 'scribe_v1')

  const res = await fetch(`${BASE}/v1/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs STT ${res.status}: ${text}`)
  }
  const data = (await res.json()) as { text?: string }
  return data.text || ''
}

// El contenido vive en /content, no en el GET del documento. El GET normal solo devuelve
// metadatos (id, name, type, folder_path...) y NINGÚN campo con el texto.
export async function getKbDocument(apiKey: string, documentId: string): Promise<string> {
  const res = await fetch(`${BASE}/v1/convai/knowledge-base/${documentId}/content`, {
    headers: { 'xi-api-key': apiKey }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB GET content ${res.status}: ${text}`)
  }
  // Devuelve texto plano, no JSON.
  return await res.text()
}

export async function updateKbDocument(apiKey: string, documentId: string, markdown: string): Promise<void> {
  const res = await fetch(`${BASE}/v1/convai/knowledge-base/${documentId}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ content: markdown })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB PATCH ${res.status}: ${text}`)
  }
}
