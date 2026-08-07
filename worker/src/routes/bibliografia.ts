import { Hono } from 'hono'
import type { Env } from '../types.js'
import { listar, obtener, guardar, borrar, buscarPorNombre } from '../lib/bibliografiaStore.js'

export const bibliografia = new Hono<{ Bindings: Env }>()

// GET /bibliografia — todo lo que Carmen tiene apuntado, para la pantalla de Modo estudio.
bibliografia.get('/bibliografia', async (c) => {
  return c.json({ bibliografia: await listar(c.env) })
})

// POST /bibliografia — {kbCode, materia, libro, autor}. Guarda o reemplaza la de esa materia.
bibliografia.post('/bibliografia', async (c) => {
  const b = await c.req.json<{ kbCode?: string; materia?: string; libro?: string; autor?: string }>()
  const kbCode = b.kbCode?.trim()
  const materia = b.materia?.trim()
  const libro = b.libro?.trim()
  if (!kbCode || !materia || !libro) {
    return c.json({ error: 'Faltan "kbCode", "materia" y/o "libro"' }, 400)
  }
  const entrada = await guardar(c.env, kbCode, materia, libro, b.autor)
  return c.json({ ok: true, entrada })
})

// GET /bibliografia/consulta?materia= — la tool `consultar_bibliografia` del agente.
//
// Va ANTES de /bibliografia/:kbCode a propósito: igual que en apuntes.ts, Hono resuelve por orden
// de registro, y si la ruta con parámetro fuera primero, "consulta" entraría como si fuera un
// kbCode.
bibliografia.get('/bibliografia/consulta', async (c) => {
  const materia = (c.req.query('materia') || '').trim()
  if (!materia) {
    return c.json({ error: 'Falta "materia": de qué asignatura quieres el libro.' }, 400)
  }

  const coincide = await buscarPorNombre(c.env, materia)
  if (!coincide.length) {
    return c.json({
      encontrada: false,
      mensaje: `Carmen no tiene ningún libro apuntado para "${c.req.query('materia')}". No le digas que no hay bibliografía para la materia — solo que ella no ha apuntado ninguna todavía; puede que el profesor no lo haya mencionado o que se le haya pasado anotarlo.`
    })
  }
  if (coincide.length > 1) {
    return c.json({
      encontrada: false,
      mensaje: `Hay varias materias que coinciden: ${coincide.map((e) => e.materia).join(', ')}. Pregúntale a Carmen a cuál se refiere.`
    })
  }

  const e = coincide[0]
  return c.json({
    encontrada: true,
    materia: e.materia,
    libro: e.libro,
    autor: e.autor || null,
    mensaje: `El libro de ${e.materia} es "${e.libro}"${e.autor ? `, de ${e.autor}` : ''}. Esto es lo único que Carmen apuntó — un título y un autor, no el texto del libro. Si de verdad reconoces esta obra por tu propio conocimiento, úsalo para explicar mejor el tema, situándolo en ese libro. Pero si no la reconoces, o no estás segura de un dato concreto (una cita exacta, un capítulo, una página), dilo así — no completes con algo que suena plausible pero no sabes si es cierto.`
  })
})

// GET /bibliografia/:kbCode — la de una materia concreta, para precargar el formulario al elegirla.
bibliografia.get('/bibliografia/:kbCode', async (c) => {
  const entrada = await obtener(c.env, c.req.param('kbCode'))
  return c.json({ entrada })
})

// DELETE /bibliografia/:kbCode — se equivocó, o el profesor cambió el libro y prefiere borrarlo.
bibliografia.delete('/bibliografia/:kbCode', async (c) => {
  await borrar(c.env, c.req.param('kbCode'))
  return c.json({ ok: true })
})
