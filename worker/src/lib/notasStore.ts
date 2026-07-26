import type { Env } from '../types.js'

// Registro de calificaciones de Carmen, para el tracker de promedio del expediente.
//
// Vive en KV (no en el Knowledge Base de ElevenLabs) por dos razones: son datos que cambian
// seguido y son suyos, no material de consulta del agente. Maite puede consultarlos vía
// /notas cuando Carmen le pregunte "¿cómo voy?", pero no viven mezclados con las guías docentes.

const KEY = 'notas:registro'

export interface Nota {
  id: string
  kbCode: string // qué materia (KB9-x) — enlaza con la guía docente y sus ECTS
  materia: string // nombre legible, como lo verá en pantalla
  nota: number // 0-10
  ects: number // créditos, el peso de esta nota en el promedio
  curso: number // 1-4: solo 1º y 2º cuentan para la mención (ver KB1)
  registradaEn: string
}

export async function listarNotas(env: Env): Promise<Nota[]> {
  const raw = await env.KV.get(KEY)
  return raw ? (JSON.parse(raw) as Nota[]) : []
}

export async function guardarNota(env: Env, nota: Omit<Nota, 'id' | 'registradaEn'>): Promise<Nota> {
  const notas = await listarNotas(env)
  // Si ya había nota de esa materia, se reemplaza: una asignatura tiene una sola calificación
  // final (si hubo varias convocatorias, la que vale es con la que finalmente aprobó).
  const sinEsaMateria = notas.filter((n) => n.kbCode !== nota.kbCode)
  const nueva: Nota = { ...nota, id: crypto.randomUUID(), registradaEn: new Date().toISOString() }
  await env.KV.put(KEY, JSON.stringify([...sinEsaMateria, nueva]))
  return nueva
}

export async function borrarNota(env: Env, id: string): Promise<void> {
  const notas = await listarNotas(env)
  await env.KV.put(KEY, JSON.stringify(notas.filter((n) => n.id !== id)))
}

// Nota media del expediente: promedio de las asignaturas APROBADAS (>= 5), ponderado por ECTS.
// Solo cuentan 1º y 2º curso, que son las que definen la mención según KB1.
//
// No se calcula ningún "objetivo" ni "cuánto falta": la mención se asigna por orden de
// expediente entre quienes la piden, así que no existe un número mínimo publicado que alcanzar.
// Inventar un umbral sería falsear información sobre algo que le importa mucho a Carmen.
export function calcularPromedio(notas: Nota[]): { promedio: number | null; ectsComputados: number; materias: number } {
  const cuentan = notas.filter((n) => n.curso <= 2 && n.nota >= 5)
  const ectsTotales = cuentan.reduce((s, n) => s + n.ects, 0)
  if (ectsTotales === 0) return { promedio: null, ectsComputados: 0, materias: 0 }
  const suma = cuentan.reduce((s, n) => s + n.nota * n.ects, 0)
  return {
    promedio: Math.round((suma / ectsTotales) * 100) / 100,
    ectsComputados: ectsTotales,
    materias: cuentan.length
  }
}
