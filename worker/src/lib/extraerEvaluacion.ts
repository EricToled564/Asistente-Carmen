import type { Env } from '../types.js'
import { structureText } from './claude.js'
import { getKbDocument } from './elevenlabs.js'
import { getKbDocId } from './kbRegistry.js'
import type { ComponenteEvaluacion } from '../data/evaluacion.js'

// Sacar el desglose de evaluación de una asignatura leyendo su guía docente.
//
// Las nueve de primero están transcritas a mano en data/evaluacion.ts. Las otras cuarenta no, y
// transcribirlas todas de golpe habría sido copiar cuarenta párrafos de porcentajes "por si acaso"
// — la mayoría para asignaturas que Carmen cursará dentro de tres años, con guías docentes que
// para entonces habrán cambiado.
//
// Así que se hace al revés: cuando ella termina un semestre y pide preparar el siguiente, se leen
// las guías de ESAS asignaturas —las de verdad, las que hay en la base de conocimiento ese día— y
// se extraen los pesos. Cinco o seis asignaturas cada seis meses, siempre con la versión vigente.
//
// Nunca se guarda sin que ella lo vea. La extracción es buena pero no infalible, y un peso mal
// leído no da error: da un promedio equivocado que ella se va a creer durante todo el semestre.

const PROMPT = `Te doy la guía docente de una asignatura universitaria. Extrae CÓMO SE EVALÚA, como \
JSON estricto y nada más — sin texto antes ni después, sin cercas de código.

Forma exacta:
{"componentes":[{"id":"string","nombre":"string","peso":number,"minimo":number|null,"cuantos":number|null}],"notaMinima":number,"asistenciaMinima":number|null,"aviso":string|null}

Reglas:
1. "peso" es el porcentaje sobre la nota final. Los pesos DEBEN sumar exactamente 100.
2. "id" es un identificador corto en minúsculas sin espacios ni acentos (ejercicios, examen_final, \
asistencia, proyecto_1). Único dentro de la asignatura.
3. "nombre" es como lo verá la alumna: corto, claro, en español.
4. "minimo" solo si la guía exige una nota mínima EN ESE APARTADO por separado (ej. "el examen \
final requiere un 5"). Si no lo exige, null. Convierte a escala sobre 10: si la guía dice "mínimo \
50/100", el mínimo es 5.
5. "cuantos" solo si la guía dice cuántas entregas o pruebas componen ese apartado (ej. "3 \
talleres" -> 3). Si no lo dice, null.
6. "notaMinima" es la nota necesaria para aprobar la asignatura, normalmente 5.
7. "asistenciaMinima" es el porcentaje de asistencia obligatoria si la guía lo exige; si no, null.
8. "aviso" es UNA frase con las condiciones que no caben en los números: mínimos por apartado, \
requisitos de asistencia, reglas de la convocatoria extraordinaria. Si no hay ninguna, null.

MUY IMPORTANTE — no inventes:
- Si la guía NO publica porcentajes numéricos, devuelve exactamente {"sinDesglose": true, "motivo": \
"..."} explicando en una frase qué dice la guía en su lugar. NO repartas los pesos tú.
- Si los porcentajes que da la guía no suman 100, devuélvelos TAL CUAL como están escritos. No los \
ajustes para que cuadren: es mejor que se vea el desajuste a que se maquille.`

export interface PropuestaEvaluacion {
  kbCode: string
  materia: string
  ok: boolean
  motivo?: string
  componentes?: ComponenteEvaluacion[]
  notaMinima?: number
  asistenciaMinima?: number
  aviso?: string
  sumaPesos?: number
}

function limpiarJson(texto: string): string {
  return texto
    .trim()
    .replace(/^```[a-z]*\s*\n?/i, '')
    .replace(/\n?```\s*$/, '')
    .trim()
}

