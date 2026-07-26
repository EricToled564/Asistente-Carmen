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

  // Cuántos avisos SALIERON de verdad, no cuántos no fallaron.
  //
  // La diferencia importa justo aquí y en ningún otro endpoint: un canal sin configurar (sin
  // email de destino, sin nadie suscrito a push) no lanza excepción — simplemente no manda nada.
  // Contando solo errores, la respuesta era `{ok:true, canalesConError:0}` con cero avisos
  // enviados: exactamente igual que si hubiera funcionado. En el botón de emergencia de una chica
  // de 18 años sola en otro país, esa confusión no se puede permitir.
  const enviados = resultados
    .filter((r) => r.status === 'fulfilled')
    .reduce((suma, r) => suma + ((r as PromiseFulfilledResult<number>).value || 0), 0)

  if (enviados === 0) {
    console.error(
      'SOS: no se envió NINGÚN aviso. Revisa FAMILIA_EMAIL_DESTINO, RESEND_API_KEY y si hay algún dispositivo suscrito a push.'
    )
  }

  return c.json({
    ok: enviados > 0,
    avisosEnviados: enviados,
    canalesConError: errores.length,
    // El frontend abre WhatsApp en paralelo pase lo que pase, así que aunque esto venga en cero
    // Carmen no se queda sin ningún camino. Pero tiene que verse.
    detalle: enviados === 0 ? 'Ningún canal configurado envió el aviso. Queda el respaldo de WhatsApp.' : undefined
  })
})

// Las dos funciones devuelven CUÁNTOS avisos mandaron, para que /sos pueda distinguir "no falló"
// de "sí avisó". Sin ese número, un canal sin configurar se ve igual que uno que funcionó.
async function notificarFamiliaPush(env: Env, mapsLink: string | null, bateria: string): Promise<number> {
  const list = await env.KV.list({ prefix: 'push:familia:' })
  const vapid = { subject: 'mailto:soporte@example.com', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
  if (!vapid.publicKey || !vapid.privateKey) return 0

  const enviados = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.KV.get(k.name)
      if (!raw) return 0
      const record = JSON.parse(raw) as PushSubscriptionRecord
      await enviarPush(record, vapid, {
        title: '🆘 SOS',
        body: mapsLink ? `Batería ${bateria}. Ubicación en el link.` : `Sin ubicación disponible. Batería ${bateria}.`,
        url: mapsLink || undefined,
        tag: 'sos'
      })
      return 1
    })
  )
  return enviados.reduce<number>((a, b) => a + b, 0)
}

async function notificarFamiliaEmail(env: Env, mapsLink: string | null, bateria: string): Promise<number> {
  if (!env.FAMILIA_EMAIL_DESTINO || env.FAMILIA_EMAIL_DESTINO.startsWith('REEMPLAZA')) return 0
  if (!env.RESEND_API_KEY) return 0
  await enviarEmail(env.RESEND_API_KEY, {
    to: env.FAMILIA_EMAIL_DESTINO,
    from: 'Maite <sos@resend.dev>',
    subject: '🆘 Alerta SOS',
    html: `
      <p>Se activó el botón SOS.</p>
      <p>Batería: ${bateria}</p>
      ${mapsLink ? `<p><a href="${mapsLink}">Ver ubicación en Google Maps</a></p>` : '<p>Sin ubicación disponible.</p>'}
    `
  })
  return 1
}
