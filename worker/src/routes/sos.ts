import { Hono } from 'hono'
import type { Env, PushSubscriptionRecord } from '../types.js'
import { enviarEmail } from '../lib/resend.js'
import { enviarPush } from '../lib/webpush.js'

export const sos = new Hono<{ Bindings: Env }>()

sos.post('/sos', async (c) => {
  const body = await c.req.json<{
    lat: number | null
    lng: number | null
    ubicacionDisponible: boolean
    bateria: number | null
  }>()

  const mapsLink = body.ubicacionDisponible ? `https://www.google.com/maps?q=${body.lat},${body.lng}` : null
  const bateriaTexto = body.bateria != null ? `${body.bateria}%` : 'desconocida'

  const resultados = await Promise.allSettled([
    notificarFamiliaPush(c.env, mapsLink, bateriaTexto),
    notificarFamiliaEmail(c.env, mapsLink, bateriaTexto)
  ])

  // Nunca fallar en silencio: si ambos canales fallan igual respondemos 200 con el detalle,
  // porque el frontend YA abre el respaldo de WhatsApp en paralelo sin depender de esta respuesta.
  const errores = resultados.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason?.message)
  if (errores.length) console.error('SOS: fallo parcial', errores)

  return c.json({ ok: true, canalesConError: errores.length })
})

async function notificarFamiliaPush(env: Env, mapsLink: string | null, bateria: string) {
  const list = await env.KV.list({ prefix: 'push:familia:' })
  const vapid = { subject: 'mailto:soporte@example.com', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }

  await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.KV.get(k.name)
      if (!raw) return
      const record = JSON.parse(raw) as PushSubscriptionRecord
      await enviarPush(record, vapid, {
        title: '🆘 SOS',
        body: mapsLink ? `Batería ${bateria}. Ubicación en el link.` : `Sin ubicación disponible. Batería ${bateria}.`,
        url: mapsLink || undefined,
        tag: 'sos'
      })
    })
  )
}

async function notificarFamiliaEmail(env: Env, mapsLink: string | null, bateria: string) {
  if (!env.FAMILIA_EMAIL_DESTINO || env.FAMILIA_EMAIL_DESTINO.startsWith('REEMPLAZA')) return
  await enviarEmail(env.RESEND_API_KEY, {
    to: env.FAMILIA_EMAIL_DESTINO,
    from: 'Nava <sos@resend.dev>',
    subject: '🆘 Alerta SOS',
    html: `
      <p>Se activó el botón SOS.</p>
      <p>Batería: ${bateria}</p>
      ${mapsLink ? `<p><a href="${mapsLink}">Ver ubicación en Google Maps</a></p>` : '<p>Sin ubicación disponible.</p>'}
    `
  })
}
