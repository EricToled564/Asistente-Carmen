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
  const res = await fetch(subscription.endpoint, payload)

  // Comprobar la respuesta del servicio de push (FCM, Mozilla, Apple), que antes se ignoraba.
  //
  // `fetch` solo lanza excepción si la conexión falla. Un 400 por firma VAPID inválida, un 403 por
  // clave equivocada o un 410 porque el navegador revocó la suscripción llegan como respuestas
  // normales — y devolver esa Response sin mirarla hacía que el llamador lo contara como envío
  // correcto. Así reporté "1 aviso enviado" de una notificación que nunca apareció en ninguna
  // pantalla, que en el canal de emergencia es el fallo más peligroso: decir que sí cuando es no.
  //
  // El cuerpo del error se incluye porque es lo único que distingue las causas entre sí.
  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`El servicio de push respondió ${res.status}${detalle ? `: ${detalle.slice(0, 200)}` : ''}`)
  }
  return res
}
