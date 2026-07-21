import type { Env, PushSubscriptionRecord } from '../types.js'
import { enviarPush, type NotificacionPush } from '../lib/webpush.js'

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
  await enviarATodos(env, 'ella', {
    title: 'Ya deben estar tus horarios',
    body: 'Súbelos en Ajustes → Actualizar mi info para que tu agente los conozca.',
    url: '/',
    tag: 'recordatorio-horario'
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
    title: 'Nava',
    body: mensaje,
    url: '/',
    tag: 'checkin-diario'
  })
}
