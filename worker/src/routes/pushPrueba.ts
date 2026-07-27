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
      if (!raw) return { ok: false, servicio: 'desconocido', error: 'la suscripción ya no está en KV' }
      const record = JSON.parse(raw) as PushSubscriptionRecord
      // De qué navegador/dispositivo es esta suscripción, y desde cuándo.
      //
      // El host del endpoint identifica al servicio de push: fcm.googleapis.com es Chrome (o
      // cualquier navegador basado en Chromium), updates.push.services.mozilla.com es Firefox,
      // web.push.apple.com es Safari. Sin este dato, cuando alguien dice "no me llegó" no hay
      // forma de saber si está mirando el dispositivo correcto — que es exactamente donde nos
      // quedamos atascados.
      const servicio = (() => {
        try {
          const host = new URL(record.endpoint).host
          if (host.includes('fcm.googleapis') || host.includes('android')) return `Chrome/Android (${host})`
          if (host.includes('mozilla')) return `Firefox (${host})`
          if (host.includes('apple')) return `Safari/iOS (${host})`
          return host
        } catch {
          return 'endpoint ilegible'
        }
      })()
      try {
        // Un `tag` distinto en cada envío, a propósito.
        //
        // El navegador usa el tag para AGRUPAR: una notificación nueva con el mismo tag reemplaza
        // a la anterior en silencio, sin volver a sonar ni vibrar. Con un tag fijo, mandar tres
        // pruebas seguidas puede verse exactamente igual que no mandar ninguna — que es
        // justamente la duda que esto tiene que resolver.
        //
        // En el SOS real sí conviene un tag fijo ("sos"): ahí agrupar es lo correcto, porque no
        // quieres inundar la pantalla de la familia con veinte avisos del mismo incidente.
        const marca = new Date().toISOString().slice(11, 19)
        await enviarPush(record, vapid, {
          title: `✅ Prueba de las ${marca} — NO es una emergencia`,
          body: 'Carmen está bien. Solo comprobamos que los avisos llegan a este teléfono.',
          tag: `prueba-${Date.now()}`
        })
        return { ok: true, servicio, suscritoEl: record.guardadoEn }
      } catch (err) {
        const mensaje = String((err as Error)?.message || err)
        // Una suscripción que falla por clave inválida o porque el navegador la revocó (404/410
        // del servicio de push) no va a funcionar nunca más: se borra en vez de dejarla ahí
        // inflando la cuenta de "dispositivos suscritos". Esa cuenta es la que hace que /estado
        // diga que el canal de emergencia está listo, así que un registro muerto ahí dentro es
        // peor que no tener ninguno — da una seguridad falsa.
        const irrecuperable = /not on curve|Invalid EC key|410|404|expired|unsubscribed/i.test(mensaje)
        if (irrecuperable) await c.env.KV.delete(k.name)
        return { ok: false, servicio, suscritoEl: record.guardadoEn, error: mensaje, borrada: irrecuperable }
      }
    })
  )

  const enviados = resultados.filter((r) => r.ok).length
  return c.json({
    grupo,
    dispositivos: resultados.length,
    enviados,
    // Se devuelven TODOS, no solo los fallidos: cuando alguien dice "no me llegó", saber a qué
    // navegador y desde cuándo está suscrito es lo que distingue "está roto" de "estás mirando el
    // dispositivo equivocado".
    detalle: resultados,
    fallidos: resultados.filter((r) => !r.ok),
    mensaje:
      enviados > 0
        ? `${enviados} de ${resultados.length} dispositivo(s) recibieron la prueba.`
        : 'Ningún dispositivo recibió la prueba. Mira el detalle en "fallidos".'
  })
})