function idValido(id: unknown, i: number): string {
  const s = String(id || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s || `apartado_${i + 1}`
}

export async function extraerEvaluacionDeGuia(env: Env, kbCode: string, materia: string): Promise<PropuestaEvaluacion> {
  const base: PropuestaEvaluacion = { kbCode, materia, ok: false }

  const documentId = await getKbDocId(env, kbCode)
  if (!documentId) {
    return { ...base, motivo: `No tengo registrada la guía docente de ${kbCode} en la base de conocimiento.` }
  }

  let guia: string
  try {
    guia = await getKbDocument(env.ELEVENLABS_API_KEY, documentId)
  } catch {
    return { ...base, motivo: 'No pude leer la guía docente. Inténtalo de nuevo en un rato.' }
  }
  if (!guia.trim()) {
    return { ...base, motivo: 'La guía docente está vacía en la base de conocimiento.' }
  }

  let datos: Record<string, unknown>
  try {
    datos = JSON.parse(limpiarJson(await structureText(env.ANTHROPIC_API_KEY, PROMPT, guia)))
  } catch {
    return { ...base, motivo: 'No pude interpretar la evaluación de esta guía. Tendrás que ponerla a mano.' }
  }

  if (datos.sinDesglose) {
    return {
      ...base,
      motivo:
        String(datos.motivo || 'La guía docente de esta asignatura no publica porcentajes.') +
        ' Puedes crear el desglose a mano cuando tu profesor te lo diga.'
    }
  }

  const crudos = Array.isArray(datos.componentes) ? datos.componentes : []
  if (!crudos.length) {
    return { ...base, motivo: 'No encontré apartados de evaluación en esta guía.' }
  }

  const vistos = new Set<string>()
  const componentes: ComponenteEvaluacion[] = crudos.map((c: Record<string, unknown>, i: number) => {
    // Los ids se desduplican aquí y no se confía en el modelo: dos apartados con el mismo id
    // harían que meter la nota de uno pisara la del otro, sin ningún error visible.
    let id = idValido(c.id, i)
    while (vistos.has(id)) id = `${id}_${i + 1}`
    vistos.add(id)
    return {
      id,
      nombre: String(c.nombre || `Apartado ${i + 1}`),
      peso: Number(c.peso) || 0,
      minimo: typeof c.minimo === 'number' ? c.minimo : undefined,
      cuantos: typeof c.cuantos === 'number' ? c.cuantos : undefined
    }
  })

  // Fuera los apartados que valen cero.
  //
  // Salen de verdad: en Taller de Diseño III el modelo devolvió "Exámenes: 0 %", porque la guía los
  // menciona para decir que en esa asignatura no hay. Es fiel a la guía y a la vez inútil aquí: en
  // la pantalla de Carmen sería una fila más donde meter una nota que no cuenta para nada, y si
  // alguna arrastrara un mínimo podría marcarle en riesgo una asignatura por un apartado que no
  // existe. Si TODOS valieran cero no se filtra nada, para que se vea que la extracción falló en
  // vez de devolver una lista vacía.
  const conPeso = componentes.filter((c) => c.peso > 0)
  const utiles = conPeso.length ? conPeso : componentes

  const sumaPesos = Math.round(utiles.reduce((t, c) => t + c.peso, 0) * 100) / 100

  return {
    kbCode,
    materia,
    // Se marca ok:false si no suman 100, pero se devuelven igual los componentes: así ella ve qué
    // salió y puede corregir el que esté mal, en vez de quedarse con un "no se pudo" y a empezar
    // de cero.
    ok: Math.abs(sumaPesos - 100) < 0.5,
    motivo:
      Math.abs(sumaPesos - 100) < 0.5
        ? undefined
        : `Los porcentajes de la guía suman ${sumaPesos}, no 100. Revísalos antes de guardar.`,
    componentes: utiles,
    notaMinima: Number(datos.notaMinima) || 5,
    asistenciaMinima: typeof datos.asistenciaMinima === 'number' ? datos.asistenciaMinima : undefined,
    aviso: datos.aviso ? String(datos.aviso) : undefined,
    sumaPesos
  }
}
