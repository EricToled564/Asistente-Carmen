import { Hono } from 'hono'
import type { Env } from '../types.js'
import {
  obtenerHorarioPortal,
  cursoActual,
  fijarCurso,
  vistaDelCurso,
  porDias,
  semestreVigente
} from '../lib/horarioOficialStore.js'
import { fechaEnPamplona } from '../lib/tramitesStore.js'

export const horarioPortal = new Hono<{ Bindings: Env }>()

// GET /horario/oficial?curso=&semestre=&refrescar=1
//
// El horario tal como lo publica la universidad. Es la fuente para la pestaña Horario de Académico
// y para lo que Maite contesta cuando le preguntan por sus clases.
horarioPortal.get('/horario/oficial', async (c) => {
  const forzar = c.req.query('refrescar') === '1'
  const portal = await obtenerHorarioPortal(c.env, forzar)

  const curso = Number(c.req.query('curso')) || (await cursoActual(c.env))
  const hoy = fechaEnPamplona()
  const todasDelCurso = vistaDelCurso(portal, curso).clases
  const semestre = Number(c.req.query('semestre')) || semestreVigente(todasDelCurso, hoy)

  const { clases, sesiones } = vistaDelCurso(portal, curso, semestre)

  return c.json({
    curso,
    semestre,
    cursoAcademico: portal.cursoAcademico,
    actualizado: portal.obtenido,
    // Cuando el portal falla se sirve la última copia buena, pero se dice. Un horario viejo
    // presentado como actual es exactamente el fallo que esto vino a evitar.
    aviso: portal.fallo || null,
    hoy,
    dias: porDias(clases),
    sesiones,
    profesores: [...new Set(clases.flatMap((x) => x.profesores))].sort(),
    // Para que la pantalla pueda ofrecer el otro semestre sin adivinar si existe.
    semestresDisponibles: [...new Set(todasDelCurso.map((x) => x.semestre).filter((x): x is number => x !== null))].sort()
  })
})

// POST /horario/curso — {curso}. En qué año está Carmen.
horarioPortal.post('/horario/curso', async (c) => {
  const { curso } = await c.req.json<{ curso?: number }>()
  const n = Number(curso)
  if (!Number.isInteger(n) || n < 1 || n > 4) return c.json({ error: 'El curso tiene que ser 1, 2, 3 o 4' }, 400)
  await fijarCurso(c.env, n)
  return c.json({ ok: true, curso: n })
})
