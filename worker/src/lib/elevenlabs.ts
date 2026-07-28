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

// --- Crear y borrar documentos ------------------------------------------------------------
//
// También VERIFICADOS contra la API real (28-jul-2026), creando, leyendo y borrando de verdad:
//
//   POST   /v1/convai/knowledge-base/text   {name, text}          -> {id, name}
//   POST   /v1/convai/knowledge-base/file   multipart: file, name -> {id, name}
//   DELETE /v1/convai/knowledge-base/{id}                         -> 204
//
// El de fichero acepta PDF/DOCX/TXT/HTML/EPUB y extrae el texto él mismo (devuelve HTML al
// leerlo). Si el PDF es escaneado o está mal formado, responde 400 EmptyDocumentError en vez de
// crear un documento vacío — así que no hace falta validar el contenido por nuestra cuenta.

export interface DocumentoKbCreado {
  id: string
  name: string
}

export async function crearKbDocumentoTexto(apiKey: string, nombre: string, texto: string): Promise<DocumentoKbCreado> {
  const res = await fetch(`${BASE}/v1/convai/knowledge-base/text`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ name: nombre, text: texto })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB crear texto ${res.status}: ${text}`)
  }
  return (await res.json()) as DocumentoKbCreado
}

export async function subirKbArchivo(apiKey: string, archivo: File, nombre: string): Promise<DocumentoKbCreado> {
  const formData = new FormData()
  formData.append('file', archivo, archivo.name)
  formData.append('name', nombre)

  const res = await fetch(`${BASE}/v1/convai/knowledge-base/file`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB subir archivo ${res.status}: ${text}`)
  }
  return (await res.json()) as DocumentoKbCreado
}

export async function borrarKbDocumento(apiKey: string, documentId: string): Promise<void> {
  const res = await fetch(`${BASE}/v1/convai/knowledge-base/${documentId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': apiKey }
  })
  // 404 = ya no existe. Que el documento no esté es exactamente el estado que se quería, así que
  // tratarlo como error solo haría fallar reintentos legítimos.
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs KB borrar ${res.status}: ${text}`)
  }
}

// --- Adjuntar y quitar documentos del agente ----------------------------------------------
//
// Crear un documento NO lo pone a disposición de Maite: hay que añadirlo además a la lista
// `conversation_config.agent.prompt.knowledge_base` del agente. Sin este paso el documento existe
// en la cuenta pero el agente no lo ve, que es un fallo silencioso de los peores — todo responde
// 200 y Maite sigue sin saber nada.
//
// El PATCH del agente hace merge en profundidad: mandar solo la rama anidada de knowledge_base
// deja intactos el system prompt (21 669 caracteres), las 8 tools y el primer mensaje. VERIFICADO
// adjuntando un documento de prueba al agente real y comparando el antes/después campo por campo.
//
// Importante: NO mandar `prompt.tools` en el PATCH. La API devuelve 400 si llegan a la vez
// `tools` (inline) y `tool_ids`, y el GET del agente devuelve las dos, así que reenviar el objeto
// entero tal cual falla.

export interface DocumentoAdjunto {
  type: 'file' | 'text' | 'url'
  name: string
  id: string
  usage_mode: 'auto' | 'prompt'
}

async function leerDocumentosDelAgente(apiKey: string, agentId: string): Promise<DocumentoAdjunto[]> {
  const res = await fetch(`${BASE}/v1/convai/agents/${agentId}`, { headers: { 'xi-api-key': apiKey } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs GET agente ${res.status}: ${text}`)
  }
  const data = (await res.json()) as {
    conversation_config?: { agent?: { prompt?: { knowledge_base?: DocumentoAdjunto[] } } }
  }
  return data.conversation_config?.agent?.prompt?.knowledge_base || []
}

async function escribirDocumentosDelAgente(apiKey: string, agentId: string, docs: DocumentoAdjunto[]): Promise<void> {
  const res = await fetch(`${BASE}/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ conversation_config: { agent: { prompt: { knowledge_base: docs } } } })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ElevenLabs PATCH agente ${res.status}: ${text}`)
  }
}

export async function adjuntarDocumentoAlAgente(
  apiKey: string,
  agentId: string,
  doc: DocumentoAdjunto
): Promise<void> {
  const actuales = await leerDocumentosDelAgente(apiKey, agentId)
  // Idempotente a propósito: si ya está adjunto, volver a añadirlo dejaría el mismo documento dos
  // veces en la lista y Maite lo leería duplicado.
  if (actuales.some((d) => d.id === doc.id)) return
  await escribirDocumentosDelAgente(apiKey, agentId, [...actuales, doc])
}

export async function quitarDocumentoDelAgente(apiKey: string, agentId: string, documentId: string): Promise<void> {
  const actuales = await leerDocumentosDelAgente(apiKey, agentId)
  const filtrados = actuales.filter((d) => d.id !== documentId)
  if (filtrados.length === actuales.length) return
  await escribirDocumentosDelAgente(apiKey, agentId, filtrados)
}
