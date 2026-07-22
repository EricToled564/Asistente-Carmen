import { Hono } from 'hono'
import type { Env } from '../types.js'
import { agregarRecuerdo, buscarRecuerdos } from '../lib/memoryStore.js'

export const memory = new Hono<{ Bindings: Env }>()

// Estos dos endpoints se registran como "server tools" del agente Maite en ElevenLabs
// (retrieve_memories / add_memories) — ver /docs/memoria-server-tools.md para el schema exacto
// que hay que pegar en la plataforma. La memoria vive solo aquí, en nuestro KV, nunca en un
// tercero.

memory.post('/memory/retrieve', async (c) => {
  const body = await c.req.json<{ query?: string; limite?: number }>()
  const recuerdos = await buscarRecuerdos(c.env, body.query || '', body.limite || 5)
  return c.json({ recuerdos })
})

memory.post('/memory/add', async (c) => {
  const body = await c.req.json<{ texto?: string; categoria?: string }>()
  if (!body.texto?.trim()) {
    return c.json({ error: 'Falta "texto"' }, 400)
  }
  const recuerdo = await agregarRecuerdo(c.env, body.texto, body.categoria)
  return c.json({ ok: true, recuerdo })
})
