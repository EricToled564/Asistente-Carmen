import { Hono } from 'hono'
import type { Env } from '../types.js'
import { listarNotas, guardarNota, borrarNota, calcularPromedio, type Nota } from '../lib/notasStore.js'
import { describeImage } from '../lib/claude.js'

export const notas = new Hono<{ Bindings: Env }>()

// Contexto honesto que acompaña SIEMPRE al promedio, tanto en la app como cuando Maite lo
// consulta. La mención de 4º se asigna por orden de expediente entre quienes la piden — no hay
// una nota mínima publicada, así que la app nunca muestra un objetivo numérico ni una cuenta
// regresiva a un número que no existe.
const CONTEXTO =
  'La mención se asigna por orden de expediente entre quienes la piden — no hay una nota fija que garantice un lugar, así que esto es tu progreso, no una cuenta regresiva a un número mágico.'

// GET /notas — lista + promedio ponderado. Lo usa la vista "Mi expediente" de Académico → Mis
// calificaciones, y también Maite vía consultar_promedio.
notas.get('/notas', async (c) => {
  const lista = await listarNotas(c.env)
  const resumen = calcularPromedio(lista)
  return c.json({
    notas: lista.sort((a, b) => a.registradaEn.localeCompare(b.registradaEn)),
    ...resumen,
    contexto: CONTEXTO
  })
})

// POST /notas — guarda una calificación ya revisada por Carmen en la vista previa.
notas.post('/notas', async (c) => {
  const body = await c.req.json<Partial<Nota>>()
  if (!body.kbCode || !body.materia || typeof body.nota !== 'number' || typeof body.ects !== 'number') {
    return c.json({ error: 'Faltan datos: kbCode, materia, nota y ects son obligatorios' }, 400)
  }
  if (body.nota < 0 || body.nota > 10) {
    return c.json({ error: 'La calificación debe estar entre 0 y 10' }, 400)
  }
  const guardada = await guardarNota(c.env, {
    kbCode: body.kbCode,
    materia: body.materia,
    nota: body.nota,
    ects: body.ects,
    curso: body.curso ?? 1
  })
  const lista = await listarNotas(c.env)
  return c.json({ ok: true, nota: guardada, ...calcularPromedio(lista) })
})

notas.delete('/notas/:id', async (c) => {
  await borrarNota(c.env, c.req.param('id'))
  const lista = await listarNotas(c.env)
  return c.json({ ok: true, ...calcularPromedio(lista) })
})

const PROMPT_NOTA = `Te mandan la foto de un boletín o acta de calificaciones. Extrae SOLO lo que \
de verdad se lea en la imagen, en JSON estricto sin texto extra:
{"materia": string, "nota": number}
"materia" es el nombre de la asignatura tal cual aparece; "nota" es la calificación numérica sobre 10. \
Si no logras leer con claridad la asignatura o la calificación, responde exactamente: {"noLegible": true}. \
Nunca inventes una calificación ni la deduzcas — es información sensible para ella.`

// POST /notas/extraer — foto → {materia, nota} para prellenar la vista previa. Ella corrige lo
// que haga falta antes de confirmar; esto solo ahorra teclear, nunca guarda nada por su cuenta.
notas.post('/notas/extraer', async (c) => {
  // Ver la nota en routes/vision.ts: sin este envoltorio, una petición sin formulario sale como
  // 500 (fallo del servidor) cuando en realidad es un 400 (petición mal formada).
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'La petición no trae un formulario válido (multipart/form-data)' }, 400)
  }
  // Ver nota en routes/vision.ts sobre el tipado incompleto de FormData.get() en workers-types.
  const imagen = formData.get('imagen') as unknown as File | null
  if (!(imagen instanceof File)) {
    return c.json({ error: 'Sube una imagen' }, 400)
  }

  const buffer = await imagen.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const respuesta = await describeImage(c.env.ANTHROPIC_API_KEY, base64, imagen.type || 'image/jpeg', PROMPT_NOTA)

  try {
    const datos = JSON.parse(respuesta.trim())
    if (datos.noLegible) {
      return c.json({ necesitaAclaracion: true, mensaje: 'No pude leer bien la calificación en la foto. Escríbela a mano.' })
    }
    return c.json({ materia: String(datos.materia || ''), nota: Number(datos.nota) })
  } catch {
    return c.json({ necesitaAclaracion: true, mensaje: 'No pude interpretar la foto. Escribe la nota a mano.' })
  }
})
