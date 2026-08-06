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
// El `?.` no es paranoia: `import.meta.env` solo existe cuando compila Vite. Sin él, este módulo
// no se puede importar desde node, y eso deja fuera de las pruebas todo lo que dependa de la api —
// que es justamente lo que hay que probar contra las respuestas reales del servidor.
const BASE = import.meta.env?.VITE_WORKER_URL || 'https://asistentecarmen.erictoled564.workers.dev'

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
  // La materia elegida antes de lanzar el Atajo de grabar. Va por HTTP normal porque pasarla como
  // Entrada de atajo en la URL shortcuts:// llegó vacía en el teléfono real (ver routes/audio.ts).
  audioProximaMateria: (materia) =>
    request('/audio/proxima-materia', { method: 'POST', body: JSON.stringify({ materia }) }),
  audioProximaMateriaBorrar: () => request('/audio/proxima-materia', { method: 'DELETE' }),
  sos: (payload) => request('/sos', { method: 'POST', body: JSON.stringify(payload) }),
  pushSubscribe: (payload) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(payload) }),
  kbUpload: (formData) => request('/kb-upload', { method: 'POST', body: formData }),
  kbArchivos: () => request('/kb-archivos', { method: 'GET' }),
  tramitesListar: () => request('/tramites', { method: 'GET' }),
  calificacionesListar: () => request('/calificaciones', { method: 'GET' }),
  calificacionesSemestres: () => request('/calificaciones/semestres', { method: 'GET' }),
  calificacionesPreparar: (payload) => request('/calificaciones/preparar', { method: 'POST', body: JSON.stringify(payload) }),
  calificacionesConfirmarSemestre: (payload) =>
    request('/calificaciones/confirmar-semestre', { method: 'POST', body: JSON.stringify(payload) }),
  calificacionesCerrarSemestre: (payload) =>
    request('/calificaciones/cerrar-semestre', { method: 'POST', body: JSON.stringify(payload) }),
  calificacionesCerrados: () => request('/calificaciones/cerrados', { method: 'GET' }),
  calificacionGuardar: (payload) => request('/calificaciones', { method: 'POST', body: JSON.stringify(payload) }),
  calificacionBorrar: (kbCode, componenteId) =>
    request(`/calificaciones/${encodeURIComponent(kbCode)}/${encodeURIComponent(componenteId)}`, { method: 'DELETE' }),
  tramiteAgendar: (id, cita) => request(`/tramites/${id}/agendar`, { method: 'POST', body: JSON.stringify(cita) }),
  tramiteQuitarCita: (id) => request(`/tramites/${id}/cita`, { method: 'DELETE' }),
  tramiteCompletar: (id) => request(`/tramites/${id}/completar`, { method: 'POST' }),
  tramiteReabrir: (id) => request(`/tramites/${id}/reabrir`, { method: 'POST' }),
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
  // El horario tal como lo publica la universidad, traído del portal por el Worker.
  horarioOficial: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)).toString()
    return request(`/horario/oficial${q ? `?${q}` : ''}`, { method: 'GET' })
  },
  horarioFijarCurso: (curso) => request('/horario/curso', { method: 'POST', body: JSON.stringify({ curso }) }),
  // El bloque en el que Carmen está ({curso, semestre}) — fijado al preparar un semestre.
  semestreActual: () => request('/semestre-actual', { method: 'GET' }),
  calificacionesSincronizarHorario: (payload) =>
    request('/calificaciones/sincronizar-horario', { method: 'POST', body: JSON.stringify(payload) }),
  fechasListar: () => request('/fechas', { method: 'GET' }),
  fechaGuardar: (payload) => request('/fechas', { method: 'POST', body: JSON.stringify(payload) }),
  fechaBorrar: (id) => request(`/fechas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  fechaMarcar: (id, hecha) =>
    request(`/fechas/${encodeURIComponent(id)}/hecha`, { method: 'POST', body: JSON.stringify({ hecha }) }),
  fechasRestaurar: () => request('/fechas/restaurar', { method: 'POST' }),
  notasListar: () => request('/notas', { method: 'GET' }),
  notaGuardar: (payload) => request('/notas', { method: 'POST', body: JSON.stringify(payload) }),
  notaBorrar: (id) => request(`/notas/${id}`, { method: 'DELETE' }),
  notaExtraerDeFoto: (formData) => request('/notas/extraer', { method: 'POST', body: formData }),
  // La memoria de Maite normalmente la llama ElevenLabs, no la app. Se expone aquí solo para el
  // autodiagnóstico: es la forma de comprobar, desde el teléfono de Carmen, que el almacén de
  // recuerdos está en pie antes de que ella descubra que Maite se ha quedado en blanco.
  memoriaRecuperar: (payload = { query: '', limite: 1 }) =>
    request('/memory/retrieve', { method: 'POST', body: JSON.stringify(payload) }),
  apuntesListar: (materia) => request(`/apuntes${materia ? `?materia=${encodeURIComponent(materia)}` : ''}`, { method: 'GET' }),
  apunteObtener: (id) => request(`/apuntes/${id}`, { method: 'GET' }),
  apunteGuardar: (payload) => request('/apuntes', { method: 'POST', body: JSON.stringify(payload) }),
  apunteBorrar: (id) => request(`/apuntes/${id}`, { method: 'DELETE' })
}
