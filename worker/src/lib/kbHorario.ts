import type { Env } from '../types.js'
import {
  obtenerHorarioPortal,
  cursoActual,
  semestreActualGuardado,
  porDias,
  semestreVigente
} from './horarioOficialStore.js'
import { vistaDelCurso } from './horarioOficialStore.js'
import { esDelSemestre } from './fechasStore.js'
import { fechaEnPamplona } from './tramitesStore.js'
import {
  getKbDocument,
  updateKbDocument,
  crearKbDocumentoTexto,
  adjuntarDocumentoAlAgente
} from './elevenlabs.js'
import { getKbDocId, setKbDocId } from './kbRegistry.js'

// KB8 — el horario semanal de Carmen, en el KB de Maite. Se REGENERA ENTERO cada vez que se
// sincroniza (Preparar semestre), con SOLO el semestre en el que ella está.
//
// Por qué solo un semestre y no los dos, como tenía antes: Maite tiene dos fuentes de horario —
// este documento y el Radar de fechas— y si una hablara de dos semestres a la vez y la otra de uno
// solo, un día cualquiera Maite podía sacar la aula del semestre equivocado de un documento y la
// fecha del correcto del otro, y no habría forma de notar la contradicción desde fuera. Con las dos
// limitadas al MISMO semestre actual, filtrado por la MISMA función (esDelSemestre), es imposible
// que se desincronicen entre sí — literalmente leen la misma fuente con el mismo filtro.
//
// El semestre que no es el suyo no se pierde: el portal lo sigue publicando, y en cuanto se prepare
// ese semestre este documento se regenera con lo nuevo — sustituyendo, no acumulando.

const KB_CODE = 'KB8'
const NOMBRE_DOC = 'KB8 - Horario de Clases'

function fechaLegibleLarga(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
      .format(new Date(`${iso}T12:00:00Z`))
      .replace(/^\w/, (c) => c.toUpperCase())
  } catch {
    return iso
  }
}

interface FilaClase {
  dia: string
  inicio: string
  fin: string
  materia: string
  aula: string
  profesor: string
}

function tablaSemanal(filas: FilaClase[]): string {
  if (!filas.length) return 'El portal no tiene publicada ninguna clase semanal para este bloque todavía.\n'
  const cab = '| Día | Hora | Asignatura | Aula | Profesor |\n|---|---|---|---|---|\n'
  return cab + filas.map((f) => `| ${f.dia} | ${f.inicio}-${f.fin} | ${f.materia} | ${f.aula} | ${f.profesor} |`).join('\n') + '\n'
}

interface FilaSesion {
  fecha: string
  inicio: string
  fin: string
  materia: string
  aula: string
}

function tablaSesiones(filas: FilaSesion[]): string {
  if (!filas.length) return 'El portal no tiene publicada ninguna sesión suelta (examen, entrega, jornada) para este bloque todavía.\n'
  const cab = '| Fecha | Hora | Asignatura | Aula |\n|---|---|---|---|\n'
  return (
    cab +
    filas
      .map((f) => `| ${fechaLegibleLarga(f.fecha)} | ${f.inicio}-${f.fin} | ${f.materia} | ${f.aula} |`)
      .join('\n') +
    '\n'
  )
}

// Detecta clases simultáneas (mismo día, misma hora de inicio, materias DISTINTAS) — el caso de
// Antropología con sus dos grupos. Generado desde los datos, no del nombre "Antropología" a mano:
// así sigue funcionando si el portal cambia qué asignaturas se solapan.
function notaSimultaneas(filas: FilaClase[]): string | null {
  const grupos = new Map<string, FilaClase[]>()
  for (const f of filas) {
    const clave = `${f.dia}|${f.inicio}`
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(f)
  }
  const lineas: string[] = []
  for (const [, xs] of grupos) {
    const materias = new Set(xs.map((x) => x.materia))
    if (materias.size < 2) continue
    lineas.push(
      `- **${xs[0].dia} a las ${xs[0].inicio}:** hay ${materias.size} clases a la vez — ` +
        xs.map((x) => `"${x.materia}" en ${x.aula} con ${x.profesor}`).join(' y ') +
        '. Son grupos distintos de la misma franja, no una confusión del horario. Si Carmen no ha dicho a cuál va, no se lo adivines: dile que lo confirme en Secretaría.'
    )
  }
  return lineas.length ? lineas.join('\n') : null
}

// Detecta una misma asignatura repartida en varias franjas el mismo día (teoría + taller).
function notaPartidas(filas: FilaClase[]): string | null {
  const porDiaMateria = new Map<string, FilaClase[]>()
  for (const f of filas) {
    const clave = `${f.dia}|${f.materia}`
    if (!porDiaMateria.has(clave)) porDiaMateria.set(clave, [])
    porDiaMateria.get(clave)!.push(f)
  }
  const lineas: string[] = []
  for (const [clave, xs] of porDiaMateria) {
    if (xs.length < 2) continue
    const [dia, materia] = clave.split('|')
    const aulas = [...new Set(xs.map((x) => x.aula))]
    lineas.push(`- **"${materia}" el ${dia}:** son ${xs.length} tramos seguidos${aulas.length > 1 ? `, cambiando de aula (${aulas.join(' → ')})` : ''} — es la misma clase partida en teoría y taller, no dos clases distintas.`)
  }
  return lineas.length ? lineas.join('\n') : null
}

