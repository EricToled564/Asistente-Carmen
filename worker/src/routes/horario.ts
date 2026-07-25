import { Hono } from 'hono'
import type { Env } from '../types.js'
import { obtenerHorarioEstructurado } from '../lib/horarioEstado.js'

export const horario = new Hono<{ Bindings: Env }>()

// GET /horario — para la pestaña Académico → Horario de la app. Si nunca se ha subido nada vía
// "Actualizar mi info" (ej. recién desplegado), devuelve null y la app cae al horario del
// semestre 1 precargado en app/src/data/horario.js.
horario.get('/horario', async (c) => {
  const datos = await obtenerHorarioEstructurado(c.env)
  return c.json({ datos })
})
