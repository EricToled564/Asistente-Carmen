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

Forma exacta (recursiva — un apartado puede tener "subcomponentes" dentro):
{"componentes":[{"id":"string"|null,"nombre":"string","peso":number,"minimo":number|null,"cuantos":number|null,"subcomponentes":[...]|null}],"notaMinima":number,"asistenciaMinima":number|null,"aviso":string|null}

Reglas:
1. "peso" es el porcentaje sobre el nivel que lo contiene: si el apartado está en la lista de \
arriba del todo, sobre la nota final de la asignatura; si está dentro de "subcomponentes" de otro \
apartado, sobre el 100% de ESE apartado (no del total). Los pesos DEBEN sumar exactamente 100 EN \
CADA NIVEL: los de la lista de arriba del todo entre sí, y los "subcomponentes" de cada apartado \
entre sí, por separado.
2. "id" es un identificador corto en minúsculas sin espacios ni acentos (ejercicios, examen_final, \
asistencia, proyecto_1), único dentro de la asignatura. SOLO hace falta en los apartados que NO \
tienen "subcomponentes" — esos son los que llevan la nota, y necesitan un id donde guardarla. Un \
apartado CON "subcomponentes" no lleva nota directa (se calcula solo de sus hijos), así que su "id" \
puede ir null.
3. "nombre" es como lo verá la alumna: corto, claro, en español (o en el idioma de la asignatura si \
así se llama el proyecto, p. ej. "P2 — Speculative Everything").
4. "subcomponentes": úsalo SOLO cuando la guía describe un apartado que a su vez se reparte en \
partes — el caso típico es "Proyectos X% (P1 Y%, P2 Z%...)" donde cada proyecto ADEMÁS se puntúa \
por dentro (análisis, desarrollo, resultado...). Si la guía solo dice un porcentaje plano sin más \
desglose interno, no le pongas subcomponentes — no inventes una jerarquía que la guía no da. Puede \
haber más de un nivel de profundidad si la guía lo describe así.
5. "minimo": la nota mínima que exige la guía en ESE apartado — y esto YA NO es solo para apartados \
sueltos: si la guía dice "el bloque de proyectos necesita al menos un 4" o "P2 tiene que aprobarse \
por su cuenta con un 5", ese mínimo va en el "minimo" del apartado GRUPO correspondiente (el que \
tiene "subcomponentes"), no como una frase en "aviso". Conviértelo siempre a escala sobre 10.
6. "cuantos" solo en apartados sin subcomponentes, si la guía dice cuántas entregas o pruebas lo \
componen (ej. "3 talleres" -> 3). Si no lo dice, null.
7. "notaMinima" es la nota necesaria para aprobar la asignatura, normalmente 5.
8. "asistenciaMinima" es el porcentaje de asistencia obligatoria si la guía lo exige; si no, null.
9. "aviso" es UNA frase con las condiciones que de verdad no caben en los números — la convocatoria \
extraordinaria, requisitos de asistencia si no hay campo mejor, matices que no son un mínimo \
numérico claro. Los mínimos numéricos (por apartado o por grupo) van en "minimo", NO en "aviso": si \
metes ahí un mínimo que sí tiene número, la app no lo puede calcular ni avisar de verdad, solo \
enseñarlo como texto suelto.

