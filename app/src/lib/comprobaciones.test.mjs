// El diagnóstico, probado contra las respuestas REALES del servidor.
//
// Correr con: node --test src/lib/comprobaciones.test.mjs
//
// Este archivo existe por un fallo concreto y vergonzoso. La primera versión del diagnóstico leía
// `r.lugares` del endpoint de rutas, que devuelve `r.plantas`, y `contactoPrincipal` de los datos
// de emergencia, un campo que no existe en ninguna parte. Resultado: dos rojos permanentes en dos
// cosas que funcionaban. Eric lo vio en su teléfono, no yo.
//
// Y lo peor: la prueba con navegador que hice ANTES pasaba, porque los datos falsos que le di al
// navegador los escribí yo de memoria con la misma clave equivocada. La prueba confirmaba mi error
// en vez de encontrarlo.
//
// Por eso aquí no hay ni una respuesta inventada: `comprobaciones.fixture.json` son las respuestas
// literales que devolvió el Worker de producción, guardadas tal cual. Si mañana cambia la forma de
// una respuesta y el diagnóstico deja de entenderla, se vuelve a bajar el fixture y estos tests se
// ponen rojos — que es justo lo que no pasó la primera vez.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
const REAL = JSON.parse(readFileSync(join(aqui, 'comprobaciones.fixture.json'), 'utf8'))

// El módulo importa `api` (que hace fetch) y toca `navigator`, `window` y `Notification`. Se
// montan aquí unos mínimos para poder correrlo en node sin navegador.
// `navigator` en node moderno es de solo lectura: hay que redefinir la propiedad, no asignarla.
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { onLine: true, serviceWorker: undefined, permissions: undefined, mediaDevices: {}, userAgent: 'node' }
})
globalThis.window = { matchMedia: () => ({ matches: false }) }
globalThis.MediaRecorder = undefined
globalThis.customElements = { get: () => undefined }
globalThis.Notification = { permission: 'granted' }

// Se intercepta fetch y se contesta con el fixture, mirando la ruta pedida.
globalThis.fetch = async (url, opciones = {}) => {
  const u = String(url)
  const j = (x) => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } })
  if (u.includes('/horario/oficial')) return j(REAL.horarioOficial)
  if (u.includes('/calificaciones')) return j(REAL.calificacionesListar)
  if (u.includes('/fechas')) return j(REAL.fechasListar)
  if (u.includes('/apuntes')) return j(REAL.apuntesListar)
  if (u.includes('/ruta/lugares')) return j(REAL.rutaLugares)
  if (u.includes('/emergency-data')) return j(REAL.emergenciaObtener)
  if (u.includes('/memory/retrieve')) return j(REAL.memoriaRecuperar)
  return j(REAL.salud)
}

const { COMPROBACIONES, correrComprobaciones } = await import('./comprobaciones.js')
const buscar = (id) => COMPROBACIONES.find((c) => c.id === id)
const correr = (id) => buscar(id).correr()

test('con el servidor contestando de verdad, ningún SERVICIO sale en rojo', async () => {
  // Esta es LA prueba, la que faltaba. Las comprobaciones que hablan con el Worker tienen que
  // entender lo que el Worker manda de VERDAD. Un rojo aquí es un fallo del diagnóstico.
  //
  // `sos` va aparte a propósito: ese sí puede salir en rojo con el servidor perfecto, porque mira
  // si Carmen rellenó sus datos, no si el servicio responde. Son dos preguntas distintas y
  // mezclarlas escondería justo el fallo que este test busca.
  const servicios = ['servidor', 'horario', 'calificaciones', 'fechas', 'apuntes', 'ruta', 'memoria']
  const malos = []
  for (const id of servicios) {
    const r = await correr(id)
    if (r.estado === 'mal') malos.push(`${id}: ${r.detalle}`)
  }
  assert.deepEqual(malos, [], `estas comprobaciones no entienden la respuesta real:\n${malos.join('\n')}`)
})

test('las rutas del edificio se cuentan de la respuesta real (plantas, no lugares)', async () => {
  const r = await correr('ruta')
  assert.equal(r.estado, 'bien')
  // El número no se escribe a mano aquí: se calcula del fixture. Poner "24" de memoria —que fue
  // el primer intento— es el mismo error que este archivo existe para impedir. Son 38.
  const esperados = REAL.rutaLugares.plantas.reduce((t, p) => t + p.lugares.length, 0)
  assert.ok(esperados > 0)
  assert.match(r.detalle, new RegExp(`^${esperados} sitios en ${REAL.rutaLugares.plantas.length} plantas`))
})

