// Base URL of the Cloudflare Worker. Set VITE_WORKER_URL in .env (see /app/.env.example).
// Falls back to same-origin /api, which works if the Worker is mounted behind Cloudflare Pages
// Functions routing or a reverse proxy path.
const BASE = import.meta.env.VITE_WORKER_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} -> ${res.status} ${text}`)
  }
  const contentType = res.headers.get('content-type') || ''
  return contentType.includes('application/json') ? res.json() : res.text()
}

export const api = {
  vision: (formData) => request('/vision', { method: 'POST', body: formData }),
  audio: (formData) => request('/audio', { method: 'POST', body: formData }),
  sos: (payload) => request('/sos', { method: 'POST', body: JSON.stringify(payload) }),
  pushSubscribe: (payload) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  kbUpload: (formData) => request('/kb-upload', { method: 'POST', body: formData }),
  kbConfirm: (payload) => request('/kb-confirm', { method: 'POST', body: JSON.stringify(payload) }),
  emergenciaGuardar: (payload) => request('/emergency-data', { method: 'POST', body: JSON.stringify(payload) }),
  emergenciaObtener: () => request('/emergency-data', { method: 'GET' }),
  kbAnswerCatalogo: () => request('/kb-answer/catalogo', { method: 'GET' }),
  kbAnswer: (payload) => request('/kb-answer', { method: 'POST', body: JSON.stringify(payload) }),
  rutaLugares: () => request('/ruta/lugares', { method: 'GET' }),
  rutaIniciar: (payload) => request('/ruta/iniciar', { method: 'POST', body: JSON.stringify(payload) })
}
