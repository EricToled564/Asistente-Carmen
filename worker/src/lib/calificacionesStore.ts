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

// Un apartado evaluado: si es hoja, `nota` es lo que metió Carmen. Si es grupo (tiene
// `subcomponentes`), `nota` es siempre null — su valor no se mete a mano, se calcula recursivamente
// de sus hijos — y en su lugar trae `pesoEvaluado`/`notaActual`, el mismo par de números que a nivel
// de toda la asignatura, pero calculados SOLO dentro de este apartado.
export type NodoEvaluado = ComponenteEvaluacion & {
  nota: number | null
  pesoEvaluado: number // 0-100, dentro del espacio propio de este nodo
  notaActual: number | null // 0-10, media de lo evaluado dentro de este nodo — null si nada evaluado
  subcomponentes?: NodoEvaluado[]
}

export interface CalculoMateria {
  kbCode: string
  materia: string
  oficial: boolean
  componentes: NodoEvaluado[]
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

// Evalúa UN nodo (hoja o grupo) contra las notas guardadas, recursivamente.
//
// Es la pieza central de todo el motor: una hoja SOLO trae lo que Carmen metió; un grupo es
// siempre el promedio ponderado de sus hijos, contando como "no evaluado" lo que sus hijos aún no
// tengan. Aplicado a la raíz (la asignatura entera, un grupo cuyos hijos son sus apartados de
// primer nivel) da EXACTAMENTE la misma fórmula que antes tenía el cálculo plano — no es una
// fórmula nueva, es la misma generalizada a cualquier profundidad. Con una asignatura sin
// subcomponentes en ningún apartado (el caso de siempre, ocho de cada nueve materias de primero),
// el resultado es idéntico bit a bit al de antes.
function evaluarNodo(nodo: ComponenteEvaluacion, notas: Record<string, number>): NodoEvaluado {
  if (!nodo.subcomponentes?.length) {
    const nota = typeof notas[nodo.id] === 'number' ? notas[nodo.id] : null
    return { ...nodo, nota, pesoEvaluado: nota === null ? 0 : 100, notaActual: nota, subcomponentes: undefined }
  }

  const hijos = nodo.subcomponentes.map((h) => evaluarNodo(h, notas))

  let pesoEvaluado = 0
  let puntos = 0 // en la misma escala que "puntosGanados": suma de nota*peso/100 de los hijos evaluados
  for (const h of hijos) {
    pesoEvaluado += (h.peso / 100) * h.pesoEvaluado
    if (h.notaActual !== null) puntos += (h.peso / 100) * (h.pesoEvaluado / 100) * h.notaActual
  }
  const notaActual = pesoEvaluado > 0 ? redondear((puntos / pesoEvaluado) * 100) : null

  return { ...nodo, nota: null, pesoEvaluado: redondear(pesoEvaluado), notaActual, subcomponentes: hijos }
}

// Recorre el árbol entero buscando CUALQUIER nodo —hoja o grupo— con `minimo` que esté por debajo
// de él. Un grupo con mínimo (p. ej. "Proyectos" en Design Studio IV, mínimo 4 sobre el promedio de
// P1+P2+PE) se compara igual que una hoja: contra su propia `notaActual`, calculada más arriba.
function minimosEnRiesgoDe(nodo: NodoEvaluado): string[] {
  const propios: string[] = []
  if (nodo.minimo !== undefined && nodo.pesoEvaluado > 0 && (nodo.notaActual as number) < nodo.minimo) {
    propios.push(`${nodo.nombre}: va en ${nodo.notaActual} y el mínimo es ${nodo.minimo}`)
  }
  const deHijos = (nodo.subcomponentes || []).flatMap(minimosEnRiesgoDe)
  return [...propios, ...deHijos]
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

  // La asignatura entera se trata como un grupo raíz cuyos hijos son sus apartados de primer
  // nivel — así el mismo evaluarNodo() de arriba sirve tanto para la asignatura completa como para
  // cualquier subgrupo suyo, sin duplicar la fórmula.
  const raiz = evaluarNodo({ id: '__raiz__', nombre: materia, peso: 100, subcomponentes: componentes }, notas)
  const conNota = raiz.subcomponentes || []

  const pesoEvaluado = raiz.pesoEvaluado
  const pesoPendiente = redondear(100 - pesoEvaluado)
  const notaHastaAhora = raiz.notaActual
  const puntosGanados = notaHastaAhora === null ? 0 : redondear((notaHastaAhora * pesoEvaluado) / 100)

  const proyeccionSiMantiene =
    notaHastaAhora === null ? null : redondear(puntosGanados + notaHastaAhora * (pesoPendiente / 100))

  // Qué media necesita en lo que queda. Puede salir por encima de 10 (ya no llega) o por debajo de
  // 0 (ya está aprobada pase lo que pase); las dos se informan como tales en vez de enseñar un
  // número absurdo.
  const necesarioBruto = pesoPendiente > 0 ? ((notaMinima - puntosGanados) / pesoPendiente) * 100 : null
  const aprobadaYa = necesarioBruto !== null ? necesarioBruto <= 0 : puntosGanados >= notaMinima
  const imposibleAprobar = necesarioBruto !== null ? necesarioBruto > 10 : puntosGanados < notaMinima

  const minimosEnRiesgo = conNota.flatMap(minimosEnRiesgoDe)

  return {
    kbCode,
    materia,
    oficial,
    componentes: conNota,
    pesoEvaluado,
    pesoPendiente,
    puntosGanados,
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

// Busca una hoja por id en todo el árbol (recursivo) — para validar que un `componenteId` que
// llega de la app es de verdad un apartado donde SE PUEDE meter una nota (una hoja), no el id de
// un grupo (que no admite nota directa, se calcula solo).
export function hojaExiste(componentes: ComponenteEvaluacion[], id: string): boolean {
  for (const c of componentes) {
    if (c.subcomponentes?.length) {
      if (hojaExiste(c.subcomponentes, id)) return true
    } else if (c.id === id) {
      return true
    }
  }
  return false
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
