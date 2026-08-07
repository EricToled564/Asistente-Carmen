// Ancla los repartos de evaluación a las guías docentes REALES de la Universidad de Navarra.
//
// Por qué existe: estos porcentajes se transcribieron a mano, y una transcripción a mano no da
// error cuando se equivoca — da un promedio mal calculado que Carmen se cree todo el semestre.
// Al verificarlos uno por uno contra las guías (29-jul-2026) apareció que Antropología estaba
// completamente mal: figuraba 70 % exámenes y 30 % clase, con una nota que decía que la guía no
// publicaba porcentajes. La guía sí los publica, y son otros.
//
// Cada número de aquí sale del PDF de `asignatura.unav.edu`. Si alguien los cambia sin haber ido a
// la guía, esta prueba se cae — que es exactamente lo que tiene que pasar.
//
// Correr con: node --test src/data/evaluacion.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

const { EVALUACION } = await import('../../.test-build/data/evaluacion.mjs')

// Fuente: https://asignatura.unav.edu/<asignatura>, guía docente 2026-27, leída el 29-jul-2026.
const GUIAS = {
  'KB9-1': { url: 'art-culture-of-the-last-century', pesos: [20, 30, 25, 25] },
  'KB9-2': { url: 'form-and-image-geometries', pesos: [50, 10, 40] },
  'KB9-3': { url: 'comprehensive-lab-i-graphics-2d', pesos: [5, 10, 40, 25, 20] },
  'KB9-4': { url: 'design-studio-i-design-thinking', pesos: [60, 15, 20, 5] },
  'KB9-5': { url: 'antropologia--gr-diseno', pesos: [30, 40, 30] },
  'KB9-5B': { url: 'core-antropologia-ii-gr-diseno', pesos: [40, 20, 15, 25] },
  'KB9-6': { url: 'creative-traditions-in-history', pesos: [20, 35, 30, 15] },
  'KB9-7': { url: 'form-and-matter-properties', pesos: [10, 30, 20, 40] },
  'KB9-8': { url: 'comprehensive-lab-ii-materials-3d', pesos: [10, 10, 40, 40] },
  'KB9-9': { url: 'design-studio-ii', pesos: [27.5, 27.5, 30, 10, 5] }
}

for (const [kbCode, guia] of Object.entries(GUIAS)) {
  test(`${kbCode} coincide con su guía docente (${guia.url})`, () => {
    const e = EVALUACION.find((x) => x.kbCode === kbCode)
    assert.ok(e, `falta ${kbCode} en EVALUACION`)
    assert.deepEqual(
      e.componentes.map((c) => c.peso),
      guia.pesos,
      `los pesos de ${kbCode} no son los de la guía`
    )
  })
}

test('todas suman 100, y cada grupo (subcomponentes) suma 100 dentro de sí mismo', () => {
  function verificar(lista, etiqueta) {
    const suma = Math.round(lista.reduce((t, c) => t + c.peso, 0) * 100) / 100
    assert.equal(suma, 100, `${etiqueta} suma ${suma}`)
    for (const c of lista) {
      if (c.subcomponentes?.length) verificar(c.subcomponentes, `${etiqueta} > ${c.nombre}`)
    }
  }
  for (const e of EVALUACION) verificar(e.componentes, e.kbCode)
})

test('KB9-18 (Design Studio IV): dos mínimos de grupo a la vez, tal como la guía', () => {
  const e = EVALUACION.find((x) => x.kbCode === 'KB9-18')
  assert.ok(e, 'falta KB9-18 en EVALUACION')
  assert.deepEqual(e.componentes.map((c) => c.peso), [80, 20], 'Proyectos 80 / Revisión final 20')
  const proyectos = e.componentes.find((c) => c.nombre === 'Proyectos')
  assert.equal(proyectos.minimo, 4, 'mínimo 4/10 en el bloque Proyectos')
  assert.deepEqual(proyectos.subcomponentes.map((c) => c.peso), [30, 50, 20], 'P1 30 / P2 50 / PE 20')
  const p2 = proyectos.subcomponentes.find((c) => c.nombre.startsWith('P2'))
  assert.equal(p2.minimo, 5, 'P2 tiene que aprobar por su cuenta')
})

test('Antropología I y II son asignaturas distintas y no comparten reparto', () => {
  const uno = EVALUACION.find((x) => x.kbCode === 'KB9-5')
  const dos = EVALUACION.find((x) => x.kbCode === 'KB9-5B')
  assert.equal(uno.materia, 'Antropología I')
  assert.equal(dos.materia, 'Antropología II')
  assert.notDeepEqual(uno.componentes.map((c) => c.peso), dos.componentes.map((c) => c.peso))
})

test('los mínimos por apartado que exigen las guías están puestos', () => {
  const min = (kb, id) => EVALUACION.find((x) => x.kbCode === kb).componentes.find((c) => c.id === id)?.minimo
  assert.equal(min('KB9-2', 'tests'), 5) // 50/100 en la media de los tests
  assert.equal(min('KB9-2', 'final'), 5) // 50/100 en el examen final
  assert.equal(min('KB9-5B', 'final'), 5) // hay que aprobar el examen para hacer media
  assert.equal(min('KB9-8', 'pruebas'), 4.5) // 4,5/10 en cada test
})

test('ninguna se queda sin código ni con el código repetido', () => {
  const codigos = EVALUACION.map((e) => e.kbCode)
  assert.equal(new Set(codigos).size, codigos.length, 'hay códigos duplicados')
  assert.ok(codigos.every(Boolean))
})
