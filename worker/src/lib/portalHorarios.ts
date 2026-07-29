// Cliente del portal de horarios de la Universidad de Navarra.
//
// La UNAV no publica el horario como página web: lo publica en un portal hecho con Angular
// (unav-publish.bulletscheduling.com) que carga los datos de una API. Por eso ningún buscador —ni
// ninguna IA que solo lea HTML— puede verlo, y por eso hasta ahora el horario de la app se metía a
// mano copiándolo del portal. Esto lo automatiza.
//
// Lo que resuelve de verdad: cuando Carmen pase a segundo, a tercero y a cuarto, su horario cambia
// entero. Sin esto habría que volver a transcribirlo cada seis meses y, en cuanto nadie lo hiciera,
// Maite estaría diciéndole las aulas del año pasado con total seguridad. Eso es peor que no saber.
//
// Sobre las credenciales: NO están escritas aquí. El portal es público y sirve su propia
// configuración —incluido el cliente de solo lectura que usa cualquier navegador que lo abra— en
// una URL abierta. Se lee de ahí en cada sincronización. Así no se copia una credencial ajena a
// este repositorio, que es público, y si la UNAV la rota mañana esto sigue funcionando.

const CONFIG_URL = 'https://unav-publish.bulletscheduling.com/assets/config/app-settings.prod.json'

// El identificador de la carrera en el portal. Se filtra por la CARRERA y no por el grupo concreto
// porque los identificadores de grupo cambian cada curso académico (el de primero de este año no
// es el de primero del que viene), mientras que el de la titulación es estable. El curso -1º, 2º,
// 3º, 4º- se separa después leyendo el plan de cada grupo.
const CURSO_DISENO = '354'

type ConfigPortal = {
  apiBaseUrl: string
  authConfig: { issuer: string; clientId: string; clientSecret: string; scope: string }
}

export type ClaseHorario = {
  cursos: number[]
  semestre: number | null
  dia: number // 0 = lunes
  inicio: string // HH:MM
  fin: string
  materia: string
  aulas: string[]
  profesores: string[]
  desde: string // lunes de la primera semana, YYYY-MM-DD
  hasta: string // lunes de la última
  semanas: number
}

export type SesionSuelta = {
  cursos: number[]
  semestre: number | null
  fecha: string // YYYY-MM-DD, la fecha real ya calculada
  inicio: string
  fin: string
  materia: string
  aulas: string[]
  profesores: string[]
}

export type HorarioPortal = {
  obtenido: string
  cursoAcademico: string | null
  clases: ClaseHorario[]
  sesiones: SesionSuelta[]
}

async function leerConfig(): Promise<ConfigPortal> {
  const r = await fetch(CONFIG_URL)
  if (!r.ok) throw new Error(`No pude leer la configuración del portal (${r.status})`)
  const cfg = (await r.json()) as ConfigPortal
  if (!cfg?.apiBaseUrl || !cfg?.authConfig?.issuer) throw new Error('La configuración del portal no trae lo que esperaba')
  return cfg
}

async function pedirToken(cfg: ConfigPortal): Promise<string> {
  const { issuer, clientId, clientSecret, scope } = cfg.authConfig
  const r = await fetch(`${issuer}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope
    })
  })
  if (!r.ok) throw new Error(`El portal no me dio token (${r.status})`)
  const j = (await r.json()) as { access_token?: string }
  if (!j.access_token) throw new Error('El portal contestó sin token')
  return j.access_token
}

// Se pide SIEMPRE filtrado por carrera. El endpoint que lo devuelve todo existe, pero son 21.000
// eventos y 170 MB: no cabe en la memoria de un Worker. Filtrado son 255 eventos y 2,5 MB.
async function descargar(cfg: ConfigPortal, token: string): Promise<any[]> {
  const r = await fetch(`${cfg.apiBaseUrl}/EventPublished/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: [
        {
          and: true,
          type: 0,
          not: false,
          value: CURSO_DISENO,
          path: 'EventData.StudentGroups.CurricularPlan.Course.Id',
          caseInsensitive: false
        }
      ]
    })
  })
  if (!r.ok) throw new Error(`El portal rechazó la consulta (${r.status})`)
  const j = (await r.json()) as { data?: { data?: any[] } }
  return j?.data?.data || []
}

