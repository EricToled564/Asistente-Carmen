import { Hono } from 'hono'
import type { Env } from '../types.js'
import {
  obtenerHorarioPortal,
  cursoActual,
  fijarCurso,
  vistaDelCurso,
  porDias,
  semestreVigente,
  semestreActualGuardado
} from '../lib/horarioOficialStore.js'
import { fechaEnPamplona } from '../lib/tramitesStore.js'
import { esDelSemestre } from '../lib/fechasStore.js'

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
  // El semestre "de Carmen": el fijado al preparar el semestre manda; el calendario es solo el
  // fallback de cuando nunca se ha preparado ninguno.
  const semestreDeCarmen = (await semestreActualGuardado(c.env)) ?? semestreVigente(todasDelCurso, hoy)
  const semestre = Number(c.req.query('semestre')) || semestreDeCarmen

  const { clases, sesiones } = vistaDelCurso(portal, curso, semestre)

  // El portal mete sesiones de junio en su vista del primer semestre (y al revés). Se filtran por
  // mes: del semestre que no es el suyo, Carmen no ve NADA.
  const sesionesDelSemestre = sesiones.filter((s) => esDelSemestre(s.fecha, semestre))

  return c.json({
    curso,
    semestre,
    // Para que las pantallas sepan cuál es EL SUYO aunque estén enseñando otro.
    semestreActual: semestreDeCarmen,
    cursoAcademico: portal.cursoAcademico,
    actualizado: portal.obtenido,
    // Cuando el portal falla se sirve la última copia buena, pero se dice. Un horario viejo
    // presentado como actual es exactamente el fallo que esto vino a evitar.
    aviso: portal.fallo || null,
    hoy,
    dias: porDias(clases),
    sesiones: sesionesDelSemestre,
    profesores: [...new Set(clases.flatMap((x) => x.profesores))].sort(),
    // Para que la pantalla pueda ofrecer el otro semestre sin adivinar si existe.
    semestresDisponibles: [...new Set(todasDelCurso.map((x) => x.semestre).filter((x): x is number => x !== null))].sort()
  })
})

// GET /semestre-actual — el bloque en el que Carmen está: {curso, semestre}.
//
// Endpoint chiquito a propósito: lo consultan varias pantallas al abrirse (tips, captura,
// calificaciones) solo para saber en qué semestre está ella, y obligarlas a pedir el horario
// entero para ese dato sería pagar el portal cada vez.
horarioPortal.get('/semestre-actual', async (c) => {
  const curso = await cursoActual(c.env)
  const guardado = await semestreActualGuardado(c.env)
  if (guardado) return c.json({ curso, semestre: guardado, origen: 'preparado' })
  // Nunca se ha preparado un semestre: cae al calendario usando la copia guardada del portal (sin
  // forzar red), o al mes del año si no hay ni copia.
  try {
    const portal = await obtenerHorarioPortal(c.env)
    const clases = vistaDelCurso(portal, curso).clases
    return c.json({ curso, semestre: semestreVigente(clases, fechaEnPamplona()), origen: 'calendario' })
  } catch {
    const mes = Number(fechaEnPamplona().slice(5, 7))
    return c.json({ curso, semestre: mes >= 8 ? 1 : 2, origen: 'calendario' })
  }
})

// POST /horario/curso — {curso}. En qué año está Carmen.
horarioPortal.post('/horario/curso', async (c) => {
  const { curso } = await c.req.json<{ curso?: number }>()
  const n = Number(curso)
  if (!Number.isInteger(n) || n < 1 || n > 4) return c.json({ error: 'El curso tiene que ser 1, 2, 3 o 4' }, 400)
  await fijarCurso(c.env, n)
  return c.json({ ok: true, curso: n })
})
