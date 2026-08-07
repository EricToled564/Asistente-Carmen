import type { Env } from '../types.js'
import { listar, detectarSimultaneas } from './fechasStore.js'
import { fechaEnPamplona } from './tramitesStore.js'
import {
  getKbDocument,
  updateKbDocument,
  crearKbDocumentoTexto,
  adjuntarDocumentoAlAgente
} from './elevenlabs.js'
import { getKbDocId, setKbDocId } from './kbRegistry.js'

// El radar de fechas, espejado al Knowledge Base de Maite.
//
// Sin esto, las fechas que Carmen apunta en el radar (un examen que le dijo el profesor, una
// entrega) las sabía la app pero NO Maite: en conversación, Maite contestaba desde su KB y ahí no
// había nada. La información existía y aun así Maite decía no saberla — o peor, contestaba sin ella
// con total seguridad.
//
// El documento se REGENERA ENTERO en cada cambio, nunca se anexa. Anexar es lo que crea duplicados
// y fechas fantasma: si ella corrige una fecha, el documento tendría la vieja y la nueva y Maite no
// sabría cuál creer. Regenerar desde el almacén hace imposible la duplicidad — el documento dice
// exactamente lo que dice el radar, ni más ni menos.
//
// Se espeja en cada mutación del radar (agregar, borrar, marcar, restaurar, corregir) y al
// sincronizar el horario del portal. El fallo del espejo nunca rompe la operación principal: el
// radar de la app es la fuente de verdad y ya quedó bien; el KB se vuelve a intentar en la próxima
// mutación.

const KB_CODE = 'RADAR'
const NOMBRE_DOC = 'Radar de fechas de Carmen'

function fechaLegible(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Madrid'
    }).format(new Date(`${iso}T12:00:00Z`))
  } catch {
    return iso
  }
}

function cabecera(hoy: string): string {
  return (
    `# Radar de fechas de Carmen\n\n` +
    `Las fechas académicas que vienen: sesiones señaladas del horario oficial de la universidad y ` +
    `fechas que Carmen apuntó ella misma. Actualizado automáticamente; generado el ${fechaLegible(hoy)}. ` +
    `Este documento SIEMPRE refleja el estado actual del radar de la app — si algo no está aquí, no está en el radar.\n\n` +
    `Cómo usarlo: las de origen "oficial" salen del horario publicado por la universidad — puedes dar por ` +
    `buenos el día, la hora y el aula, pero el portal NO dice si son examen, entrega o clase normal: no las ` +
    `llames "examen" salvo que estén reclasificadas o Carmen lo diga. Las de origen "Carmen" las apuntó ella ` +
    `(o tú con la tool corregir_radar) y el tipo sí es fiable. Di las fechas como se dicen hablando: ` +
    `"el martes 1 de diciembre", no "2026-12-01". Si Carmen te corrige una fecha en conversación, usa la tool ` +
    `corregir_radar para arreglarla — el radar y este documento se actualizan solos.\n`
  )
}

export interface ResultadoRadarKb {
  ok: boolean
  motivo?: string
  documentId?: string
  fechas?: number
}

export async function espejarRadarEnKb(env: Env): Promise<ResultadoRadarKb> {
  const hoy = fechaEnPamplona()
  const { fechas } = await listar(env, hoy)

  // Solo lo que viene (y lo de hoy). Las pasadas no ayudan a contestar "¿qué tengo esta semana?" y
  // engordan un contexto que se lee entero en cada conversación.
  const porVenir = fechas.filter((f) => f.fecha >= hoy && !f.hecha)

  const TIPO: Record<string, string> = {
    examen: 'EXAMEN',
    entrega: 'ENTREGA',
    otro: 'apuntada por Carmen',
    oficial: 'sesión señalada oficial'
  }

  const lineas = porVenir.map((f) => {
    const partes = [
      `- ${fechaLegible(f.fecha)}`,
      f.hora ? `de ${f.hora}` : null,
      `— ${f.titulo}`,
      `(${TIPO[f.tipo] || f.tipo}${f.origen === 'propia' ? ', apuntada por Carmen' : ''})`,
      f.aula ? `en ${f.aula}` : null,
      f.nota ? `— nota de Carmen: "${f.nota}"` : null
    ]
    return partes.filter(Boolean).join(' ')
  })

  const colisiones = detectarSimultaneas(porVenir)
  const notaColisiones = colisiones.length
    ? `\n## Sesiones que coinciden en fecha y hora\n\n` +
      `Esto NO es que el radar repita una fecha: son dos asignaturas reales, cada una publicada por la ` +
      `universidad como su propio evento, que caen en el mismo horario (un crit o una jornada compartida). ` +
      `Si Carmen pregunta por una de las dos, no le digas que hay un error — dile las dos y cuál aula tiene ` +
      `cada una.\n\n` +
      colisiones.map((c) => `- ${fechaLegible(c.fecha)} a las ${c.hora.split(/[–-]/)[0]}: ${c.materias.join(' y ')}.`).join('\n') +
      '\n'
    : ''

  const documento =
    cabecera(hoy) +
    `\n## Fechas por venir (${porVenir.length})\n\n` +
    (lineas.length ? lineas.join('\n') : 'Ahora mismo no hay ninguna fecha por venir en el radar.') +
    '\n' +
    notaColisiones

  let documentId = await getKbDocId(env, KB_CODE)

  // Igual que en kbApuntes: el id registrado puede apuntar a un documento borrado a mano en el
  // panel. Si pasa, se recrea — si no, esta materia quedaría rota para siempre y en silencio.
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
    return { ok: true, documentId: creado.id, fechas: porVenir.length }
  }

  await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, documento)
  return { ok: true, documentId, fechas: porVenir.length }
}

// Para llamar desde las rutas sin que un fallo del KB rompa la operación del radar.
export async function espejarRadarSinRomper(env: Env): Promise<ResultadoRadarKb> {
  try {
    return await espejarRadarEnKb(env)
  } catch (err) {
    console.error('[kbRadar] no se pudo espejar el radar al KB', err)
    return { ok: false, motivo: String(err).slice(0, 200) }
  }
}
