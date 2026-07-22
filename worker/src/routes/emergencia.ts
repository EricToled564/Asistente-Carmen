import { Hono } from 'hono'
import type { Env, DatosEmergencia } from '../types.js'

export const emergencia = new Hono<{ Bindings: Env }>()

const KV_KEY = 'emergencia:datos'

// Estos datos NUNCA se envían a ElevenLabs ni se mezclan con el Knowledge Base — viven en su
// propia key de KV, y solo el módulo SOS/modo emergencia los lee (ver ModoEmergencia.jsx).

emergencia.get('/emergency-data', async (c) => {
  const raw = await c.env.KV.get(KV_KEY)
  if (!raw) return c.json({ nombreLegal: '', tipoSangre: '', actualizadoEn: null })
  return c.json(JSON.parse(raw) as DatosEmergencia)
})

emergencia.post('/emergency-data', async (c) => {
  const body = await c.req.json<{ nombreLegal: string; tipoSangre?: string }>()
  if (!body.nombreLegal?.trim()) {
    return c.json({ error: 'Falta el nombre legal' }, 400)
  }

  const datos: DatosEmergencia = {
    nombreLegal: body.nombreLegal.trim(),
    tipoSangre: body.tipoSangre?.trim() || 'no proporcionado',
    actualizadoEn: new Date().toISOString()
  }

  await c.env.KV.put(KV_KEY, JSON.stringify(datos))
  return c.json({ ok: true })
})
