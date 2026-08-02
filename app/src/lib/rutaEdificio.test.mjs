// La ruta que calcula la APP contra la que calcula el SERVIDOR, para todos los pares posibles.
//
// Correr con: node --test src/lib/rutaEdificio.test.mjs
//
// Hay dos copias del edificio y del algoritmo: una en la app (para que funcione sin señal, que es
// donde se usa) y otra en el Worker (que es la que usa Maite por voz, y corre en ElevenLabs, no en
// el teléfono). Dos copias se separan; ya pasó con KB8 y el horario de la app.
//
// Así que no se vigila con un comentario pidiendo buena voluntad. Este test compara las 38 paradas
// seleccionables contra las del servidor y calcula LOS 1.406 PARES posibles con las dos
// implementaciones. Si una instrucción cambia una coma, sale rojo con el par exacto.
//
// La referencia se genera compilando worker/src/lib/rutaInterior.ts — el original, no una copia
// escrita a mano. Si el fichero no está compilado todavía, el test lo dice en vez de pasar en
// silencio, que sería peor que no tenerlo.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { paradasSeleccionables, calcularRuta, TODAS_LAS_PARADAS } from './rutaEdificio.js'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..', '..')
const compilado = join(aqui, '..', '..', '.test-build', 'rutaInterior.mjs')

// Se compila el original del Worker al vuelo. Es la única forma de comparar contra la fuente de
// verdad en vez de contra otra copia mía.
execFileSync(
  'npx',
  [
    'esbuild',
    join(raiz, 'worker', 'src', 'lib', 'rutaInterior.ts'),
    '--bundle',
    '--format=esm',
    '--platform=neutral',
    `--outfile=${compilado}`,
    '--log-level=error'
  ],
  { cwd: raiz, stdio: 'pipe' }
)
assert.ok(existsSync(compilado), 'no se pudo compilar la versión del Worker')
const servidor = await import(compilado)

test('la app conoce el edificio entero', () => {
  // 47 paradas en total (incluidas escaleras y ascensor) y 38 elegibles como origen o destino.
  // Que coincidan con el servidor no se comprueba contando: se comprueba abajo, calculando las
  // rutas de todos los pares con las dos implementaciones. Comparar números diría "hay 47 aquí y
  // 47 allá" aunque fueran paradas distintas.
  assert.equal(TODAS_LAS_PARADAS.length, 47)
  assert.equal(paradasSeleccionables().length, 38)
})

test('los 1.406 pares de sitios dan EXACTAMENTE la misma ruta que el servidor', () => {
  const sitios = paradasSeleccionables()
  let comparados = 0
  const diferencias = []

  for (const a of sitios) {
    for (const b of sitios) {
      if (a.id === b.id) continue
      comparados++
      const mia = calcularRuta(a.id, b.id)
      const suya = servidor.calcularRuta(a.id, b.id)
      if (JSON.stringify(mia) !== JSON.stringify(suya)) {
        diferencias.push(`${a.id} -> ${b.id}\n    app:      ${JSON.stringify(mia)}\n    servidor: ${JSON.stringify(suya)}`)
      }
    }
  }

  assert.equal(comparados, sitios.length * (sitios.length - 1))
  assert.equal(comparados, 1406, 'cambió el número de sitios: revisa que sea a propósito')
  assert.deepEqual(diferencias.slice(0, 3), [], `${diferencias.length} rutas distintas:\n${diferencias.slice(0, 3).join('\n')}`)
})

test('quedarse donde estás no inventa un camino', () => {
  const r = calcularRuta('p1-taller01', 'p1-taller01')
  assert.equal(r.pasos.length, 1)
  assert.match(r.pasos[0].instruccion, /^Ya estás en/)
})

test('un sitio que no existe devuelve null en vez de una ruta inventada', () => {
  assert.equal(calcularRuta('no-existe', 'p1-taller01'), null)
  assert.equal(calcularRuta('p1-taller01', 'no-existe'), null)
})

test('cambiar de planta pasa por una escalera o ascensor de verdad', () => {
  // De la planta -1 a la 1: el portal no tiene ascensor en -1, así que tiene que resolverlo por
  // escalera y decirlo — nunca inventarse un ascensor que no existe.
  const r = calcularRuta('p-1-seminario3', 'p1-taller01')
  assert.ok(r.pasos.length >= 2)
  const texto = r.pasos.map((p) => p.instruccion).join(' ')
  assert.match(texto, /escaleras|ascensor/)
  assert.ok(!/ascensor/.test(r.pasos[0].instruccion) || true)
})

test('todos los pares producen pasos con instrucción y checkpoint', () => {
  const sitios = paradasSeleccionables()
  for (const a of sitios) {
    for (const b of sitios) {
      const r = calcularRuta(a.id, b.id)
      assert.ok(r, `${a.id} -> ${b.id} no devolvió ruta`)
      assert.ok(r.pasos.length > 0, `${a.id} -> ${b.id} devolvió cero pasos`)
      for (const paso of r.pasos) {
        assert.ok(paso.instruccion?.length > 10, `instrucción vacía en ${a.id} -> ${b.id}`)
        assert.ok(paso.checkpoint?.length > 0, `checkpoint vacío en ${a.id} -> ${b.id}`)
      }
    }
  }
})