MUY IMPORTANTE — no inventes:
- Si la guía NO publica porcentajes numéricos, devuelve exactamente {"sinDesglose": true, "motivo": \
"..."} explicando en una frase qué dice la guía en su lugar. NO repartas los pesos tú.
- Si los porcentajes que da la guía no suman 100 en algún nivel, devuélvelos TAL CUAL como están \
escritos. No los ajustes para que cuadren: es mejor que se vea el desajuste a que se maquille.
- Si la guía dice "promedio de N proyectos" sin dar el peso de cada uno por separado, repártelos en \
partes iguales dentro de ese grupo (un promedio simple ES partes iguales) — eso no es inventar, es \
la única lectura posible de "promedio".`

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
  // Si algún nivel de la jerarquía no suma 100 (el total, o los subcomponentes de algún grupo en
  // particular), se listan aquí para que se vea EXACTAMENTE dónde está el desajuste — con anidación
  // real, "los pesos no suman 100" a secas no dice si el problema es en el total o en un proyecto
  // suelto dentro de un grupo.
  desajustes?: string[]
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

  // Los ids se desduplican aquí y no se confía en el modelo: dos hojas con el mismo id harían que
  // meter la nota de una pisara la de la otra, sin ningún error visible. Solo se pide unicidad
  // entre HOJAS (las que llevan nota) — un grupo (con subcomponentes) nunca guarda una nota propia,
  // así que su id no compite por ese espacio.
  const vistos = new Set<string>()

  // Recursivo: normaliza una lista de apartados en un nivel cualquiera de la jerarquía. `etiqueta`
  // es solo para poder decir DÓNDE está el desajuste si los pesos de este nivel no suman 100 (el
  // total de la asignatura, o "dentro de Proyectos", etc.), no afecta al cálculo.
  function normalizar(lista: Record<string, unknown>[], etiqueta: string, desajustes: string[]): ComponenteEvaluacion[] {
    const nodos: ComponenteEvaluacion[] = lista.map((c, i) => {
      const hijosCrudos = Array.isArray(c.subcomponentes) ? (c.subcomponentes as Record<string, unknown>[]) : null
      const nombre = String(c.nombre || `Apartado ${i + 1}`)
      const peso = Number(c.peso) || 0
      const minimo = typeof c.minimo === 'number' ? c.minimo : undefined

      if (hijosCrudos?.length) {
        // Grupo: no lleva nota directa, así que su id no necesita desduplicarse contra las hojas.
        const id = idValido(c.id, i) || `grupo_${i + 1}`
        return { id, nombre, peso, minimo, subcomponentes: normalizar(hijosCrudos, nombre, desajustes) }
      }

      let id = idValido(c.id, i)
      while (vistos.has(id)) id = `${id}_${i + 1}`
      vistos.add(id)
      return {
        id,
        nombre,
        peso,
        minimo,
        cuantos: typeof c.cuantos === 'number' ? c.cuantos : undefined
      }
    })

    // Fuera los apartados que valen cero, EN ESTE NIVEL.
    //
    // Salen de verdad: en Taller de Diseño III el modelo devolvió "Exámenes: 0 %", porque la guía
    // los menciona para decir que en esa asignatura no hay. Es fiel a la guía y a la vez inútil
    // aquí: en la pantalla de Carmen sería una fila más donde meter una nota que no cuenta para
    // nada, y si alguna arrastrara un mínimo podría marcarle en riesgo la asignatura por un
    // apartado que no existe. Si TODOS valieran cero no se filtra nada en ESTE nivel, para que se
    // vea que la extracción falló en vez de devolver una lista vacía.
    const conPeso = nodos.filter((c) => c.peso > 0)
    const utiles = conPeso.length ? conPeso : nodos

    const suma = Math.round(utiles.reduce((t, c) => t + c.peso, 0) * 100) / 100
    if (Math.abs(suma - 100) >= 0.5) desajustes.push(`${etiqueta}: suma ${suma}, no 100`)

    return utiles
  }

  const desajustes: string[] = []
  const componentes = normalizar(crudos, 'el total de la asignatura', desajustes)
  const sumaPesos = Math.round(componentes.reduce((t, c) => t + c.peso, 0) * 100) / 100

  return {
    kbCode,
    materia,
    // Se marca ok:false si algún nivel no suma 100, pero se devuelven igual los componentes: así
    // ella ve qué salió y puede corregir el que esté mal, en vez de quedarse con un "no se pudo" y
    // a empezar de cero.
    ok: desajustes.length === 0,
    motivo: desajustes.length ? `Hay porcentajes que no cuadran — revísalos antes de guardar: ${desajustes.join('; ')}.` : undefined,
    componentes,
    notaMinima: Number(datos.notaMinima) || 5,
    asistenciaMinima: typeof datos.asistenciaMinima === 'number' ? datos.asistenciaMinima : undefined,
    aviso: datos.aviso ? String(datos.aviso) : undefined,
    sumaPesos,
    desajustes: desajustes.length ? desajustes : undefined
  }
}
