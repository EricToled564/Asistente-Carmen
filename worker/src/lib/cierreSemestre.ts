import type { Env } from '../types.js'
import { PLAN_ESTUDIOS } from '../data/planEstudios.js'
import { leer, calcular, type CalculoMateria } from './calificacionesStore.js'

// El cierre de un semestre: la foto final de cómo quedó cada asignatura, guardada aparte.
//
// Por qué una foto y no solo "dejar las notas ahí": las notas parciales viven en un único almacén
// por kbCode y no se borran al cambiar de semestre, así que técnicamente nada se pierde — pero
// tampoco queda constancia de QUÉ significaban cuando el semestre acabó. La estructura de
// evaluación puede cambiar el año siguiente (si repite una asignatura, si la guía cambia), y
// entonces las mismas notas calcularían un resultado distinto del que fue verdad. La foto congela
// el cálculo completo —componentes, pesos, proyección, si aprobó— tal como era el día del cierre.
//
// El cierre NO borra nada: las notas parciales siguen donde estaban. Solo añade.

const KEY = 'calificaciones:cerrados'

export interface SemestreCerrado {
  curso: number
  semestre: number
  cerradoEn: string
  materias: CalculoMateria[]
}

export async function listarCerrados(env: Env): Promise<SemestreCerrado[]> {
  const raw = await env.KV.get(KEY)
  return raw ? (JSON.parse(raw) as SemestreCerrado[]) : []
}

export async function cerrarSemestre(
  env: Env,
  curso: number,
  semestre: number
): Promise<{ cerrado: SemestreCerrado; reemplazo: boolean }> {
  const bloque = PLAN_ESTUDIOS.find((b) => b.curso === curso && b.semestre === semestre)
  if (!bloque) throw new Error(`No existe el bloque ${curso}º/${semestre}`)

  const almacen = await leer(env)
  const materias = bloque.materias.map((m) =>
    calcular(m.kbCode, m.titulo, almacen.notas[m.kbCode] || {}, almacen.personalizados, almacen.derivados)
  )

  const cerrado: SemestreCerrado = {
    curso,
    semestre,
    cerradoEn: new Date().toISOString(),
    materias
  }

  // Cerrar dos veces el mismo semestre reemplaza la foto anterior (la nueva es más completa o más
  // correcta — si no, no lo estaría volviendo a cerrar). Nunca hay dos fotos del mismo bloque.
  const lista = await listarCerrados(env)
  const reemplazo = lista.some((s) => s.curso === curso && s.semestre === semestre)
  const sinEse = lista.filter((s) => !(s.curso === curso && s.semestre === semestre))
  await env.KV.put(KEY, JSON.stringify([...sinEse, cerrado]))

  return { cerrado, reemplazo }
}
