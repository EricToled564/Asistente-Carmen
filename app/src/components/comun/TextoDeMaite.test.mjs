// Lo que Maite escribe, pintado como se debe leer.
//
// Correr con: node --test src/components/comun/TextoDeMaite.test.mjs
//
// El texto de prueba NO está inventado: es la respuesta literal que devolvió el servidor para una
// foto real de un aviso de comunidad de vecinos. Escribir yo el markdown de ejemplo sería probar
// lo que imagino que manda el modelo, y ese error —dar por buenos datos que yo mismo escribo— ya
// dejó dos falsos rojos en el diagnóstico.
//
// Se prueba la función de partir el texto, no el render de React: el objetivo es que no quede ni
// un asterisco a la vista y que no se pierda ni una línea de contenido.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
const REAL = JSON.parse(readFileSync(join(aqui, 'TextoDeMaite.fixture.json'), 'utf8')).texto

// Se replica aquí la clasificación de líneas del componente. Es la parte que decide, y es la que
// puede romperse; el JSX solo la pinta.
function clasificar(texto) {
  return String(texto)
    .split('\n')
    .map((cruda) => {
      const linea = cruda.trimEnd()
      if (!linea.trim()) return { tipo: 'vacia', contenido: '' }
      const vinieta = linea.match(/^\s*[-*•]\s+(.*)$/)
      if (vinieta) return { tipo: 'lista', contenido: vinieta[1] }
      const numerada = linea.match(/^\s*\d+[.)]\s+(.*)$/)
      if (numerada) return { tipo: 'lista', contenido: numerada[1] }
      const enc = linea.match(/^\s*#{1,6}\s+(.*)$/)
      if (enc) return { tipo: 'titulo', contenido: enc[1] }
      if (/^\*\*[^*]+\*\*:?$/.test(linea.trim())) return { tipo: 'titulo', contenido: linea.trim().replace(/\*\*/g, '') }
      return { tipo: 'parrafo', contenido: linea }
    })
}
const sinAsteriscos = (t) => t.replace(/\*\*([^*]+)\*\*/g, '$1')

test('la respuesta real no deja ni un asterisco a la vista', () => {
  const visible = clasificar(REAL)
    .filter((b) => b.tipo !== 'vacia')
    .map((b) => sinAsteriscos(b.contenido))
    .join('\n')
  assert.ok(!visible.includes('**'), `quedan asteriscos:\n${visible}`)
  assert.ok(!/^\s*[-*]\s/m.test(visible), 'quedan guiones de lista sin convertir')
})

test('no se pierde nada del contenido', () => {
  // Lo importante de la foto: fecha, horas, qué hacer y a quién llamar. Si el formateador se come
  // una línea, se pierde justo el dato por el que ella tomó la foto.
  const visible = clasificar(REAL).map((b) => sinAsteriscos(b.contenido)).join('\n')
  for (const dato of ['14 de septiembre', '9:00', '2:00', 'bajante general', '948 24 15 60', 'martes, jueves']) {
    assert.ok(visible.includes(dato), `se perdió "${dato}"`)
  }
})

test('las viñetas se reconocen como lista y los títulos como títulos', () => {
  const bloques = clasificar(REAL)
  assert.ok(bloques.filter((b) => b.tipo === 'lista').length >= 5, 'no detectó las viñetas')
  assert.ok(bloques.filter((b) => b.tipo === 'titulo').length >= 2, 'no detectó los títulos en negrita')
  // Y ninguna viñeta conserva su marca. Ojo con el patrón: `/^[-*]/` a secas daba falso positivo
  // con "**Cuándo:**" —el asterisco de una negrita— y marcaba como fallo un caso correcto. La
  // marca de lista es el símbolo SEGUIDO DE ESPACIO; eso es lo que hay que buscar.
  assert.ok(bloques.filter((b) => b.tipo === 'lista').every((b) => !/^\s*[-*•]\s/.test(b.contenido)))
})

test('un texto sin markdown se deja en paz', () => {
  const llano = 'Es un aviso de corte de agua.\nLlena botellas la noche anterior.'
  const bloques = clasificar(llano).filter((b) => b.tipo !== 'vacia')
  assert.equal(bloques.length, 2)
  assert.ok(bloques.every((b) => b.tipo === 'parrafo'))
  assert.equal(bloques.map((b) => b.contenido).join('\n'), llano)
})

test('sin texto no revienta', () => {
  assert.deepEqual(clasificar(''), [{ tipo: 'vacia', contenido: '' }])
})
