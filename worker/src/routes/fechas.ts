import { Hono } from 'hono'
import type { Env } from '../types.js'
import { leer, escribir, listar, esFechaValida, type FechaPropia } from '../lib/fechasStore.js'
import { fechaEnPamplona } from '../lib/tramitesStore.js'

export const fechas = new Hono<{ Bindings: Env }>()

// GET /fechas — el radar entero: lo publicado por la universidad y lo que ella apuntó.
fechas.get('/fechas', async (c) => {
  const hoy = fechaEnPamplona()
  const { fechas: lista, avisoPortal } = await listar(c.env, hoy)
  return c.json({
    hoy,
    fechas: lista,
    avisoPortal,
    resumen: {
      total: lista.length,
      porVenir: lista.filter((f) => f.fecha >= hoy && !f.hecha).length,
      oficiales: lista.filter((f) => f.origen === 'oficial').length
    }
  })
})

// POST /fechas — {titulo, fecha, tipo, nota}. Una fecha suya.
fechas.post('/fechas', async (c) => {
  const b = await c.req.json<Partial<FechaPropia>>()
  const titulo = String(b.titulo || '').trim()
  if (!titulo) return c.json({ error: 'Falta el título' }, 400)
  if (!esFechaValida(b.fecha)) return c.json({ error: 'La fecha tiene que venir como AAAA-MM-DD' }, 400)
  const tipo = b.tipo === 'examen' || b.tipo === 'entrega' ? b.tipo : 'otro'

  const a = await leer(c.env)
  const nueva: FechaPropia = {
    id: `propia:${crypto.randomUUID()}`,
    titulo,
    fecha: b.fecha,
    tipo,
    ...(b.nota ? { nota: String(b.nota).slice(0, 300) } : {})
  }
  a.propias.push(nueva)
  await escribir(c.env, a)
  return c.json({ ok: true, fecha: nueva })
})

// DELETE /fechas/:id — borra las suyas; las oficiales se ocultan, no se borran.
fechas.delete('/fechas/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const a = await leer(c.env)

  if (id.startsWith('oficial:')) {
    if (!a.ocultas.includes(id)) a.ocultas.push(id)
    a.hechas = a.hechas.filter((x) => x !== id)
    await escribir(c.env, a)
    return c.json({ ok: true, accion: 'ocultada' })
  }

  const antes = a.propias.length
  a.propias = a.propias.filter((f) => f.id !== id)
  if (a.propias.length === antes) return c.json({ error: 'No tengo esa fecha' }, 404)
  a.hechas = a.hechas.filter((x) => x !== id)
  await escribir(c.env, a)
  return c.json({ ok: true, accion: 'borrada' })
})

// POST /fechas/:id/hecha — {hecha: true|false}
fechas.post('/fechas/:id/hecha', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const b = await c.req.json<{ hecha?: boolean }>().catch(() => ({ hecha: true }))
  const a = await leer(c.env)

  if (b.hecha === false) {
    a.hechas = a.hechas.filter((x) => x !== id)
  } else if (!a.hechas.includes(id)) {
    a.hechas.push(id)
  }
  await escribir(c.env, a)
  return c.json({ ok: true })
})

// POST /fechas/restaurar — devuelve al radar todas las oficiales que hubiera ocultado.
fechas.post('/fechas/restaurar', async (c) => {
  const a = await leer(c.env)
  const cuantas = a.ocultas.length
  a.ocultas = []
  await escribir(c.env, a)
  return c.json({ ok: true, restauradas: cuantas })
})

// --- Consulta por voz --------------------------------------------------------------------
//
// GET /fechas/consulta — lo que viene, ya redactado. Maite pregunta esto cuando Carmen dice "¿qué
// tengo esta semana?" o "¿cuándo es el examen de…?".
fechas.get('/fechas/consulta', async (c) => {
  const hoy = fechaEnPamplona()
  const { fechas: lista } = await listar(c.env, hoy)
  const porVenir = lista.filter((f) => f.fecha >= hoy && !f.hecha).slice(0, 12)

  if (!porVenir.length) {
    return c.json({
      hay: 0,
      mensaje:
        'No tiene ninguna fecha por delante en el radar. Si te dice que sí tiene algo, dile que lo apunte en Académico → Radar de fechas para que te avise.'
    })
  }

  return c.json({
    hoy,
    hay: porVenir.length,
    fechas: porVenir.map((f) => ({
      titulo: f.titulo,
      fecha: f.fecha,
      hora: f.hora || null,
      aula: f.aula || null,
      dentroDeDias: Math.round((Date.parse(`${f.fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000),
      // Que sepa de dónde sale cada una, para no afirmar de más.
      esOficial: f.origen === 'oficial'
    })),
    comoDecirlo:
      'Las marcadas como oficiales salen del horario publicado por la universidad: puedes darlas por buenas con día, hora y aula, pero el portal NO dice si son examen, entrega o clase de correcciones, así que no lo llames "examen" salvo que Carmen lo haya llamado así. Las otras las apuntó ella. Di las fechas como se dicen hablando: "el martes 1 de diciembre", no "2026-12-01".'
  })
})
