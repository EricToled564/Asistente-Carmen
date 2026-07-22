export interface Env {
  KV: KVNamespace

  // secrets (wrangler secret put ...)
  ANTHROPIC_API_KEY: string
  ELEVENLABS_API_KEY: string
  ELEVENLABS_AGENT_ID: string
  TELEGRAM_BOT_TOKEN: string
  RESEND_API_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string

  // vars (wrangler.toml [vars])
  FAMILIA_EMAIL_DESTINO: string
  RESIDENCIA_DIRECCION: string
  // Los document_id del KB ya NO viven en env vars — ver lib/kbRegistry.ts (registro en KV,
  // uno por código KB1/KB3/KB8/etc, escalable a los 27+ documentos y a los que se agreguen).
}

export interface PushSubscriptionRecord {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
  grupo?: 'ella' | 'familia'
  guardadoEn: string
}

// Datos de emergencia: viven SOLO en KV bajo la key 'emergencia:datos', separados por completo
// del Knowledge Base — Maite nunca los ve, solo los lee el módulo SOS/modo emergencia.
export interface DatosEmergencia {
  nombreLegal: string
  tipoSangre: string // '' o 'no proporcionado' si no la dio — nunca bloqueante
  actualizadoEn: string
}
