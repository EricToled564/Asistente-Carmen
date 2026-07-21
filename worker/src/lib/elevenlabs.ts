// Helpers sobre la API de ElevenLabs: Scribe (speech-to-text) y el Knowledge Base del
// agente Conversational AI. La API key vive solo en el Worker.
//
// ⚠️ Los endpoints de Knowledge Base (getKbDocument/updateKbDocument) son una superficie más
// nueva de la API de ElevenLabs — verifica los paths y el método exacto (PATCH vs. borrar+
// recrear) contra https://elevenlabs.io/docs antes de depender de esto en producción. Aquí se
// documenta la forma más plausible al momento de escribir este código.

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

export async function getKbDocument(apiKey: string, documentId: string): Promise<string> {
  const res = await fetch(`${BASE}/v1/convai/knowledge-base/${documentId}`, {
    headers: { 'xi-api-key': apiKey }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB GET ${res.status}: ${text}`)
  }
  const data = (await res.json()) as { content?: string; text?: string }
  return data.content || data.text || ''
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
