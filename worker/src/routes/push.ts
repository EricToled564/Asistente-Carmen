import { Hono } from 'hono'
import type { Env, PushSubscriptionRecord } from '../types.js'
import type { PushSubscription } from '@block65/webcrypto-web-push'

export const push = new Hono<{ Bindings: Env }>()

async function hashEndpoint(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

push.post('/push/subscribe', async (c) => {
  const body = await c.req.json<{ subscription: PushSubscription; grupo?: 'ella' | 'familia' }>()
  if (!body.subscription?.endpoint) {
    return c.json({ error: 'Falta la suscripción' }, 400)
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
