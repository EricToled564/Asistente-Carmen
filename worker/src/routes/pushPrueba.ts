import { Hono } from 'hono'
import type { Env, PushSubscriptionRecord } from '../types.js'
import { enviarPush } from '../lib/webpush.js'

export const pushPrueba = new Hono<{ Bindings: Env }>()

// POST /push/prueba — manda una notificación CLARAMENTE marcada como prueba a los dispositivos
// suscritos, y devuelve qué pasó con cada uno.
//
// Existe porque el canal de notificaciones del SOS no se puede probar de la única forma obvia:
// disparar un SOS real le llega a la familia como "🆘 SOS" con una ubicación, y asustar a alguien
// para comprobar que un botón funciona no es aceptable. Sin esto, la alternativa era no probarlo —
// y quedarse con "debería funcionar" en el canal de emergencia de una chica de 18 años sola en
// otro país.
//
// Además devuelve el error concreto de cada envío. Hasta ahora, si la firma VAPID estaba mal o la
// suscripción había caducado, /sos lo contaba como "un aviso enviado" y nadie se enteraba de que
// no llegó a ninguna pantalla.
pushPrueba.post('/push/prueba', async (c) => {
  const grupo = c.req.query('grupo') === 'ella' ? 'ella' : 'familia'
  const lista = await c.env.KV.list({ prefix: `push:${grupo}:` })

  if (lista.keys.length === 0) {
    return c.json({ enviados: 0, mensaje: `No hay ningún dispositivo suscrito en el grupo "${grupo}".` })
  }
  if (!c.env.VAPID_PUBLIC_KEY || !c.env.VAPID_PRIVATE_KEY) {
    return c.json({ error: 'Faltan las claves VAPID en el Worker' }, 500)
  }

  const vapid = {
    subject: 'mailto:soporte@example.com',
    publicKey: c.env.VAPID_PUBLIC_KEY,
    privateKey: c.env.VAPID_PRIVATE_KEY
  }

  const resultados = await Promise.all(
    lista.keys.map(async (k) => {
      const raw = await c.env.KV.get(k.name)
      if (!raw) return { clave: k.name, ok: false, error: 'la suscripción ya no está en KV' }
      const record = JSON.parse(raw) as PushSubscriptionRecord
      try {
        await enviarPush(record, vapid, {
          title: '✅ Prueba — NO es una emergencia',
          body: 'Carmen está bien. Solo comprobamos que los avisos llegan a este teléfono.',
          tag: 'prueba'
        })
        return { clave: k.name, ok: true }
      } catch (err) {
        return { clave: k.name, ok: false, error: String((err as Error)?.message || err) }
      }
    })
  )

  const enviados = resultados.filter((r) => r.ok).length
  return c.json({
    grupo,
    dispositivos: resultados.length,
    enviados,
    fallidos: resultados.filter((r) => !r.ok),
    mensaje:
      enviados > 0
        ? `${enviados} de ${resultados.length} dispositivo(s) recibieron la prueba.`
        : 'Ningún dispositivo recibió la prueba. Mira el detalle en "fallidos".'
  })
})
