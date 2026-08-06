import { api } from './api.js'
import { materiasDelSemestre } from '../data/indiceAcademico.js'

// El bloque (curso + semestre) en el que Carmen ESTÁ, según el servidor — fijado al preparar un
// semestre, no deducido del calendario. Todas las pantallas que dependen del semestre (horario,
// calificaciones, tips, selector al grabar) leen ESTO, para que "preparé el semestre 2" cambie la
// app entera de una vez y no cada pantalla por su cuenta.
//
// Con cache en localStorage: la primera pantalla que lo pide paga la llamada; las demás lo leen al
// instante, y sin conexión se usa lo último sabido. Caduca a los 10 minutos para que un cambio de
// semestre se note sin reinstalar nada.

const CLAVE = 'maite.semestreActual'
const TTL_MS = 10 * 60 * 1000

function deCache() {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d?.curso ? d : null
  } catch {
    return null
  }
}

function aCache(d) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...d, guardadoEn: Date.now() }))
  } catch {
    /* sin cache no pasa nada */
  }
}

function delCalendario() {
  const mes = new Date().getMonth() + 1
  return { curso: 1, semestre: mes >= 8 ? 1 : 2, origen: 'calendario-local' }
}

export async function obtenerBloqueActual() {
  const cacheado = deCache()
  if (cacheado && Date.now() - cacheado.guardadoEn < TTL_MS) return cacheado
  try {
    const d = await api.semestreActual()
    aCache(d)
    return d
  } catch {
    // Sin red: lo último sabido aunque esté caducado; y si nunca hubo nada, el calendario.
    return cacheado || delCalendario()
  }
}

// Versión síncrona para estados iniciales de React (no puede esperar una promesa): lo último
// sabido o el calendario. El efecto que llama a obtenerBloqueActual() corrige después si difiere.
export function bloqueSabido() {
  return deCache() || delCalendario()
}

// Tirar la caché — lo llama Preparar semestre al terminar, para que el cambio se note en la app
// entera al momento y no cuando caduquen los 10 minutos.
export function invalidarBloque() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* nada */
  }
}

export function materiasDelBloque(bloque) {
  return materiasDelSemestre(new Date(), bloque)
}
