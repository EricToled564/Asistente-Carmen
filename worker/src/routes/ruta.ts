import { Hono } from 'hono'
import type { Env } from '../types.js'
import { paradasSeleccionables, PLANTAS } from '../data/edificioArquitectura.js'
import { calcularRuta, type PasoRuta } from '../lib/rutaInterior.js'

export const ruta = new Hono<{ Bindings: Env }>()

// GET /ruta/lugares — para poblar los selects "Estoy en" / "Quiero ir a" en la app, agrupados por
// planta en el mismo orden en que aparecen caminando por el pasillo (de oeste a este).
ruta.get('/ruta/lugares', (c) => {
  const seleccionables = new Set(paradasSeleccionables().map((p) => p.id))
  const plantas = ([-1, 0, 1] as const).map((planta) => ({
    planta,
    lugares: PLANTAS[planta].filter((p) => seleccionables.has(p.id)).map((p) => ({ id: p.id, nombre: p.nombre }))
  }))
  return c.json({ plantas })
})

interface EstadoRuta {
  pasos: PasoRuta[]
  indice: number
  origenNombre: string
  destinoNombre: string
  creadoEn: string
}

const TTL_RUTA_SEGUNDOS = 60 * 60 * 6 // una ruta activa no debería durar más de unas horas

// POST /ruta/iniciar {origenId, destinoId} — arma la ruta completa y devuelve el primer paso. La
// app abre a Maite con este primer paso como contexto; el resto se pide con /ruta/avanzar según
// Carmen le va confirmando en voz que llegó a cada punto.
ruta.post('/ruta/iniciar', async (c) => {
  const body = await c.req.json<{ origenId?: string; destinoId?: string }>()
  if (!body.origenId || !body.destinoId) {
    return c.json({ error: 'Faltan "origenId" y/o "destinoId"' }, 400)
  }

  const resultado = calcularRuta(body.origenId, body.destinoId)
  if (!resultado) {
    return c.json({ error: 'No reconozco ese origen o destino' }, 400)
  }

  const rutaId = crypto.randomUUID()
  const estado: EstadoRuta = {
    pasos: resultado.pasos,
    indice: 0,
    origenNombre: resultado.origenNombre,
    destinoNombre: resultado.destinoNombre,
    creadoEn: new Date().toISOString()
  }
  await c.env.KV.put(`ruta:${rutaId}`, JSON.stringify(estado), { expirationTtl: TTL_RUTA_SEGUNDOS })

  return c.json({
    rutaId,
    origenNombre: estado.origenNombre,
    destinoNombre: estado.destinoNombre,
    paso: estado.pasos[0],
    indice: 0,
    total: estado.pasos.length,
    terminado: estado.pasos.length <= 1
  })
})

// POST /ruta/avanzar {rutaId} — esta es la "server tool" que llama el agente Maite cuando Carmen
// le confirma por voz que llegó al checkpoint. Devuelve el siguiente paso, o el aviso de que ya
// llegó al destino final.
ruta.post('/ruta/avanzar', async (c) => {
  const body = await c.req.json<{ rutaId?: string }>()
  if (!body.rutaId) {
    return c.json({ error: 'Falta "rutaId"' }, 400)
  }

  const raw = await c.env.KV.get(`ruta:${body.rutaId}`)
  if (!raw) {
    return c.json({ error: 'Esa ruta ya no está activa (pudo haber expirado). Hay que iniciar una nueva.' }, 404)
  }

  const estado = JSON.parse(raw) as EstadoRuta
  const siguienteIndice = estado.indice + 1

  if (siguienteIndice >= estado.pasos.length) {
    await c.env.KV.delete(`ruta:${body.rutaId}`)
    return c.json({
      terminado: true,
      mensaje: `Listo, ya llegaste a ${estado.destinoNombre}.`,
      indice: estado.indice,
      total: estado.pasos.length
    })
  }

  estado.indice = siguienteIndice
  await c.env.KV.put(`ruta:${body.rutaId}`, JSON.stringify(estado), { expirationTtl: TTL_RUTA_SEGUNDOS })

  return c.json({
    terminado: false,
    paso: estado.pasos[siguienteIndice],
    indice: siguienteIndice,
    total: estado.pasos.length
  })
})