export interface ResultadoHorarioKb {
  ok: boolean
  motivo?: string
  documentId?: string
}

export async function espejarHorarioEnKb(env: Env): Promise<ResultadoHorarioKb> {
  const curso = await cursoActual(env)
  const hoy = fechaEnPamplona()
  const portal = await obtenerHorarioPortal(env)
  const todasDelCurso = vistaDelCurso(portal, curso).clases
  const semestre = (await semestreActualGuardado(env)) ?? semestreVigente(todasDelCurso, hoy)

  const { clases, sesiones } = vistaDelCurso(portal, curso, semestre)
  const sesionesDelSemestre = sesiones.filter((s) => esDelSemestre(s.fecha, semestre))

  const dias = porDias(clases)
  const filasSemana: FilaClase[] = dias.flatMap((d) =>
    d.clases.map((c) => ({ dia: d.diaNombre, inicio: c.inicio, fin: c.fin, materia: c.materia, aula: c.aula, profesor: c.profesor }))
  )
  const filasSesiones: FilaSesion[] = sesionesDelSemestre
    .slice()
    .sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`))
    .map((s) => ({ fecha: s.fecha, inicio: s.inicio, fin: s.fin, materia: s.materia, aula: s.aulas.join(' / ') || 'sin aula publicada' }))

  const notas = [notaSimultaneas(filasSemana), notaPartidas(filasSemana)].filter((x): x is string => Boolean(x))

  const documento = `# KB8 — Horario de Clases: ${curso}º Curso, Grado en Diseño (${portal.cursoAcademico || ''})

Propósito: el horario semanal real de Carmen — día, hora, aula y profesor — de UN SOLO semestre: el
${semestre}º, que es el que está cursando ahora mismo. No lleva el otro semestre a propósito: mezclar
los dos aquí es lo que antes hacía que a veces le cantara el aula de un semestre que no tocaba.

Curso académico: ${portal.cursoAcademico || 'sin confirmar'} · Semestre: ${semestre}º · Generado: ${fechaLegibleLarga(hoy)}

Fuente: portal de horarios de la Universidad de Navarra (unav-publish.bulletscheduling.com), leído
en vivo. Las aulas y los profesores son literalmente los que publica la universidad.

Este documento se reemplaza ENTERO cada vez que Carmen prepara un semestre — nunca se acumula.
Cuando pase al semestre ${semestre === 1 ? 2 : 1}º, este mismo documento pasará a hablar de ese, no
del actual.

## Parrilla semanal (semestre ${semestre}º)

${tablaSemanal(filasSemana)}

## Sesiones sueltas: exámenes, entregas y jornadas (semestre ${semestre}º)

El portal publica estas aparte de la parrilla semanal, y las mete TODAS como "Evento_Docencia" — **no
dice cuál es examen, cuál es entrega y cuál es una clase de correcciones.** Da el día, la hora y el
aula, que eso sí es exacto, pero NO la llames "examen" ni "entrega final" a menos que Carmen la haya
llamado así primero. Si te corrige una fecha en conversación, usa la tool \`corregir_radar\`.

${tablaSesiones(filasSesiones)}

${notas.length ? `## Notas de esta parrilla\n\n${notas.join('\n')}\n` : ''}
## Lo que este documento NO cubre

**Los cambios puntuales no están aquí.** Un examen que mueven, un festivo, una clase que se cancela:
eso lo dice ADI o el profesor, no este documento. Si Carmen te cuenta que algo cambió, créele a ella
antes que a esto y dile que lo suba por "Actualizar mi info".

**Las tutorías y los correos de los profesores.** El portal no los publica y este documento no se
los inventa.

## Notas de uso para el agente

Usa la tool \`consultar_horario\` antes de contestar cualquier pregunta de horario: si te dice que
Carmen subió algo más nuevo que esto, usa eso. Si te dice que no hay nada más nuevo, contesta con
esto sin mencionar que lo comprobaste.

Este documento y el Radar de fechas de Carmen están sincronizados al MISMO semestre siempre — no
hace falta que compruebes cuál es "el actual" comparando los dos entre sí.
`

  let documentId = await getKbDocId(env, KB_CODE)
  if (documentId) {
    const existe = await getKbDocument(env.ELEVENLABS_API_KEY, documentId).then(
      () => true,
      (err) => (String(err).includes('404') ? false : Promise.reject(err))
    )
    if (!existe) documentId = null
  }

  if (!documentId) {
    const creado = await crearKbDocumentoTexto(env.ELEVENLABS_API_KEY, NOMBRE_DOC, documento)
    await setKbDocId(env, KB_CODE, creado.id)
    if (env.ELEVENLABS_AGENT_ID) {
      await adjuntarDocumentoAlAgente(env.ELEVENLABS_API_KEY, env.ELEVENLABS_AGENT_ID, {
        type: 'text',
        name: NOMBRE_DOC,
        id: creado.id,
        usage_mode: 'auto'
      })
    }
    return { ok: true, documentId: creado.id }
  }

  await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, documento)
  return { ok: true, documentId }
}

export async function espejarHorarioSinRomper(env: Env): Promise<ResultadoHorarioKb> {
  try {
    return await espejarHorarioEnKb(env)
  } catch (err) {
    console.error('[kbHorario] no se pudo espejar el horario al KB', err)
    return { ok: false, motivo: String(err).slice(0, 200) }
  }
}