// "Design Studio I (Design thinking). (Gr. Diseño)" -> "Design Studio I (Design thinking)".
//
// El portal repite en cada nombre a qué titulación pertenece y, en las anuales, en qué semestre va.
// Eso es ruido cuando Maite lo lee en voz alta: ya sabe de qué carrera habla.
export function limpiarMateria(nombre: string): string {
  return String(nombre || '')
    .replace(/\(?\s*Gr\.?\s*Dise[nñ]o\s*\)?/gi, '')
    .replace(/\((?:1|2)[ºo°]?\s*sem\.?\)/gi, '')
    .replace(/\(\s*área[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s.,·-]+$/, '')
    .replace(/^[\s.,·-]+/, '')
    .trim()
}

// "2026/2027 Primer semestre" -> 1.
//
// Cuando el evento no lo declara —pasa con las jornadas sueltas y con la conferencia semanal de los
// viernes— se deduce de las fechas. Y hay un caso que hay que tratar aparte: lo que empieza en
// otoño y termina en primavera es ANUAL, no del primer semestre. Marcarlo como del primero lo
// borraba del horario de febrero a abril, cuando sigue habiéndolo todas las semanas.
export function semestreDe(
  nombreAnio: string | null | undefined,
  primerLunes: string | null,
  ultimoLunes?: string | null,
  esRecurrente = true
): number | null {
  const n = String(nombreAnio || '').toLowerCase()
  if (n.includes('primer')) return 1
  if (n.includes('segundo')) return 2
  if (!primerLunes) return null

  // El portal deja el semestre en blanco en las sesiones sueltas de mayo y junio, y ahí NO se
  // adivina.
  //
  // Se adivinaba por el mes, y salía mal de una forma que engañaba: las sesiones de junio de
  // "Design Studio I" —que es una asignatura del PRIMER semestre— quedaban archivadas como del
  // segundo. En la app aparecía una asignatura de septiembre dentro del semestre de febrero. El
  // dato del portal era correcto; lo que estaba mal era mi regla. Sin semestre, la sesión se
  // enseña por su fecha, que es lo único que el portal afirma de ella.
  if (!esRecurrente) return null

  const esPrimero = (iso: string) => {
    const mes = Number(iso.slice(5, 7))
    return mes >= 8 && mes <= 12
  }
  const arranca = esPrimero(primerLunes)
  if (ultimoLunes && arranca && !esPrimero(ultimoLunes)) return null // cruza el año: anual
  return arranca ? 1 : 2
}

// `weeks[].startDate` es SIEMPRE el lunes de esa semana (comprobado contra el calendario: 31-ago-26,
// 30-nov-26, 11-ene-27 y 7-jun-27 son todos lunes). Sumarle el día da la fecha real del evento, que
// es lo que necesita el radar de fechas — un examen sirve de poco si solo sabes de qué semana es.
export function fechaReal(lunesISO: string, dia: number): string {
  const d = new Date(`${lunesISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dia)
  return d.toISOString().slice(0, 10)
}

// A qué cursos del Grado en Diseño pertenece un evento.
//
// Devuelve una lista y no un número porque 33 de los 255 eventos están compartidos entre varios
// grupos. Coger el primero daba errores silenciosos y feos: "Tradiciones Creativas en la Cultura
// Hispana" —que es de segundo— aparecía en el horario de primero porque el primer grupo del evento
// era `1-Int.Found.P.Y-16`, primero de OTRA titulación. Nada fallaba; simplemente el horario de
// Carmen tenía una asignatura que no cursa.
//
// Por eso también se filtran los grupos que no son de esta carrera: en el portal conviven Diseño,
// Arquitectura y los programas Foundation, y sus grupos se cruzan en las asignaturas comunes.
function cursosDe(ev: any): number[] {
  const anios = new Set<number>()
  for (const g of ev?.studentGroups || []) {
    const idCarrera = g?.curricularPlan?.course?.id
    const nombre = String(g?.name || '')
    const esDiseno = String(idCarrera) === CURSO_DISENO || /Gr\.Dise[nñ]o/i.test(nombre)
    if (!esDiseno) continue
    const anio = g?.curricularPlan?.year
    if (typeof anio === 'number') {
      anios.add(anio)
      continue
    }
    // Respaldo por si algún grupo viene sin plan: el nombre empieza por el curso ("2-Gr.Diseño-16").
    const m = /^(\d)-/.exec(nombre)
    if (m) anios.add(Number(m[1]))
  }
  return [...anios].sort()
}

const nombres = (xs: any[] | undefined) =>
  [...new Set((xs || []).map((x) => String(x?.name || '').trim()).filter(Boolean))]

const TIPOS_CLASE = new Set(['Clases', 'Clases_Practicas', 'Cursos_y_Conferencias'])

// Cuántas semanas hay que repetirse para contar como clase fija del horario.
//
// En los datos reales las clases regulares van de 10 a 25 semanas y las sesiones puntuales tienen
// exactamente una, así que el corte cae en tierra de nadie y es seguro. Hace falta ADEMÁS del tipo
// de evento porque el portal marca como `Clases` cosas que ocurren un solo día —una recuperación de
// Antropología el 30 de noviembre a las 16:00, por ejemplo—. Metida en la parrilla semanal, esa
// entrada le diría a Carmen que tiene Antropología todos los lunes por la tarde, que es falso.
const MINIMO_SEMANAS_PARA_SER_CLASE = 4

// Separa las clases que se repiten cada semana de las sesiones de un solo día.
export function normalizar(eventos: any[]): { clases: ClaseHorario[]; sesiones: SesionSuelta[]; cursoAcademico: string | null } {
  const clases: ClaseHorario[] = []
  const sesiones: SesionSuelta[] = []
  let cursoAcademico: string | null = null

  for (const e of eventos) {
    const ev = e?.eventData
    if (!ev) continue
    const cursos = cursosDe(ev)
    if (!cursos.length) continue

    const semanas = [...new Set((ev.weeks || []).map((w: any) => String(w?.startDate || '').slice(0, 10)).filter(Boolean))].sort() as string[]
    if (!semanas.length) continue

    const anio = typeof ev.academicYear === 'object' ? ev.academicYear?.name : null
    if (anio && !cursoAcademico) cursoAcademico = String(anio).slice(0, 9)

    const tipo = String(ev.eventType?.name || '')
    // Hay eventos sin asignatura: la conferencia de los viernes en el Aula Magna y alguna jornada
    // suelta. "Sin nombre" en el horario no dice nada; el tipo del portal sí.
    const materia =
      limpiarMateria(typeof ev.module === 'object' ? ev.module?.name : '') ||
      (tipo === 'Cursos_y_Conferencias' ? 'Conferencia (sesión programada)' : 'Sesión programada')
    const esClaseRecurrente = TIPOS_CLASE.has(tipo) && semanas.length >= MINIMO_SEMANAS_PARA_SER_CLASE
    const base = {
      cursos,
      semestre: semestreDe(anio, semanas[0], semanas[semanas.length - 1], esClaseRecurrente),
      inicio: String(ev.startTime || ''),
      fin: String(ev.endTime || ''),
      materia,
      aulas: nombres(ev.classrooms),
      profesores: nombres(ev.teachers)
    }
    const dia = Number(ev.day)
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) continue

    if (esClaseRecurrente) {
      clases.push({ ...base, dia, desde: semanas[0], hasta: semanas[semanas.length - 1], semanas: semanas.length })
    } else {
      // Una sesión suelta puede tener varias semanas asignadas; cada una es una fecha distinta.
      for (const lunes of semanas) {
        sesiones.push({ ...base, fecha: fechaReal(lunes, dia) })
      }
    }
  }

  const clave = (x: { dia?: number; fecha?: string; inicio: string; materia: string }) =>
    `${x.fecha ?? x.dia}|${x.inicio}|${x.materia}`
  clases.sort((a, b) => clave(a).localeCompare(clave(b)))
  sesiones.sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`))

  return { clases, sesiones, cursoAcademico }
}

export async function traerHorarioDelPortal(): Promise<HorarioPortal> {
  const cfg = await leerConfig()
  const token = await pedirToken(cfg)
  const eventos = await descargar(cfg, token)
  const { clases, sesiones, cursoAcademico } = normalizar(eventos)
  return { obtenido: new Date().toISOString(), cursoAcademico, clases, sesiones }
}

// El semestre `null` (la conferencia semanal de los viernes, que va todo el año) entra siempre:
// no declararlo no significa que no exista.
export function filtrar(h: HorarioPortal, curso: number, semestre?: number) {
  const ok = (x: { cursos: number[]; semestre: number | null }) =>
    x.cursos.includes(curso) && (semestre === undefined || x.semestre === semestre || x.semestre === null)
  return { clases: h.clases.filter(ok), sesiones: h.sesiones.filter(ok) }
}
