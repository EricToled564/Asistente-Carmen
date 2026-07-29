// Pruebas de la caché del horario y del radar de fechas, con un KV de mentira.
//
// Lo que se comprueba aquí no es que los datos se lean bien —eso es portalHorarios.test.mjs— sino
// qué pasa cuando algo sale mal: el portal caído, el portal contestando vacío, ella ocultando una
// fecha oficial. Son los casos que en producción aparecen una vez y hacen daño.
//
// Correr con: node --test src/lib/horarioOficialStore.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
const EVENTOS = JSON.parse(readFileSync(join(aqui, 'portalHorarios.fixture.json'), 'utf8'))

const store = await import('../../.test-build/horarioOficialStore.mjs')
const fechasStore = await import('../../.test-build/fechasStore.mjs')

function kvFalso(inicial = {}) {
  const datos = { ...inicial }
  return {
    espia: datos,
    async get(k, tipo) {
      const v = datos[k]
      if (v === undefined) return null
      return tipo === 'json' ? JSON.parse(v) : v
    },
    async put(k, v) {
      datos[k] = v
    }
  }
}

// Simula el portal: 'ok' devuelve los eventos reales, 'caido' revienta, 'vacio' contesta sin nada.
function conPortal(modo) {
  globalThis.fetch = async (url) => {
    if (modo === 'caido') return new Response('boom', { status: 503 })
    const u = String(url)
    if (u.includes('app-settings')) {
      return new Response(
        JSON.stringify({ apiBaseUrl: 'https://a/api', authConfig: { issuer: 'https://b', clientId: 'c', clientSecret: 'd', scope: 'e' } }),
        { status: 200 }
      )
    }
    if (u.includes('/connect/token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 })
    return new Response(JSON.stringify({ data: { data: modo === 'vacio' ? [] : EVENTOS } }), { status: 200 })
  }
}

test('la primera vez va al portal y guarda la copia', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const h = await store.obtenerHorarioPortal(env)
  assert.ok(h.clases.length > 100)
  assert.equal(h.fallo, null)
  assert.ok(env.KV.espia['horario:portal'], 'tenía que quedar guardado en KV')
})

test('con una copia fresca no vuelve a molestar al portal', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  await store.obtenerHorarioPortal(env)
  let llamadas = 0
  const antes = globalThis.fetch
  globalThis.fetch = (...a) => {
    llamadas++
    return antes(...a)
  }
  await store.obtenerHorarioPortal(env)
  assert.equal(llamadas, 0)
  // Pero forzando sí va.
  await store.obtenerHorarioPortal(env, true)
  assert.ok(llamadas > 0)
})

test('si el portal se cae se sirve la última copia buena, diciéndolo', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  await store.obtenerHorarioPortal(env)

  conPortal('caido')
  const h = await store.obtenerHorarioPortal(env, true)
  assert.ok(h.clases.length > 100, 'la copia buena tiene que seguir ahí')
  assert.match(h.fallo, /503/)
})

test('un portal que contesta vacío NO borra la copia buena', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  await store.obtenerHorarioPortal(env)
  const guardadoAntes = env.KV.espia['horario:portal']

  conPortal('vacio')
  const h = await store.obtenerHorarioPortal(env, true)
  assert.ok(h.clases.length > 100)
  assert.match(h.fallo, /sin ninguna clase/)
  assert.equal(env.KV.espia['horario:portal'], guardadoAntes, 'no se puede sobreescribir con nada')
})

test('semestreVigente acierta dentro, entre y fuera de los semestres', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const h = await store.obtenerHorarioPortal(env)
  const clases = store.vistaDelCurso(h, 1).clases

  assert.equal(store.semestreVigente(clases, '2026-09-15'), 1) // en clase, primer semestre
  assert.equal(store.semestreVigente(clases, '2027-02-10'), 2) // en clase, segundo
  assert.equal(store.semestreVigente(clases, '2026-12-20'), 2) // Navidad: toca el que viene
})

test('porDias agrupa y ordena por hora', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const h = await store.obtenerHorarioPortal(env)
  const dias = store.porDias(store.vistaDelCurso(h, 1, 1).clases)
  const martes = dias.find((d) => d.diaNombre === 'Martes')
  assert.deepEqual(
    martes.clases.map((c) => c.inicio),
    ['09:00', '12:00', '15:30']
  )
  assert.equal(martes.clases[0].profesor, 'Javier Antón Sancho')
})

// --- El radar ---------------------------------------------------------------------------------

test('el radar arranca con las fechas oficiales sin que ella teclee nada', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const { fechas } = await fechasStore.listar(env, '2026-09-01')
  assert.ok(fechas.length >= 6)
  assert.ok(fechas.every((f) => f.origen === 'oficial'))
  const dic = fechas.find((f) => f.fecha === '2026-12-14')
  assert.match(dic.titulo, /Comprehensive Lab I/)
  assert.equal(dic.hora, '09:00–14:00')
  assert.equal(dic.aula, 'ARQ-P1-AULA3')
  // No se etiquetan como examen: el portal no lo dice.
  assert.equal(dic.tipo, 'oficial')
})

test('ocultar una oficial no la resucita en la siguiente sincronización', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const primera = (await fechasStore.listar(env, '2026-09-01')).fechas[0]

  const a = await fechasStore.leer(env)
  a.ocultas.push(primera.id)
  await fechasStore.escribir(env, a)

  const despues = (await fechasStore.listar(env, '2026-09-01')).fechas
  assert.ok(!despues.some((f) => f.id === primera.id))
})

test('el identificador de una oficial no cambia entre sincronizaciones', async () => {
  conPortal('ok')
  const env = { KV: kvFalso() }
  const a = (await fechasStore.listar(env, '2026-09-01')).fechas.map((f) => f.id)
  const b = (await fechasStore.listar(env, '2026-09-01')).fechas.map((f) => f.id)
  assert.deepEqual(a, b)
})

test('si el portal está caído el radar sigue enseñando lo suyo', async () => {
  conPortal('caido')
  const env = { KV: kvFalso() }
  await fechasStore.escribir(env, {
    propias: [{ id: 'propia:1', titulo: 'Entrega maqueta', fecha: '2026-10-02', tipo: 'entrega' }],
    ocultas: [],
    hechas: []
  })
  const { fechas, avisoPortal } = await fechasStore.listar(env, '2026-09-01')
  assert.equal(fechas.length, 1)
  assert.equal(fechas[0].titulo, 'Entrega maqueta')
  assert.ok(avisoPortal, 'tiene que decir que no pudo comprobar el horario oficial')
})

test('esFechaValida no traga basura', () => {
  assert.ok(fechasStore.esFechaValida('2026-12-01'))
  assert.ok(!fechasStore.esFechaValida('01/12/2026'))
  assert.ok(!fechasStore.esFechaValida('2026-13-45'))
  assert.ok(!fechasStore.esFechaValida(''))
  assert.ok(!fechasStore.esFechaValida(null))
})
