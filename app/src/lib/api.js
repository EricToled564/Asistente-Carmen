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

  // Si no vuelve JSON, es un error aunque el status sea 200.
  //
  // Todos los endpoints del Worker responden con c.json(), sin excepción. Cuando VITE_WORKER_URL
  // no está configurada, las llamadas caen al mismo origen (/api/...) y ahí NO hay Worker: el
  // hosting devuelve el index.html de la app con un 200 tan campante. Antes eso se devolvía como
  // texto, la pantalla hacía `datos.apuntes` sobre un string, sacaba undefined, y se quedaba en
  // "Cargando…" para siempre — sin error, sin nada que le dijera a Carmen que algo va mal.
  //
  // Fallar aquí convierte ese cuelgue silencioso en un error que cada pantalla ya sabe mostrar.
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      `${path} -> respondió ${contentType || 'sin content-type'} en vez de JSON. ` +
        'Lo más probable es que VITE_WORKER_URL no apunte al Worker.'
    )
  }
  return res.json()
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
  rutaIniciar: (payload) => request('/ruta/iniciar', { method: 'POST', body: JSON.stringify(payload) }),
  horarioObtener: () => request('/horario', { method: 'GET' }),
  notasListar: () => request('/notas', { method: 'GET' }),
  notaGuardar: (payload) => request('/notas', { method: 'POST', body: JSON.stringify(payload) }),
  notaBorrar: (id) => request(`/notas/${id}`, { method: 'DELETE' }),
  notaExtraerDeFoto: (formData) => request('/notas/extraer', { method: 'POST', body: formData }),
  apuntesListar: (materia) => request(`/apuntes${materia ? `?materia=${encodeURIComponent(materia)}` : ''}`, { method: 'GET' }),
  apunteObtener: (id) => request(`/apuntes/${id}`, { method: 'GET' }),
  apunteGuardar: (payload) => request('/apuntes', { method: 'POST', body: JSON.stringify(payload) }),
  apunteBorrar: (id) => request(`/apuntes/${id}`, { method: 'DELETE' })
}
