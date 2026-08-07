// Verifica el motor de cálculo recursivo: que el caso plano de siempre no cambie ni un decimal, y
// que el caso nuevo (mínimos sobre un grupo, no solo sobre un apartado suelto) dé los números que
// de verdad exige Design Studio IV — comprobado a mano antes de escribir el assert, no al revés.
//
// Correr con: npm test (ver package.json — bundlea calificacionesStore.ts con esbuild primero)

import { test } from 'node:test'
import assert from 'node:assert/strict'

const { calcular, necesarioParaObjetivo } = await import('../../.test-build/lib/calificacionesStore.mjs')

test('caso plano (sin subcomponentes): idéntico al cálculo de siempre', () => {
  const personalizados = {
    PRUEBA_PLANA: [
      { id: 'a', nombre: 'A', peso: 40 },
      { id: 'b', nombre: 'B', peso: 60 }
    ]
  }
  const r = calcular('PRUEBA_PLANA', 'Prueba plana', { a: 8, b: 6 }, personalizados)
  assert.equal(r.pesoEvaluado, 100)
  assert.equal(r.puntosGanados, 8 * 0.4 + 6 * 0.6) // 3.2 + 3.6 = 6.8
  assert.equal(r.notaHastaAhora, 6.8)
  assert.equal(r.aprobadaYa, true) // 6.8 >= 5
  assert.equal(r.minimosEnRiesgo.length, 0)
})

test('caso plano con mínimo por apartado, en riesgo', () => {
  const personalizados = {
    PRUEBA_MIN: [
      { id: 'examen', nombre: 'Examen', peso: 100, minimo: 5 }
    ]
  }
  const r = calcular('PRUEBA_MIN', 'Prueba mínimo', { examen: 4 }, personalizados)
  assert.equal(r.minimosEnRiesgo.length, 1)
  assert.match(r.minimosEnRiesgo[0], /Examen/)
})

// Design Studio IV real: Proyectos 80% (min 4) = P1 30% + P2 50% (min 5) + PE 20%; cada uno
// análisis 20/desarrollo 30/resultado 40/exposición 10 — Revisión final 20%.
function estructuraDesignStudioIV() {
  const proyecto = (id, peso, minimo) => ({
    id,
    nombre: id,
    peso,
    ...(minimo ? { minimo } : {}),
    subcomponentes: [
      { id: `${id}_analisis`, nombre: 'Análisis', peso: 20 },
      { id: `${id}_desarrollo`, nombre: 'Desarrollo', peso: 30 },
      { id: `${id}_resultado`, nombre: 'Resultado', peso: 40 },
      { id: `${id}_exposicion`, nombre: 'Exposición', peso: 10 }
    ]
  })
  return {
    DS4: [
      {
        id: 'proyectos',
        nombre: 'Proyectos',
        peso: 80,
        minimo: 4,
        subcomponentes: [proyecto('p1', 30), proyecto('p2', 50, 5), proyecto('pe', 20)]
      },
      { id: 'revision', nombre: 'Revisión final', peso: 20 }
    ]
  }
}

test('Design Studio IV: solo P2 evaluado (6,6,4,6) — promedio 5.2, nadie en riesgo', () => {
  const notas = { p2_analisis: 6, p2_desarrollo: 6, p2_resultado: 4, p2_exposicion: 6 }
  const r = calcular('DS4', 'Design Studio IV', notas, estructuraDesignStudioIV())

  // P2 a mano: 6*.2 + 6*.3 + 4*.4 + 6*.1 = 1.2+1.8+1.6+0.6 = 5.2
  // Proyectos: solo P2 evaluado -> su propio promedio ES 5.2 (es el único dato que hay)
  // Raíz: pesoEvaluado = 80%(peso Proyectos) * 50%(peso P2 dentro de Proyectos) = 40
  //       puntosGanados = 5.2 * 40/100 = 2.08
  assert.equal(r.pesoEvaluado, 40)
  assert.equal(r.puntosGanados, 2.08)
  assert.equal(r.notaHastaAhora, 5.2)
  assert.equal(r.minimosEnRiesgo.length, 0, 'P2 en 5.2 (>=5) y Proyectos en 5.2 (>=4): ninguno en riesgo')

  // Necesario para aprobar (mínimo 5, quedan 60 puntos): (5 - 2.08) / 60 * 100
  const necesario = Math.round((((5 - 2.08) / 60) * 100) * 100) / 100
  assert.equal(r.necesarioParaAprobar, necesario)
})

test('Design Studio IV: P2 baja de 5 (en riesgo) pero el bloque Proyectos sigue por encima de 4', () => {
  const notas = { p2_analisis: 6, p2_desarrollo: 6, p2_resultado: 2, p2_exposicion: 6 }
  const r = calcular('DS4', 'Design Studio IV', notas, estructuraDesignStudioIV())

  // P2 a mano: 6*.2 + 6*.3 + 2*.4 + 6*.1 = 1.2+1.8+0.8+0.6 = 4.4 -> por debajo del mínimo de P2 (5)
  // pero por encima del mínimo del bloque Proyectos (4) -> Proyectos NO debe salir en la lista.
  assert.equal(r.notaHastaAhora, 4.4)
  assert.equal(r.minimosEnRiesgo.length, 1, 'debe avisar de P2 pero no del bloque Proyectos completo')
  assert.match(r.minimosEnRiesgo[0], /p2/i)
})

test('Design Studio IV: los tres proyectos completos y aprobados no quedan en riesgo', () => {
  const notas = {}
  for (const p of ['p1', 'p2', 'pe']) {
    notas[`${p}_analisis`] = 7
    notas[`${p}_desarrollo`] = 7
    notas[`${p}_resultado`] = 7
    notas[`${p}_exposicion`] = 7
  }
  const r = calcular('DS4', 'Design Studio IV', notas, estructuraDesignStudioIV())
  assert.equal(r.notaHastaAhora, 7) // los tres proyectos dan 7 exacto, ponderados o no siguen en 7
  assert.equal(r.pesoEvaluado, 80) // falta la revisión final (20)
  assert.equal(r.minimosEnRiesgo.length, 0)
})

test('necesarioParaObjetivo sigue funcionando igual sobre el resultado de una asignatura anidada', () => {
  const notas = { p2_analisis: 6, p2_desarrollo: 6, p2_resultado: 4, p2_exposicion: 6 }
  const r = calcular('DS4', 'Design Studio IV', notas, estructuraDesignStudioIV())
  // puntosGanados=2.08, pesoPendiente=60. Para un 9.5: (9.5-2.08)/60*100 = 12.37 -> por encima de
  // 10, ya no se puede sacar ni sacando dieces en todo lo que falta.
  const imposible = necesarioParaObjetivo(r, 9.5)
  assert.equal(imposible.imposible, true)
  // Para un 8: (8-2.08)/60*100 = 9.8666... -> alto pero sí alcanzable, sacando casi un 10 en todo.
  const alto = necesarioParaObjetivo(r, 8)
  assert.equal(alto.imposible, false)
  assert.equal(alto.necesario, Math.round((((8 - 2.08) / 60) * 100) * 100) / 100)
})