test('emergencia solo mira los campos que el servidor guarda de verdad', async () => {
  // El Worker devuelve nombreLegal, tipoSangre y actualizadoEn. Nada más. Pedir un campo que no
  // existe deja un rojo que Carmen no puede quitar por mucho que rellene el formulario — que es
  // exactamente lo que pasaba con el inventado `contactoPrincipal`.
  assert.deepEqual(Object.keys(REAL.emergenciaObtener).sort(), ['actualizadoEn', 'nombreLegal', 'tipoSangre'])

  // Y con los datos reales de hoy sale en rojo, pero por algo cierto y accionable: su tipo de
  // sangre está guardado como "no proporcionado". Eso hay que rellenarlo de verdad.
  const r = await correr('sos')
  assert.equal(r.estado, 'mal')
  assert.match(r.detalle, /tipo de sangre/)
  assert.ok(!/contactoPrincipal/.test(r.detalle), 'no puede volver a pedir un campo que no existe')
})

test('emergencia detecta de verdad lo que falta', async () => {
  const original = globalThis.fetch
  const con = (datos) => {
    globalThis.fetch = async () => new Response(JSON.stringify(datos), { status: 200, headers: { 'content-type': 'application/json' } })
    return correr('sos')
  }
  assert.equal((await con({ nombreLegal: '', tipoSangre: '' })).estado, 'mal')
  assert.match((await con({ nombreLegal: 'Carmen X', tipoSangre: '' })).detalle, /tipo de sangre/)
  assert.match((await con({ nombreLegal: '', tipoSangre: 'O+' })).detalle, /nombre legal/)
  // "no proporcionado" es lo que guarda el Worker cuando ella deja el tipo de sangre en blanco:
  // cuenta como que falta, no como que está puesto.
  assert.equal((await con({ nombreLegal: 'Carmen X', tipoSangre: 'no proporcionado' })).estado, 'mal')
  globalThis.fetch = original
})

test('si el servidor se cae, todo lo que depende de él sale en rojo y con instrucción', async () => {
  // Se corre por `correrComprobaciones` y no llamando a cada `correr()` a pelo, porque el
  // try/catch que convierte una excepción en un rojo vive ahí. Probando la función suelta se
  // estaría probando otra cosa: la excepción escaparía y el test fallaría por el motivo
  // equivocado, dejando sin comprobar justo el camino que importa.
  const original = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('Failed to fetch')
  }
  const resultados = await correrComprobaciones()
  globalThis.fetch = original

  for (const id of ['servidor', 'horario', 'calificaciones', 'fechas', 'apuntes', 'ruta', 'memoria', 'sos']) {
    const r = resultados.find((x) => x.id === id)
    assert.equal(r.estado, 'mal', `${id} debería salir en rojo con el servidor caído`)
    assert.ok(r.arreglo, `${id} sale en rojo sin decir qué hacer`)
  }
  // Y ni una sola excepción se escapa: todas las 16 traen veredicto.
  assert.equal(resultados.length, COMPROBACIONES.length)
  assert.ok(resultados.every((r) => ['bien', 'mal', 'amano'].includes(r.estado)))
})

test('lo que no se puede comprobar NUNCA sale en verde', async () => {
  // Los Atajos de iOS y la entrega del correo del SOS no se pueden verificar desde el navegador.
  // Pintarlos de verde sería la única forma de que este diagnóstico hiciera daño en vez de ayudar.
  for (const id of ['atajos', 'sosCorreo']) {
    const r = await correr(id)
    assert.equal(r.estado, 'amano', `${id} no puede dar un veredicto: no hay forma de saberlo`)
    assert.ok(r.arreglo, `${id} tiene que decir cómo comprobarlo a mano`)
  }
})

test('cada comprobación se identifica y se agrupa, y ninguna se repite', () => {
  const ids = COMPROBACIONES.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos')
  assert.ok(COMPROBACIONES.every((c) => c.grupo && c.titulo && typeof c.correr === 'function'))
})
