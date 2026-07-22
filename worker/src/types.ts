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
  KB_DOC_ID_HORARIO: string
  KB_DOC_ID_TRAMITE: string
  KB_DOC_ID_OTRO: string
  KB_DOC_ID_GRADO_DISENO: string
  KB_DOC_ID_ING_DISENO: string
  KB_DOC_ID_ALOJAMIENTO: string
  KB_DOC_ID_CAMPUS: string
  KB_DOC_ID_MOVILIDAD: string
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
