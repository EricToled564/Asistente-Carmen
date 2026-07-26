import { Hono } from 'hono'
import type { Env } from '../types.js'
import { paradasSeleccionables, PLANTAS, buscarParadasPorNombre, type Parada } from '../data/edificioArquitectura.js'
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

function etiqueta(p: Parada): string {
  return `${p.nombre} (Planta ${p.planta})`
}

// Resuelve lo que llega en el body a un id de parada. La app manda `origenId`/`destinoId` (ids
// exactos, salidos de /ruta/lugares); Maite manda `origen`/`destino` en texto, tal cual lo dijo
// Carmen en voz. Si el texto es ambiguo devuelve las opciones en vez de adivinar: mandarla al
// piso equivocado por elegir la primera coincidencia es peor que preguntarle cuál era.
type Resuelto = { id: string } | { ambiguo: string[] } | { desconocido: true }

function resolverParada(id: string | undefined, texto: string | undefined): Resuelto | null {
  if (id) return { id }
  if (!texto?.trim()) return null
  const encontradas = buscarParadasPorNombre(texto)
  if (encontradas.length === 1) return { id: encontradas[0].id }
  if (encontradas.length > 1) return { ambiguo: encontradas.map(etiqueta) }
  return { desconocido: true }
}

// POST /ruta/iniciar — arma la ruta completa y devuelve el primer paso.
//
// Dos formas de llamarlo:
//   {origenId, destinoId}  — desde la app, con los ids de /ruta/lugares
//   {origen, destino}      — desde Maite (server tool iniciar_ruta), con lo que Carmen dijo
//
// La app muestra todos los pasos escritos en pantalla; en conversación Maite da uno a la vez y
// pide el siguiente con /ruta/avanzar cuando Carmen le confirma que llegó al checkpoint.
ruta.post('/ruta/iniciar', async (c) => {
  const body = await c.req.json<{ origenId?: string; destinoId?: string; origen?: string; destino?: string }>()

  const origen = resolverParada(body.origenId, body.origen)
  const destino = resolverParada(body.destinoId, body.destino)
  if (!origen || !destino) {
    return c.json({ error: 'Falta el origen y/o el destino (usa origenId/destinoId, o bien origen/destino por nombre)' }, 400)
  }

  // Los casos que necesitan repregunta se devuelven con 200 y un mensaje redactado: son parte
  // normal de la conversación, no un fallo de la tool, y el agente los lee tal cual.
  for (const [quien, r] of [['origen', origen], ['destino', destino]] as const) {
    if ('ambiguo' in r) {
      return c.json({
        necesitaAclaracion: true,
        campo: quien,
        opciones: r.ambiguo,
        mensaje: `Hay varios sitios que se llaman así. ¿Cuál es el ${quien}: ${r.ambiguo.join(', ')}?`
      })
    }
    if ('desconocido' in r) {
      return c.json({
        necesitaAclaracion: true,
        campo: quien,
        mensaje: `No tengo ese sitio en el plano del edificio como ${quien}. Pregúntale a Carmen el nombre del aula, seminario o taller, o el número de sala.`
      })
    }
  }

  const resultado = calcularRuta((origen as { id: string }).id, (destino as { id: string }).id)
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
    // Todos los pasos, no solo el primero: la app los muestra escritos en pantalla para que
    // Carmen pueda seguirlos aunque adentro del edificio no haya señal de datos (hablar con
    // Maite sí requiere conexión; leer la ruta ya cargada, no).
    pasos: estado.pasos,
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
