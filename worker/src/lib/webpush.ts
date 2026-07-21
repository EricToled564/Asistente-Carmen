import { buildPushPayload, type PushMessage, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push'

export interface NotificacionPush {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function enviarPush(
  subscription: PushSubscription,
  vapid: VapidKeys,
  notificacion: NotificacionPush
): Promise<Response> {
  const message: PushMessage = {
    data: JSON.stringify(notificacion),
    options: { ttl: 60 * 60 * 6 } // 6h: suficiente para que abra el teléfono sin acumular basura
  }
  const payload = await buildPushPayload(message, subscription, vapid)
  return fetch(subscription.endpoint, payload)
}
