import { Hono } from 'hono'
import type { Env } from '../types.js'

export const estado = new Hono<{ Bindings: Env }>()

// GET /estado — qué está configurado y qué no.
//
// Existe porque diagnosticar esto a ciegas cuesta horas: cada función que falla por falta de una
// key falla con un mensaje genérico ("No pude procesar el audio"), idéntico al que daría un fallo
// real. Había que ir probando endpoint por endpoint y deducir. Esto lo contesta de una.
//
// NUNCA devuelve el valor de un secreto, solo si está puesto o no. La URL es pública, así que lo
// único que se expone es "a este Worker le falta configurar X" — que es precisamente el problema
// que sirve para arreglar, y no le da acceso a nadie a nada.

function puesto(v: string | undefined): boolean {
  return Boolean(v && v.trim() && !v.startsWith('REEMPLAZA'))
}

estado.get('/estado', async (c) => {
  const e = c.env

  // Cuántos dispositivos hay suscritos a notificaciones. Es la otra mitad de por qué el push
  // puede no enviar nada: aunque las claves VAPID estén bien, sin nadie suscrito no hay a quién
  // avisar — y las dos situaciones se ven igual desde fuera.
  const suscripciones = await e.KV.list({ prefix: 'push:familia:' })
  const docsKb = await e.KV.list({ prefix: 'kb-doc-id:' })

  const secretos = {
    ANTHROPIC_API_KEY: puesto(e.ANTHROPIC_API_KEY),
    ELEVENLABS_API_KEY: puesto(e.ELEVENLABS_API_KEY),
    ELEVENLABS_AGENT_ID: puesto(e.ELEVENLABS_AGENT_ID),
    VAPID_PUBLIC_KEY: puesto(e.VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: puesto(e.VAPID_PRIVATE_KEY),
    RESEND_API_KEY: puesto(e.RESEND_API_KEY),
    TELEGRAM_BOT_TOKEN: puesto(e.TELEGRAM_BOT_TOKEN),
    FAMILIA_EMAIL_DESTINO: puesto(e.FAMILIA_EMAIL_DESTINO),
    RESIDENCIA_DIRECCION: puesto(e.RESIDENCIA_DIRECCION)
  }

  // Qué puede hacer la app ahora mismo, en términos de lo que Carmen usaría — no de variables.
  const funciones = {
    'Maite (8 webhooks)': true, // solo usan KV, siempre disponibles
    'Foto → información': secretos.ANTHROPIC_API_KEY,
    'Grabar clase / captura de audio': secretos.ELEVENLABS_API_KEY && secretos.ANTHROPIC_API_KEY,
    'Actualizar el KB desde la app': secretos.ELEVENLABS_API_KEY && docsKb.keys.length > 0,
    'SOS por email': secretos.RESEND_API_KEY && secretos.FAMILIA_EMAIL_DESTINO,
    'SOS por notificación': secretos.VAPID_PUBLIC_KEY && secretos.VAPID_PRIVATE_KEY && suscripciones.keys.length > 0,
    'Bot de Telegram': secretos.TELEGRAM_BOT_TOKEN
  }

  return c.json({
    secretos,
    documentosKbRegistrados: docsKb.keys.length,
    dispositivosSuscritosAPush: suscripciones.keys.length,
    funciones,
    pendientes: Object.entries(funciones)
      .filter(([, ok]) => !ok)
      .map(([nombre]) => nombre)
  })
})
