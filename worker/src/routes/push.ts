import { Hono } from 'hono'
import type { Env, PushSubscriptionRecord } from '../types.js'
import type { PushSubscription } from '@block65/webcrypto-web-push'

export const push = new Hono<{ Bindings: Env }>()

async function hashEndpoint(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Una suscripción de Web Push lleva dos claves además del endpoint: `p256dh`, que es un punto de
// la curva P-256 sin comprimir (65 bytes: 0x04 seguido de las coordenadas x e y), y `auth`, un
// secreto de 16 bytes. Sin las dos, el cifrado del mensaje es imposible.
//
// Antes esto solo comprobaba que existiera el endpoint. Eso permitió que una suscripción de
// prueba con p256dh="x" y auth="y" se guardara como válida, se contara como "un dispositivo
// suscrito" en /estado, y se reportara como que el canal de emergencia estaba funcionando. No lo
// estaba: al intentar enviar de verdad, la firma reventaba con "Point is not on curve".
//
// Validar aquí convierte ese fallo silencioso —que solo se habría descubierto el día del SOS— en
// un rechazo inmediato en el momento de suscribirse.
function claveP256Valida(clave: string | undefined): boolean {
  if (!clave) return false
  try {
    const b64 = clave.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
    return bytes.length === 65 && bytes[0] === 0x04
  } catch {
    return false
  }
}

push.post('/push/subscribe', async (c) => {
  const body = await c.req.json<{ subscription: PushSubscription; grupo?: 'ella' | 'familia' }>()
  if (!body.subscription?.endpoint) {
    return c.json({ error: 'Falta la suscripción' }, 400)
  }
  const claves = body.subscription.keys as { p256dh?: string; auth?: string } | undefined
  if (!claveP256Valida(claves?.p256dh) || !claves?.auth) {
    return c.json(
      { error: 'La suscripción no trae claves válidas (p256dh de 65 bytes y auth). No se guardó.' },
      400
    )
  }

  const grupo = body.grupo === 'familia' ? 'familia' : 'ella'
  const key = `push:${grupo}:${await hashEndpoint(body.subscription.endpoint)}`

  const record: PushSubscriptionRecord = {
    endpoint: body.subscription.endpoint,
    expirationTime: body.subscription.expirationTime ?? null,
    keys: body.subscription.keys as { p256dh: string; auth: string },
    grupo,
    guardadoEn: new Date().toISOString()
  }

  await c.env.KV.put(key, JSON.stringify(record))
  return c.json({ ok: true })
})
