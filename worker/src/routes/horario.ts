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

// --- Consulta por voz (server tool `consultar_horario`) ----------------------
//
// Este endpoint NO duplica el horario. El horario vigente vive en KB8, que Maite ya tiene en su
// base de conocimiento; copiarlo también aquí sería una tercera copia que se desincroniza sola.
//
// Lo que resuelve es la única pregunta que la KB no puede contestar: **¿hay algo más nuevo que
// KB8?** Cuando Carmen sube un horario por "Actualizar mi info" (cambio de semestre, aula que
// cambió), ese horario queda en KV y la KB se vuelve vieja hasta que se resuba el documento. Sin
// esta tool, Maite seguiría cantando con toda seguridad el aula equivocada.
//
// Por eso las dos respuestas posibles son explícitas: o "esto es más nuevo, úsalo", o "no hay
// nada más nuevo, usa KB8".

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function normalizarDia(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// GET /horario/consulta?dia=martes
horario.get('/horario/consulta', async (c) => {
  const datos = await obtenerHorarioEstructurado(c.env)

  if (!datos) {
    return c.json({
      hayHorarioSubido: false,
      mensaje:
        'Carmen no ha subido ningún horario más reciente. El vigente es el del documento KB8 de tu base de conocimiento — contesta con ese.'
    })
  }

  const diaPedido = c.req.query('dia')
  let clases = datos.clases

  if (diaPedido?.trim()) {
    const buscado = normalizarDia(diaPedido)
    if (!DIAS.includes(buscado)) {
      return c.json({
        hayHorarioSubido: true,
        mensaje: `No entendí "${diaPedido}" como día de la semana. Pregúntale a Carmen qué día quiere.`
      })
    }
    clases = datos.clases.filter((cl) => normalizarDia(cl.dia) === buscado)
    if (clases.length === 0) {
      return c.json({
        hayHorarioSubido: true,
        dia: buscado,
        clases: [],
        mensaje: `El ${buscado} no tiene clases en el horario.`,
        actualizadoEn: datos.actualizadoEn
      })
    }
  }

  return c.json({
    hayHorarioSubido: true,
    ...(diaPedido?.trim() ? { dia: normalizarDia(diaPedido) } : {}),
    grupo: datos.grupo,
    cursoAcademico: datos.cursoAcademico,
    actualizadoEn: datos.actualizadoEn,
    clases,
    // Las notas del horario traen las advertencias reales (materias partidas en teoría y taller,
    // la Antropología duplicada del lunes). Sin ellas Maite leería la tabla como si no tuviera
    // ambigüedades y le daría a Carmen una certeza que el horario no tiene.
    notas: datos.notas
  })
})
