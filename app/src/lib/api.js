// URL del Cloudflare Worker.
//
// El default es la URL REAL del Worker desplegado, no un placeholder ni `/api`. Antes caía a
// `/api` en el mismo origen, donde no hay ningún Worker: el hosting devolvía el index.html con un
// 200 y la app se quedaba esperando datos que nunca llegaban. Eso obligaba a configurar
// VITE_WORKER_URL en Vercel para que la app funcionara, y si a alguien se le olvidaba, fallaba en
// silencio.
//
// Con la URL aquí, la app funciona recién clonada y recién desplegada, sin configurar nada.
// VITE_WORKER_URL sigue mandando si se define — para apuntar a un Worker de pruebas o a
// http://localhost:8787 durante el desarrollo.
const BASE = import.meta.env.VITE_WORKER_URL || 'https://asistentecarmen.erictoled564.workers.dev'

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
  // Comprobación de salud para la sección de Ayuda: distingue "no hay internet / el servidor no
  // responde" de "la app está rota", que es lo primero que hay que saber cuando algo falla y no
  // hay nadie al lado para mirarlo.
  salud: () => request('/', { method: 'GET' }),
  vision: (formData) => request('/vision', { method: 'POST', body: formData }),
  audio: (formData) => request('/audio', { method: 'POST', body: formData }),
  sos: (payload) => request('/sos', { method: 'POST', body: JSON.stringify(payload) }),
  pushSubscribe: (payload) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  kbUpload: (formData) => request('/kb-upload', { method: 'POST', body: formData }),
  kbArchivos: () => request('/kb-archivos', { method: 'GET' }),
  kbArchivoSubir: (formData) => request('/kb-archivo', { method: 'POST', body: formData }),
  kbArchivoBorrar: (documentId) => request(`/kb-archivo/${documentId}`, { method: 'DELETE' }),
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
