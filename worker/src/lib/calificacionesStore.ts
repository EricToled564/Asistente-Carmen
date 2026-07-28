import type { Env } from '../types.js'
import { evaluacionDe, type ComponenteEvaluacion, type EvaluacionMateria } from '../data/evaluacion.js'

// Calificaciones parciales: las notas que va sacando durante el semestre, por componente.
//
// El tracker que ya había (lib/notasStore.ts) guarda UNA nota final por asignatura y calcula el
// promedio del expediente ponderado por ECTS. Eso responde "¿cómo llevo la carrera?". Lo de aquí
// responde otra pregunta distinta, que es la que se hace de verdad en mitad de un semestre: "con
// lo que llevo, ¿cómo voy en esta asignatura?" y "¿cuánto necesito sacar en el examen final?".
//
// Los dos niveles se enganchan: cuando una asignatura llega al 100% evaluado, su nota calculada se
// puede pasar al expediente. No se hace solo, se le pregunta — una nota de expediente es
// definitiva y no conviene escribirla por deducción de la app.

const KEY = 'calificaciones:parciales'

// { 'KB9-2': { ejercicios: 8.5, tests: 7 } }
export type NotasPorMateria = Record<string, Record<string, number>>

// Componentes que ella se inventa para una materia sin desglose oficial (2º a 4º curso, ver
// data/evaluacion.ts). Se guardan aparte de las notas para que borrar una nota no se lleve por
// delante la estructura.
export type ComponentesPersonalizados = Record<string, ComponenteEvaluacion[]>

interface Almacen {
  notas: NotasPorMateria
  personalizados: ComponentesPersonalizados
}

export async function leer(env: Env): Promise<Almacen> {
  const raw = await env.KV.get(KEY)
  if (!raw) return { notas: {}, personalizados: {} }
  const d = JSON.parse(raw) as Partial<Almacen>
  return { notas: d.notas || {}, personalizados: d.personalizados || {} }
}

export async function escribir(env: Env, almacen: Almacen): Promise<void> {
  await env.KV.put(KEY, JSON.stringify(almacen))
}

export function estructuraDe(
  kbCode: string,
  personalizados: ComponentesPersonalizados
): { componentes: ComponenteEvaluacion[]; oficial: boolean; meta?: EvaluacionMateria } {
  const oficial = evaluacionDe(kbCode)
  if (oficial) return { componentes: oficial.componentes, oficial: true, meta: oficial }
  return { componentes: personalizados[kbCode] || [], oficial: false }
}

export interface CalculoMateria {
  kbCode: string
  materia: string
  oficial: boolean
  componentes: Array<ComponenteEvaluacion & { nota: number | null }>
  pesoEvaluado: number // cuánto porcentaje de la asignatura ya tiene nota
  notaHastaAhora: number | null // media de lo evaluado, sobre 10 — NO la nota final
  proyeccionSiMantiene: number | null // la final si sacara lo mismo en lo que falta
  necesarioParaAprobar: number | null // qué media hace falta en lo que queda
  aprobadaYa: boolean // ya no puede suspender aunque saque 0 en lo que falta
  imposibleAprobar: boolean // ya no puede aprobar aunque saque 10 en todo lo que falta
  minimosEnRiesgo: string[]
  notaMinima: number
  asistenciaMinima?: number
  aviso?: string
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

// El cálculo entero. Se hace en el servidor y no en la app a propósito: exactamente el mismo
// número lo tiene que dar la pantalla y lo tiene que decir Maite por voz. Con dos
// implementaciones, tarde o temprano dicen cosas distintas sobre la misma asignatura, y ahí ella
// deja de fiarse de las dos.
export function calcular(
  kbCode: string,
  materia: string,
  notas: Record<string, number>,
  personalizados: ComponentesPersonalizados
): CalculoMateria {
  const { componentes, oficial, meta } = estructuraDe(kbCode, personalizados)
  const notaMinima = meta?.notaMinima ?? 5

  const conNota = componentes.map((c) => ({ ...c, nota: typeof notas[c.id] === 'number' ? notas[c.id] : null }))

  const evaluados = conNota.filter((c) => c.nota !== null)
  const pesoEvaluado = evaluados.reduce((t, c) => t + c.peso, 0)
  const pesoPendiente = conNota.filter((c) => c.nota === null).reduce((t, c) => t + c.peso, 0)

  // Puntos ya asegurados sobre la nota final (no sobre 10: sobre lo que vale cada parte).
  const puntosGanados = evaluados.reduce((t, c) => t + (c.nota as number) * (c.peso / 100), 0)

  // "Cómo voy" = media de lo evaluado, no la nota final. Presentar los puntos ganados como si
  // fueran la nota daría un 3,2 en octubre a quien va sacando ochos, que es desmoralizador y
  // además falso.
  const notaHastaAhora = pesoEvaluado > 0 ? redondear((puntosGanados / pesoEvaluado) * 100) : null

  const proyeccionSiMantiene =
    notaHastaAhora === null ? null : redondear(puntosGanados + notaHastaAhora * (pesoPendiente / 100))

  // Qué media necesita en lo que queda. Puede salir por encima de 10 (ya no llega) o por debajo de
  // 0 (ya está aprobada pase lo que pase); las dos se informan como tales en vez de enseñar un
  // número absurdo.
  const necesarioBruto = pesoPendiente > 0 ? ((notaMinima - puntosGanados) / pesoPendiente) * 100 : null
  const aprobadaYa = necesarioBruto !== null ? necesarioBruto <= 0 : puntosGanados >= notaMinima
  const imposibleAprobar = necesarioBruto !== null ? necesarioBruto > 10 : puntosGanados < notaMinima

  const minimosEnRiesgo = conNota
    .filter((c) => c.minimo !== undefined && c.nota !== null && (c.nota as number) < (c.minimo as number))
    .map((c) => `${c.nombre}: tienes ${c.nota} y el mínimo es ${c.minimo}`)

  return {
    kbCode,
    materia,
    oficial,
    componentes: conNota,
    pesoEvaluado,
    notaHastaAhora,
    proyeccionSiMantiene,
    necesarioParaAprobar:
      necesarioBruto === null || aprobadaYa || imposibleAprobar ? null : redondear(necesarioBruto),
    aprobadaYa,
    imposibleAprobar,
    minimosEnRiesgo,
    notaMinima,
    asistenciaMinima: meta?.asistenciaMinima,
    aviso: meta?.aviso
  }
}
