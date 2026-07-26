import { Hono } from 'hono'
import type { Env } from '../types.js'

export const tips = new Hono<{ Bindings: Env }>()

// Los tips académicos viven en kb/KB10-tips-academicos.md — la MISMA fuente que consulta Maite,
// nunca una copia aparte. La pantalla de la app los lee del bundle del frontend (import ?raw,
// igual que las guías docentes), así que este endpoint existe solo para el caso en que se quiera
// consultar desde fuera de la app; la pantalla no depende de él.
//
// Cuando el documento se sube al KB de ElevenLabs, su document_id se registra en KV igual que
// los demás (ver lib/kbRegistry.ts): "kb-doc-id:KB10".
tips.get('/tips/estado', async (c) => {
  const docId = await c.env.KV.get('kb-doc-id:KB10')
  return c.json({ registradoEnElevenLabs: Boolean(docId) })
})
