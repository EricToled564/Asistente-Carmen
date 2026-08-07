import type { Env } from '../types.js'
import { obtenerHorarioPortal, cursoActual, vistaDelCurso, semestreActualGuardado } from './horarioOficialStore.js'
import type { SesionSuelta } from './portalHorarios.js'

// Una fecha pertenece al semestre por su MES, no por cómo la etiqueta el portal: el portal mete
// sesiones de junio en su vista del primer semestre y viceversa, y Carmen no quiere ver NADA del
// semestre que no es el suyo. Ago-dic = 1er semestre; ene-jul = 2º.
export function esDelSemestre(fechaISO: string, semestre: number): boolean {
  const mes = Number(fechaISO.slice(5, 7))
  return semestre === 1 ? mes >= 8 : mes <= 7
}

// El radar de fechas: exámenes, entregas y sesiones señaladas.
//
// Antes vivía en localStorage y estaba vacío. Vacío es lo peor que puede estar: la pantalla existía,
// pedía que ella misma tecleara cada fecha, y por tanto no sabía nada que ella no supiera ya. Ahora
// arranca con las sesiones que la propia universidad tiene publicadas y ella añade lo suyo encima.
//
// Vive en el Worker y no en el móvil por la misma razón que los trámites: un recordatorio que solo
// existe en localStorage no puede dispararse cuando la app está cerrada, que es justo cuando hace
// falta.

const CLAVE = 'fechas:academicas'

export type FechaPropia = {
  id: string
  titulo: string
  fecha: string // YYYY-MM-DD
  tipo: 'examen' | 'entrega' | 'otro'
  nota?: string
}

export type Almacen = {
  propias: FechaPropia[]
  // Las oficiales no se borran: se ocultan. Vuelven a aparecer solas en cuanto el portal las
  // republique, y esconderlas en vez de borrarlas evita el bucle de "la quito y reaparece".
  ocultas: string[]
  // Marcar una oficial como hecha no la borra; solo deja de dar la lata.
  hechas: string[]
}

const VACIO: Almacen = { propias: [], ocultas: [], hechas: [] }

export async function leer(env: Env): Promise<Almacen> {
  const g = await env.KV.get<Partial<Almacen>>(CLAVE, 'json')
  return { ...VACIO, ...(g || {}), propias: g?.propias || [], ocultas: g?.ocultas || [], hechas: g?.hechas || [] }
}

export async function escribir(env: Env, a: Almacen): Promise<void> {
  await env.KV.put(CLAVE, JSON.stringify(a))
}

export type FechaRadar = {
  id: string
  titulo: string
  fecha: string
  hora?: string
  aula?: string
  tipo: 'examen' | 'entrega' | 'otro' | 'oficial'
  origen: 'oficial' | 'propia'
  nota?: string
  hecha: boolean
}

// El identificador de una sesión oficial se calcula a partir de sus datos, no se inventa.
//
// Tiene que ser estable entre sincronizaciones: si cambiara, cada vez que se refresca el portal
// reaparecerían las que ella ocultó y se perderían las que marcó como hechas.
export function idOficial(s: Pick<SesionSuelta, 'fecha' | 'inicio' | 'materia'>): string {
  return `oficial:${s.fecha}:${s.inicio}:${s.materia}`.replace(/\s+/g, '_')
}

// Deliberadamente NO se etiquetan como "examen" o "entrega".
//
// El portal publica estas sesiones como "Evento_Docencia" y no dice cuál es cuál. Un bloque de
// cinco horas de Design Studio en junio puede ser un examen, una entrega final o una jornada de
// correcciones. Llamarlo "examen" sería inventarme un dato que Carmen se creería. Se dice lo que
// es —una sesión del horario oficial, con su día, su hora y su aula— y ella la reclasifica si
// quiere.
function aRadar(s: SesionSuelta, hechas: string[]): FechaRadar {
  const id = idOficial(s)
  return {
    id,
    titulo: s.materia,
    fecha: s.fecha,
    hora: s.inicio && s.fin ? `${s.inicio}–${s.fin}` : undefined,
    aula: s.aulas.join(' / ') || undefined,
    tipo: 'oficial',
    origen: 'oficial',
    hecha: hechas.includes(id)
  }
}

export async function listar(env: Env, hoyISO: string): Promise<{ fechas: FechaRadar[]; avisoPortal: string | null }> {
  const almacen = await leer(env)
  const curso = await cursoActual(env)

  const semestre = (await semestreActualGuardado(env)) ?? (Number(hoyISO.slice(5, 7)) >= 8 ? 1 : 2)

  let oficiales: FechaRadar[] = []
  let avisoPortal: string | null = null
  try {
    const portal = await obtenerHorarioPortal(env)
    avisoPortal = portal.fallo || null
    oficiales = vistaDelCurso(portal, curso)
      .sesiones.map((s) => aRadar(s, almacen.hechas))
      .filter((f) => !almacen.ocultas.includes(f.id))
      // Solo las del semestre de Carmen — las del otro no existen para ella hasta que le toque.
      .filter((f) => esDelSemestre(f.fecha, semestre))
  } catch {
    // Que el portal esté caído no puede vaciar el radar: sus fechas propias siguen ahí.
    avisoPortal = 'No pude comprobar el horario oficial ahorita. Lo que ves es lo que tú has apuntado.'
  }

  const propias: FechaRadar[] = almacen.propias.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    fecha: f.fecha,
    tipo: f.tipo,
    origen: 'propia',
    nota: f.nota,
    hecha: almacen.hechas.includes(f.id)
  }))

  const todas = [...oficiales, ...propias].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''))

  return { fechas: todas, avisoPortal }
}

export type ColisionHoraria = { fecha: string; hora: string; materias: string[] }

// Detecta sesiones OFICIALES con la misma fecha y la misma hora pero distinta materia — el caso de
// "Design Studio I" y "Design Studio II" con un crit final compartido el mismo día a las 09:00 en
// la misma aula. No es un duplicado del radar ni un fallo de sincronización: son dos asignaturas
// reales, cada una publicada por la universidad como su propio evento, que coinciden en el horario.
// Se detecta desde los propios datos (fecha+hora repetidos con título distinto), no de nombres a
// mano, para que siga funcionando si el portal cambia qué asignaturas comparten sesión.
export function detectarSimultaneas(fechas: FechaRadar[]): ColisionHoraria[] {
  const grupos = new Map<string, FechaRadar[]>()
  for (const f of fechas) {
    if (f.origen !== 'oficial' || !f.hora) continue
    const clave = `${f.fecha}|${f.hora}`
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(f)
  }
  const resultado: ColisionHoraria[] = []
  for (const [clave, xs] of grupos) {
    const materias = [...new Set(xs.map((x) => x.titulo))]
    if (materias.length < 2) continue
    const [fecha, hora] = clave.split('|')
    resultado.push({ fecha, hora, materias })
  }
  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function esFechaValida(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
}
