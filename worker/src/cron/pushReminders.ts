import type { Env, PushSubscriptionRecord } from '../types.js'
import { enviarPush, type NotificacionPush } from '../lib/webpush.js'
import { debeRecordarHorario } from '../lib/horarioEstado.js'
import { CATALOGO, leerEstados, escribirEstados, fechaEnPamplona, sumarDias } from '../lib/tramitesStore.js'

async function enviarATodos(env: Env, grupo: 'ella' | 'familia', notificacion: NotificacionPush) {
  const list = await env.KV.list({ prefix: `push:${grupo}:` })
  const vapid = { subject: 'mailto:soporte@example.com', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }

  await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.KV.get(k.name)
      if (!raw) return
      const record = JSON.parse(raw) as PushSubscriptionRecord
      try {
        await enviarPush(record, vapid, notificacion)
      } catch (err) {
        console.error(`[push] fallo enviando a ${k.name}`, err)
      }
    })
  )
}

export async function recordatorioSubirHorario(env: Env) {
  // No insistir si ya está cargado (ej. KB8 ya trae el horario del semestre en curso) — ver
  // lib/horarioEstado.ts. Solo avisa si de verdad no se ha actualizado en un buen rato.
  if (!(await debeRecordarHorario(env))) return
  await enviarATodos(env, 'ella', {
    title: 'Ya deben estar tus horarios',
    body: 'Súbelos en Ajustes → Actualizar mi info para que tu agente los conozca.',
    url: '/',
    tag: 'recordatorio-horario'
  })
}

// Mecanismo C, catálogo 'residencia-check': mismas fechas que el recordatorio de horario
// (25-ago/20-dic), así que se dispara desde el mismo cron trigger en vez de gastar uno nuevo
// (el plan gratis de Cloudflare limita a 5). Ver docs/preguntas-actualizacion.md.
export async function recordatorioResidenciaCheck(env: Env) {
  await enviarATodos(env, 'ella', {
    title: '¿Sigues en CampusHome?',
    body: 'Contesta rapidísimo en Ajustes → Preguntas si cambiaste de residencia.',
    url: '/',
    tag: 'recordatorio-residencia-check'
  })
}

// Mecanismo C, catálogo 'contacto-check': trimestral. Se engancha al cron mensual de KB5-6 (que
// ya corre el día 1 de cada mes) y solo manda el push cada 3er mes — así tampoco necesita un
// cron trigger nuevo.
export async function recordatorioContactoCheckSiTrimestre(env: Env) {
  const mes = new Date().getUTCMonth() // 0-11
  if (mes % 3 !== 0) return // solo enero/abril/julio/octubre
  await enviarATodos(env, 'ella', {
    title: '¿Sigue igual tu contacto?',
    body: 'Un check rápido en Ajustes → Preguntas: ¿cambió tu dirección de contacto?',
    url: '/',
    tag: 'recordatorio-contacto-check'
  })
}

// Check-in proactivo genérico. Nota: el radar académico vive en localStorage del navegador,
// no en el Worker — este cron NO puede saber sus fechas específicas de entrega/examen sin un
// endpoint de sincronización adicional (no construido en v1). Ver README, sección "Limitaciones
// conocidas". Por ahora manda un check-in cálido genérico, no un aviso de deadline puntual.
const MENSAJES_CHECKIN = [
  '¿Cómo va tu día? Aquí ando si necesitas algo 💛',
  'Recuerda tomar agua y salir a caminar un rato hoy.',
  '¿Ya revisaste si tienes algo pendiente en Académico?'
]

export async function checkInProactivo(env: Env) {
  const mensaje = MENSAJES_CHECKIN[Math.floor(Math.random() * MENSAJES_CHECKIN.length)]
  await enviarATodos(env, 'ella', {
    title: 'Maite',
    body: mensaje,
    url: '/',
    tag: 'checkin-diario'
  })
}

// --- Recordatorios de los trámites de los primeros 30 días ---------------------------------
//
// Tres avisos por cita, y el tercero es el que hace que la lista no se quede a medias:
//
//   víspera     -> "mañana a las 9:30 tienes la cita del TIE". El útil de verdad: da tiempo a
//                  reunir los papeles.
//   mismo día   -> por si el de ayer se le pasó.
//   seguimiento -> el día después, "¿cómo fue?, márcalo o agenda otra". Sin esto, una cita a la
//                  que no fue se queda "agendada" para siempre y la app cree que va todo bien.
//
// Cada aviso se marca al mandarse: este cron corre todos los días y sin esa marca repetiría el
// mismo mensaje cada mañana hasta que ella hiciera algo.
export async function recordatoriosDeTramites(env: Env) {
  const estados = await leerEstados(env)
  const hoy = fechaEnPamplona()
  const manana = sumarDias(hoy, 1)
  let cambiado = false

  for (const tramite of CATALOGO) {
    const e = estados[tramite.id]
    if (!e?.cita || e.estado !== 'agendado') continue

    const { fecha, hora, lugar } = e.cita
    const recordatorios = e.recordatorios || {}
    const donde = lugar ? ` en ${lugar}` : ''
    let mandadoAqui = false

    if (fecha === manana && !recordatorios.vispera) {
      await enviarATodos(env, 'ella', {
        title: `Mañana: ${tramite.titulo}`,
        body:
          `A las ${hora}${donde}.` +
          (tramite.queLlevar?.length ? ` Lleva: ${tramite.queLlevar.join(', ')}.` : ''),
        url: '/',
        tag: `tramite-vispera-${tramite.id}`
      })
      recordatorios.vispera = new Date().toISOString()
      mandadoAqui = true
    } else if (fecha === hoy && !recordatorios.mismoDia) {
      await enviarATodos(env, 'ella', {
        title: `Hoy: ${tramite.titulo}`,
        body: `A las ${hora}${donde}. Suerte 💛`,
        url: '/',
        tag: `tramite-hoy-${tramite.id}`
      })
      recordatorios.mismoDia = new Date().toISOString()
      mandadoAqui = true
    } else if (fecha < hoy && !recordatorios.seguimiento) {
      await enviarATodos(env, 'ella', {
        title: `¿Cómo fue lo de ${tramite.titulo}?`,
        body: 'Márcalo como hecho, o agenda otra cita si no pudiste ir.',
        url: '/',
        tag: `tramite-seguimiento-${tramite.id}`
      })
      recordatorios.seguimiento = new Date().toISOString()
      mandadoAqui = true
    }

    // La marca se escribe solo en el trámite que de verdad mandó un aviso. Con un único flag
    // global, en cuanto uno enviaba algo todos los demás se reescribían igual que estaban.
    if (mandadoAqui) {
      estados[tramite.id] = { ...e, recordatorios }
      cambiado = true
    }
  }

  // Una sola escritura al final: KV cobra por operación y esto corre a diario.
  if (cambiado) await escribirEstados(env, estados)
}
