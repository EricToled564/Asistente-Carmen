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

// Desglose sacado de la guía docente por Claude cuando Carmen prepara un semestre nuevo, ya
// revisado por ella (ver lib/extraerEvaluacion.ts).
//
// Se guarda aparte de `personalizados` porque no es lo mismo y a ella le importa la diferencia:
// esto salió de su guía docente, aquello se lo inventó ella porque no había guía. La pantalla lo
// dice, y Maite también.
export interface EstructuraDerivada {
  componentes: ComponenteEvaluacion[]
  notaMinima: number
  asistenciaMinima?: number
  aviso?: string
  materia: string
  extraidoEn: string
}
export type Derivados = Record<string, EstructuraDerivada>

interface Almacen {
  notas: NotasPorMateria
  personalizados: ComponentesPersonalizados
  derivados: Derivados
}

export async function leer(env: Env): Promise<Almacen> {
  const raw = await env.KV.get(KEY)
  if (!raw) return { notas: {}, personalizados: {}, derivados: {} }
  const d = JSON.parse(raw) as Partial<Almacen>
  return { notas: d.notas || {}, personalizados: d.personalizados || {}, derivados: d.derivados || {} }
}

export async function escribir(env: Env, almacen: Almacen): Promise<void> {
  await env.KV.put(KEY, JSON.stringify(almacen))
}

export type OrigenEstructura = 'guia' | 'extraido' | 'manual' | 'ninguno'

// De dónde sale el desglose de una asignatura, por orden de confianza:
//   'guia'      -> transcrito a mano de la guía docente (las nueve de primero)
//   'extraido'  -> leído de la guía por Claude al preparar el semestre, y revisado por Carmen
//   'manual'    -> se lo inventó ella porque la guía no publicaba porcentajes
//   'ninguno'   -> todavía no hay
export function estructuraDe(
  kbCode: string,
  personalizados: ComponentesPersonalizados,
  derivados: Derivados = {}
): {
  componentes: ComponenteEvaluacion[]
  oficial: boolean
  origen: OrigenEstructura
  meta?: Pick<EvaluacionMateria, 'notaMinima' | 'asistenciaMinima' | 'aviso'>
} {
  const guia = evaluacionDe(kbCode)
  if (guia) return { componentes: guia.componentes, oficial: true, origen: 'guia', meta: guia }

  const derivado = derivados[kbCode]
  if (derivado) {
    return {
      componentes: derivado.componentes,
      oficial: true,
      origen: 'extraido',
      meta: {
        notaMinima: derivado.notaMinima,
        asistenciaMinima: derivado.asistenciaMinima,
        aviso: derivado.aviso
      }
    }
  }

  const manual = personalizados[kbCode]
  if (manual?.length) return { componentes: manual, oficial: false, origen: 'manual' }

  return { componentes: [], oficial: false, origen: 'ninguno' }
}

export interface CalculoMateria {
  kbCode: string
  materia: string
  oficial: boolean
  componentes: Array<ComponenteEvaluacion & { nota: number | null }>
  pesoEvaluado: number // cuánto porcentaje de la asignatura ya tiene nota
  pesoPendiente: number // el resto: 100 - pesoEvaluado, salvo redondeos de la guía
  puntosGanados: number // lo ya asegurado sobre la nota final (sobre 10, no sobre lo evaluado)
  notaHastaAhora: number | null // media de lo evaluado, sobre 10 — NO la nota final
  proyeccionSiMantiene: number | null // la final si sacara lo mismo en lo que falta
  necesarioParaAprobar: number | null // qué media hace falta en lo que queda
  aprobadaYa: boolean // ya no puede suspender aunque saque 0 en lo que falta
  imposibleAprobar: boolean // ya no puede aprobar aunque saque 10 en todo lo que falta
  minimosEnRiesgo: string[]
  origen: OrigenEstructura
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
  personalizados: ComponentesPersonalizados,
  derivados: Derivados = {}
): CalculoMateria {
  const { componentes, oficial, origen, meta } = estructuraDe(kbCode, personalizados, derivados)
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
    pesoPendiente,
    puntosGanados: redondear(puntosGanados),
    notaHastaAhora,
    proyeccionSiMantiene,
    necesarioParaAprobar:
      necesarioBruto === null || aprobadaYa || imposibleAprobar ? null : redondear(necesarioBruto),
    aprobadaYa,
    imposibleAprobar,
    minimosEnRiesgo,
    origen,
    notaMinima,
    asistenciaMinima: meta?.asistenciaMinima,
    aviso: meta?.aviso
  }
}

export interface ObjetivoMateria {
  objetivo: number
  necesario: number | null // qué media hace falta en lo que queda para llegar al objetivo
  yaAlcanzado: boolean // ya lo tiene asegurado aunque saque 0 en lo que falta
  imposible: boolean // ya no llega ni sacando 10 en todo lo que falta
}

// Generaliza necesarioParaAprobar a CUALQUIER objetivo, no solo el mínimo para aprobar. Es el
// mismo cálculo (mismo servidor, misma fuente) que ya usa la asignatura para "qué necesito para
// aprobar" — esto solo lo reutiliza con el número que Carmen pida en vez del mínimo fijo. Sin
// esto, "qué necesito para llegar a un 8,6" habría que estimarlo en la conversación, y ahí es
// donde un cálculo mental de un LLM se equivoca y dice un número que la pantalla no respalda.
export function necesarioParaObjetivo(m: CalculoMateria, objetivo: number): ObjetivoMateria {
  if (m.pesoPendiente <= 0) {
    const yaAlcanzado = m.puntosGanados >= objetivo
    return { objetivo, necesario: null, yaAlcanzado, imposible: !yaAlcanzado }
  }
  const bruto = ((objetivo - m.puntosGanados) / m.pesoPendiente) * 100
  const yaAlcanzado = bruto <= 0
  const imposible = bruto > 10
  return { objetivo, necesario: yaAlcanzado || imposible ? null : redondear(bruto), yaAlcanzado, imposible }
}
