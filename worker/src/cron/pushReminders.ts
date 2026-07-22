import type { Env, PushSubscriptionRecord } from '../types.js'
import { enviarPush, type NotificacionPush } from '../lib/webpush.js'
import { debeRecordarHorario } from '../lib/horarioEstado.js'

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
