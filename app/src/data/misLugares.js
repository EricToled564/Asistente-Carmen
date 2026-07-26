import { readJSON, writeJSON } from '../lib/storage.js'

// Lugares que Carmen guarda ella misma: "estoy en un sitio que me gustó, guárdalo".
//
// Viven en localStorage, no en el Worker: son suyos, no hace falta que pasen por un servidor ni
// que el agente los conozca. Si algún día quiere verlos desde otro dispositivo, habría que
// moverlos a KV — hoy no vale la pena la complejidad.
const CLAVE = 'misLugares'

export function listarMisLugares() {
  return readJSON(CLAVE, [])
}

export function guardarMiLugar(lugar) {
  const lista = listarMisLugares()
  const nuevo = { ...lugar, id: `mio-${Date.now()}`, guardadoEn: new Date().toISOString() }
  writeJSON(CLAVE, [...lista, nuevo])
  return nuevo
}

export function borrarMiLugar(id) {
  writeJSON(
    CLAVE,
    listarMisLugares().filter((l) => l.id !== id)
  )
}

// Nombre aproximado del sitio a partir de las coordenadas (reverse geocoding).
//
// Se usa Nominatim (OpenStreetMap): gratis y sin API key, igual que los mapas que ya usamos.
// La alternativa de Google requiere una API key con facturación activada — no vale la pena
// meter eso solo para sugerir un nombre que ella puede corregir de todos modos.
//
// Nominatim pide no abusar de su servicio público (1 petición por segundo máx). Aquí se llama
// solo cuando ella toca el botón de guardar, así que no hay riesgo de saturarlo.
export async function nombreAproximado(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return ''
    const data = await res.json()
    const a = data.address || {}
    // Preferir el nombre del negocio/lugar si Nominatim lo tiene; si no, la calle.
    return (
      data.name ||
      a.amenity ||
      a.shop ||
      a.leisure ||
      [a.road, a.house_number].filter(Boolean).join(' ') ||
      data.display_name?.split(',')[0] ||
      ''
    )
  } catch {
    return '' // sin conexión o servicio caído: ella escribe el nombre a mano y ya
  }
}
