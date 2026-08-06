import type { Env } from '../types.js'
import { traerHorarioDelPortal, filtrar, type HorarioPortal, type ClaseHorario, type SesionSuelta } from './portalHorarios.js'

// Lo que la app y Maite ven del portal de horarios, guardado en KV.
//
// El portal se consulta poco a propósito. Un horario publicado cambia dos o tres veces al año, no
// cada hora, y cada sincronización son tres peticiones a un servidor de la universidad que no es
// nuestro. Lo que se guarda aquí es la última foto buena; si el portal está caído, se sigue
// sirviendo esa foto en vez de dejar a Carmen sin horario.

const CLAVE = 'horario:portal'
const CURSO_DE_CARMEN = 'horario:curso-actual'

// Doce horas. No hay ninguna razón para preguntar más seguido, y sí para no hacerlo.
const FRESCURA_MS = 12 * 60 * 60 * 1000

export type HorarioGuardado = HorarioPortal & { fallo?: string | null }

export async function leerGuardado(env: Env): Promise<HorarioGuardado | null> {
  return (await env.KV.get<HorarioGuardado>(CLAVE, 'json')) || null
}

// En qué curso está Carmen. Se guarda porque el portal publica los cuatro a la vez y hay que saber
// cuál es el suyo; empieza en 1 y sube cuando ella prepara un semestre de otro curso.
export async function cursoActual(env: Env): Promise<number> {
  const v = await env.KV.get(CURSO_DE_CARMEN)
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1
}

// El semestre en el que Carmen ESTÁ, fijado al preparar/sincronizar un semestre — no deducido del
// calendario. Existe porque "preparé el semestre 2" tiene que cambiar lo que la app enseña
// (horario por defecto, materias de calificaciones, tips, selector al grabar), y el calendario
// solo sabe qué mes es, no qué decidió ella. null = nunca fijado; el que lea cae al calendario.
const KEY_SEMESTRE = 'horario:semestreActual'

export async function semestreActualGuardado(env: Env): Promise<number | null> {
  const v = await env.KV.get(KEY_SEMESTRE)
  const n = Number(v)
  return n === 1 || n === 2 ? n : null
}

export async function fijarSemestre(env: Env, semestre: number): Promise<void> {
  await env.KV.put(KEY_SEMESTRE, String(semestre))
}

export async function fijarCurso(env: Env, curso: number): Promise<void> {
  await env.KV.put(CURSO_DE_CARMEN, String(curso))
}

function estaFresco(h: HorarioGuardado | null): boolean {
  if (!h?.obtenido) return false
  return Date.now() - new Date(h.obtenido).getTime() < FRESCURA_MS
}

// Devuelve el horario, sincronizando si hace falta.
//
// `forzar` lo usa el botón de "Preparar el semestre": ahí sí queremos ir al portal aunque la copia
// sea de hace una hora, porque la razón de pulsarlo es justamente que algo cambió.
export async function obtenerHorarioPortal(env: Env, forzar = false): Promise<HorarioGuardado> {
  const guardado = await leerGuardado(env)
  if (!forzar && estaFresco(guardado)) return guardado as HorarioGuardado

  try {
    const fresco = await traerHorarioDelPortal()
    // Una respuesta vacía no se guarda. Si el portal contesta 200 con cero eventos —porque
    // cambiaron el identificador de la carrera, porque están migrando— sobreescribir la copia
    // buena con nada dejaría a Carmen sin horario y sin forma de saber por qué.
    if (!fresco.clases.length) {
      if (guardado) return { ...guardado, fallo: 'El portal contestó sin ninguna clase; te dejo la última copia buena.' }
      return { ...fresco, fallo: 'El portal contestó sin ninguna clase.' }
    }
    const paraGuardar: HorarioGuardado = { ...fresco, fallo: null }
    await env.KV.put(CLAVE, JSON.stringify(paraGuardar))
    return paraGuardar
  } catch (err) {
    const motivo = err instanceof Error ? err.message : 'No pude hablar con el portal de horarios'
    if (guardado) return { ...guardado, fallo: motivo }
    throw err
  }
}

export type SemanaDeClases = {
  dia: number
  diaNombre: string
  clases: Array<{ inicio: string; fin: string; materia: string; aula: string; profesor: string }>
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Agrupa por día para poder pintarlo y para que Maite lo lea en voz sin tener que ordenarlo ella.
export function porDias(clases: ClaseHorario[]): SemanaDeClases[] {
  const dias: SemanaDeClases[] = []
  for (const c of [...clases].sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio))) {
    let d = dias.find((x) => x.dia === c.dia)
    if (!d) {
      d = { dia: c.dia, diaNombre: DIAS[c.dia] || `Día ${c.dia}`, clases: [] }
      dias.push(d)
    }
    d.clases.push({
      inicio: c.inicio,
      fin: c.fin,
      materia: c.materia,
      aula: c.aulas.join(' / '),
      profesor: c.profesores.join(', ')
    })
  }
  return dias
}

// Qué semestre toca hoy, para no enseñarle en marzo el horario de septiembre.
//
// El corte es la fecha real de las semanas publicadas, no el mes: el calendario de la UNAV empieza
// a finales de agosto y el segundo semestre en enero, pero eso lo dice el propio portal y puede
// moverse. Si no hay datos suficientes, cae al 1.
export function semestreVigente(clases: ClaseHorario[], hoyISO: string): number {
  const delSemestre = (s: number) => clases.filter((c) => c.semestre === s)
  for (const s of [1, 2]) {
    const cs = delSemestre(s)
    if (!cs.length) continue
    const desde = cs.map((c) => c.desde).sort()[0]
    // `hasta` es el lunes de la última semana: el semestre sigue vivo hasta el domingo siguiente.
    const ultimoLunes = cs.map((c) => c.hasta).sort().reverse()[0]
    const fin = new Date(`${ultimoLunes}T00:00:00Z`)
    fin.setUTCDate(fin.getUTCDate() + 6)
    if (hoyISO >= desde && hoyISO <= fin.toISOString().slice(0, 10)) return s
  }
  // Fuera de clase (verano, Navidad): el que viene, no el que acabó.
  const proximos = clases.filter((c) => c.desde > hoyISO).sort((a, b) => a.desde.localeCompare(b.desde))
  return proximos[0]?.semestre ?? 1
}

export function vistaDelCurso(h: HorarioPortal, curso: number, semestre?: number): {
  clases: ClaseHorario[]
  sesiones: SesionSuelta[]
} {
  return filtrar(h, curso, semestre)
}
