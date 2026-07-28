import { Hono } from 'hono'
import type { Env } from '../types.js'
import { guardarApunte, listarApuntes, obtenerApunte, borrarApunte, buscarApuntes } from '../lib/apuntesStore.js'
import { agregarApunteAlKb } from '../lib/kbApuntes.js'

export const apuntes = new Hono<{ Bindings: Env }>()

// GET /apuntes?materia=KB9-2 — lista para la pantalla "Mis apuntes". Devuelve el índice (sin la
// transcripción cruda, que puede ser enorme); el detalle completo se pide por id.
apuntes.get('/apuntes', async (c) => {
  const materia = c.req.query('materia') || undefined
  const lista = await listarApuntes(c.env, materia)
  return c.json({ apuntes: lista })
})

// GET /apuntes/buscar?q=&materia= — esta es la server tool `consultar_apuntes` del agente.
//
// Va ANTES de /apuntes/:id en el archivo a propósito: Hono resuelve por orden de registro, y si
// la ruta con parámetro fuera primero, "buscar" entraría como si fuera un id.
apuntes.get('/apuntes/buscar', async (c) => {
  const q = c.req.query('q') || ''
  const materia = c.req.query('materia') || undefined
  // El parámetro se llama `materia` de cara al agente (es lo que entiende un modelo), pero lo que
  // lleva dentro es el código de la asignatura en el KB (`KB9-2`), que es como están etiquetados.
  const resultados = await buscarApuntes(c.env, q, { kbCode: materia, limite: 3 })

  if (resultados.length === 0) {
    return c.json({
      encontrados: 0,
      resultados: [],
      // Redactado para que el agente lo pueda decir tal cual: la diferencia entre "no grabó esa
      // clase" y "no existe esa materia" le importa a Carmen, y el agente no puede distinguirla
      // sin que se lo digan.
      mensaje:
        'Carmen no tiene apuntes grabados que coincidan con eso. Puede ser que no grabara esa clase. Dile que si graba la próxima con la Captura rápida, luego se la puedes repasar.'
    })
  }

  return c.json({ encontrados: resultados.length, resultados })
})

// GET /apuntes/:id — el apunte completo, incluida la transcripción cruda.
apuntes.get('/apuntes/:id', async (c) => {
  const apunte = await obtenerApunte(c.env, c.req.param('id'))
  if (!apunte) return c.json({ error: 'No existe ese apunte' }, 404)
  return c.json({ apunte })
})

// POST /apuntes — guarda lo que salió de la captura de audio, después de que Carmen lo revisó y
// eligió a qué materia pertenece. Nunca se guarda solo: el texto viene de una transcripción
// automática y ella tiene que poder corregirlo (o descartarlo) antes.
apuntes.post('/apuntes', async (c) => {
  const body = await c.req.json<{ kbCode?: string; materia?: string; apuntes?: string; transcripcion?: string }>()
  if (!body.materia?.trim() || !body.apuntes?.trim()) {
    return c.json({ error: 'Faltan "materia" y/o "apuntes"' }, 400)
  }
  const apunte = await guardarApunte(c.env, {
    kbCode: body.kbCode,
    materia: body.materia,
    apuntes: body.apuntes,
    transcripcion: body.transcripcion
  })

  // Además de KV, el resumen va al documento de esa materia en el Knowledge Base, para que Maite
  // sepa de qué fue la clase sin tener que llamar a `consultar_apuntes` (ver lib/kbApuntes.ts).
  //
  // Va DESPUÉS de guardar y no bloquea el resultado: el apunte de Carmen ya está a salvo en KV en
  // este punto. Si ElevenLabs está caído o la clave falla, lo peor que pasa es que Maite se entere
  // de esa clase cuando use la tool, no que se pierda la grabación que acaba de hacer.
  let kb: { ok: boolean; motivo?: string } = { ok: false, motivo: 'no intentado' }
  try {
    kb = await agregarApunteAlKb(c.env, apunte)
  } catch (err) {
    console.error('[apuntes] no se pudo llevar el resumen al KB', err)
    kb = { ok: false, motivo: 'No se pudo actualizar la base de conocimiento de Maite.' }
  }

  return c.json({ ok: true, apunte, kb })
})

apuntes.delete('/apuntes/:id', async (c) => {
  await borrarApunte(c.env, c.req.param('id'))
  return c.json({ ok: true })
})
