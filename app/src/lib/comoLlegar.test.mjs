// Pruebas de la lógica de "cómo llego" (fuera del edificio).
//
// Correr con: node --test src/lib/comoLlegar.test.mjs
//
// El archivo probado es JS plano a propósito —sin JSX, sin import.meta.env, sin navegador— para
// que node lo pueda importar tal cual. Lo que NO se prueba aquí es abrir la URL: eso depende del
// teléfono y se prueba en el teléfono.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buscarLugar, resolverDestino, urlComoLlegar, normalizar } from './comoLlegar.js'

// Un recorte del mapa real de la app, con los casos que de verdad se confunden entre sí.
const LUGARES = [
  { id: 'residencia', nombre: 'CampusHome (mi residencia)', lat: 42.8062, lng: -1.6428 },
  { id: 'escuela-arquitectura', nombre: 'Escuela Técnica Superior de Arquitectura', lat: 42.8087, lng: -1.6122 },
  { id: 'biblioteca', nombre: 'Biblioteca de Humanidades', lat: 42.8091, lng: -1.6114 },
  { id: 'catedral', nombre: 'Catedral y "la calle más bonita"', lat: 42.8194, lng: -1.641 },
  { id: 'estacion-renfe', nombre: 'Estación de tren (Renfe)', lat: 42.8228, lng: -1.6469 },
  { id: 'aeropuerto', nombre: 'Aeropuerto de Pamplona (Noáin)', lat: 42.77, lng: -1.6461 },
  { id: 'ciudadela', nombre: 'La Ciudadela', lat: 42.8137, lng: -1.6512 }
]

test('reconoce los sitios como los diría ella, no como están escritos en el mapa', () => {
  const id = (frase) => buscarLugar(frase, LUGARES)?.id
  assert.equal(id('la biblioteca'), 'biblioteca')
  assert.equal(id('llévame a la biblio'), 'biblioteca')
  assert.equal(id('cómo llego a arquitectura'), 'escuela-arquitectura')
  assert.equal(id('quiero ir a la catedral'), 'catedral')
  assert.equal(id('la estación de tren'), 'estacion-renfe')
  assert.equal(id('el aeropuerto'), 'aeropuerto')
  assert.equal(id('CampusHome'), 'residencia')
  assert.equal(id('a mi residencia'), 'residencia')
})

test('los acentos y las mayúsculas no cuentan (ella habla, no escribe)', () => {
  assert.equal(normalizar('Estación de Tren (Renfe)'), 'estacion de tren renfe')
  assert.equal(buscarLugar('la estacion', LUGARES)?.id, 'estacion-renfe')
  assert.equal(buscarLugar('LA CIUDADELA', LUGARES)?.id, 'ciudadela')
})

test('ante la duda no adivina: prefiere no encontrarlo a mandarla al sitio equivocado', () => {
  // Nada de esto está en el mapa. Devolver el pin "menos malo" la mandaría a la otra punta de
  // Pamplona con total seguridad, que es la forma más dañina de fallar.
  assert.equal(buscarLugar('la farmacia de guardia', LUGARES), null)
  assert.equal(buscarLugar('el cine', LUGARES), null)
  assert.equal(buscarLugar('casa de Lucía', LUGARES), null)
  assert.equal(buscarLugar('', LUGARES), null)
  // "Estación" sí existe; "estadio" no, y se parece lo justo para ser peligroso.
  assert.equal(buscarLugar('el estadio', LUGARES), null)
})

test('lo que no está en el mapa se le pasa a Google como texto, con la ciudad puesta', () => {
  const d = resolverDestino('una farmacia', { lugares: LUGARES })
  assert.equal(d.tipo, 'busqueda')
  assert.equal(d.consulta, 'una farmacia, Pamplona, España')
})

test('en modo viaje la ciudad que se añade es donde está, no Pamplona', () => {
  // Este es el fallo que el parámetro existe para evitar: si Carmen está en Barcelona y pide "la
  // catedral", pegarle "Pamplona" la manda a 500 km.
  const d = resolverDestino('la catedral', { lugares: [], ciudad: 'Barcelona, España' })
  assert.equal(d.consulta, 'la catedral, Barcelona, España')
})

test('no repite la ciudad si ella ya la dijo', () => {
  const d = resolverDestino('el ayuntamiento de Pamplona', { lugares: [] })
  assert.equal(d.consulta, 'el ayuntamiento de Pamplona')
})

test('la URL lleva origen, destino y transporte público', () => {
  const url = urlComoLlegar({
    origen: { lat: 42.8062, lng: -1.6428 },
    destino: { lat: 42.8194, lng: -1.641 }
  })
  assert.equal(
    url,
    'https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=42.8062,-1.6428&destination=42.8194%2C-1.641'
  )
})

test('sin GPS se abre igual, solo que sin punto de partida', () => {
  // Peor experiencia, pero la alternativa sería inventarle un origen —"salimos de tu residencia"—
  // cuando puede estar en cualquier sitio.
  const url = urlComoLlegar({ origen: null, destino: { consulta: 'farmacia, Pamplona, España' } })
  assert.ok(!url.includes('origin='))
  assert.ok(url.includes('destination=farmacia%2C%20Pamplona%2C%20Espa%C3%B1a'))
  assert.ok(url.includes('travelmode=transit'))
})

test('sin destino no hay URL (mejor nada que abrir un mapa vacío)', () => {
  assert.equal(urlComoLlegar({ origen: null, destino: { consulta: '  ' } }), null)
  assert.equal(urlComoLlegar({ origen: null, destino: null }), null)
  assert.equal(resolverDestino('', { lugares: LUGARES }), null)
})

test('un destino conocido sale con sus coordenadas, no con su nombre', () => {
  // Con coordenadas Google abre exactamente el punto del mapa de la app. Con el nombre podría
  // resolverlo a otro sitio con nombre parecido.
  const d = resolverDestino('la biblioteca', { lugares: LUGARES })
  assert.deepEqual(d, {
    tipo: 'conocido',
    nombre: 'Biblioteca de Humanidades',
    lat: 42.8091,
    lng: -1.6114
  })
})
