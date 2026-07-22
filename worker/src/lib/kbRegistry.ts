import type { Env } from '../types.js'

// Registro flexible de document_id de ElevenLabs, uno por código de documento (KB1, KB3, KB8,
// KB9-1, etc). Reemplaza las variables de entorno KB_DOC_ID_* fijas del wrangler.toml — esas
// no escalan a 27+ documentos (y menos a las guías docentes, que varían por semestre).
//
// Sembrar/actualizar un ID (una vez subido el documento a mano en ElevenLabs):
//   npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"
//
// Ver todos los IDs cargados:
//   npx wrangler kv key list --binding=KV --prefix="kb-doc-id:"

const PREFIX = 'kb-doc-id:'

export async function getKbDocId(env: Env, kbCode: string): Promise<string | null> {
  return env.KV.get(`${PREFIX}${kbCode}`)
}

export async function setKbDocId(env: Env, kbCode: string, documentId: string): Promise<void> {
  await env.KV.put(`${PREFIX}${kbCode}`, documentId)
}
