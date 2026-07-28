import { Hono } from 'hono'
import type { Env } from '../types.js'
import {
  CATALOGO,
  leerEstados,
  actualizarUno,
  esFechaValida,
  esHoraValida,
  fechaEnPamplona,
  type Cita
} from '../lib/tramitesStore.js'

export const tramites = new Hono<{ Bindings: Env }>()

function existe(id: string) {
  return CATALOGO.some((t) => t.id === id)
}

// GET /tramites — el catálogo con el estado de cada uno ya fusionado.
//
// Se devuelven juntos a propósito: la app necesita las dos cosas para pintar una sola tarjeta, y
// pedirlas por separado abriría la puerta a enseñar una cita agendada de un trámite cuyo texto
// todavía no cargó.
tramites.get('/tramites', async (c) => {
  const estados = await leerEstados(c.env)
  const hoy = fechaEnPamplona()

  const lista = CATALOGO.map((t) => {
    const e = estados[t.id] || { estado: 'pendiente' as const }
    return {
      ...t,
      estado: e.estado,
      cita: e.cita || null,
      completadoEn: e.completadoEn || null,
      // Qué avisos ya salieron. Se expone para que la app pueda decir "ya te avisamos ayer" en vez
      // de callarse, y porque si algún día no llega un recordatorio, esto es lo primero que hay
      // que mirar para saber si el fallo fue del envío o de la lógica de fechas.
      recordatorios: e.recordatorios || {},
      // Que la cita ya pasó lo calcula el servidor, no la app: el móvil puede tener la fecha mal
      // o estar en otro huso, y de esto depende que se le pregunte "¿cómo fue?".
      citaPasada: Boolean(e.cita && e.estado === 'agendado' && e.cita.fecha < hoy)
    }
  })

  return c.json({
    tramites: lista,
    hoy,
    resumen: {
      total: lista.length,
      hechos: lista.filter((t) => t.estado === 'hecho').length,
      agendados: lista.filter((t) => t.estado === 'agendado').length
    }
  })
})

// POST /tramites/:id/agendar — {fecha, hora, lugar?, notas?}
tramites.post('/tramites/:id/agendar', async (c) => {
  const id = c.req.param('id')
  if (!existe(id)) return c.json({ error: 'No existe ese trámite' }, 404)

  const body = await c.req.json<Cita>()
  if (!esFechaValida(body.fecha || '')) {
    return c.json({ error: 'La fecha tiene que venir como AAAA-MM-DD' }, 400)
  }
  if (!esHoraValida(body.hora || '')) {
    return c.json({ error: 'La hora tiene que venir como HH:MM' }, 400)
  }

  const cita: Cita = {
    fecha: body.fecha,
    hora: body.hora,
    lugar: body.lugar?.trim() || undefined,
    notas: body.notas?.trim() || undefined
  }

  const nuevo = await actualizarUno(c.env, id, (previo) => ({
    ...previo,
    estado: 'agendado',
    cita,
    // Los recordatorios se reinician: si movió la cita, los avisos de la fecha anterior ya no
    // valen y tienen que volver a poder mandarse. Sin esto, cambiar una cita de fecha la dejaría
    // sin aviso de la víspera para siempre.
    recordatorios: {}
  }))

  return c.json({ ok: true, tramite: { id, ...nuevo } })
})

// DELETE /tramites/:id/cita — quitar la cita sin marcar el trámite como hecho.
tramites.delete('/tramites/:id/cita', async (c) => {
  const id = c.req.param('id')
  if (!existe(id)) return c.json({ error: 'No existe ese trámite' }, 404)

  const nuevo = await actualizarUno(c.env, id, () => ({ estado: 'pendiente', recordatorios: {} }))
  return c.json({ ok: true, tramite: { id, ...nuevo } })
})

// POST /tramites/:id/completar — hecho. Se guarda la fecha para que se vea cuándo.
tramites.post('/tramites/:id/completar', async (c) => {
  const id = c.req.param('id')
  if (!existe(id)) return c.json({ error: 'No existe ese trámite' }, 404)

  const nuevo = await actualizarUno(c.env, id, (previo) => ({
    ...previo,
    estado: 'hecho',
    completadoEn: new Date().toISOString()
  }))
  return c.json({ ok: true, tramite: { id, ...nuevo } })
})

// POST /tramites/:id/reabrir — se marcó por error, o el trámite se cayó y hay que repetirlo.
tramites.post('/tramites/:id/reabrir', async (c) => {
  const id = c.req.param('id')
  if (!existe(id)) return c.json({ error: 'No existe ese trámite' }, 404)

  const nuevo = await actualizarUno(c.env, id, () => ({ estado: 'pendiente', recordatorios: {} }))
  return c.json({ ok: true, tramite: { id, ...nuevo } })
})
