import { useState } from 'react'
import { getCurrentPosition } from '../../hooks/useGeolocation.js'
import { guardarMiLugar, nombreAproximado } from '../../data/misLugares.js'

// "Guardar este lugar": un botón, el GPS hace el resto.
//
// Carmen está en un sitio que le gustó y quiere volver: toca el botón, la app toma sus
// coordenadas reales, intenta averiguar el nombre del sitio por ella (reverse geocoding con
// OpenStreetMap), y ella solo confirma o corrige el nombre. Nada de escribir direcciones.
export default function GuardarLugar({ onGuardado, onCerrar }) {
  const [paso, setPaso] = useState('inicio') // inicio | ubicando | formulario | error
  const [coords, setCoords] = useState(null)
  const [nombre, setNombre] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  async function capturarUbicacion() {
    setPaso('ubicando')
    setError('')
    const posicion = await getCurrentPosition()
    if (!posicion.ok) {
      setError(
        posicion.reason === 'denied'
          ? 'Necesito permiso de ubicación para guardar dónde estás. Actívalo en los ajustes del navegador.'
          : 'Tu dispositivo no me dio la ubicación. Intenta de nuevo.'
      )
      setPaso('error')
      return
    }
    setCoords({ lat: posicion.lat, lng: posicion.lng })
    // Sugerencia de nombre — si falla, simplemente queda vacío y ella lo escribe
    const sugerido = await nombreAproximado(posicion.lat, posicion.lng)
    setNombre(sugerido)
    setPaso('formulario')
  }

  function guardar() {
    if (!nombre.trim() || !coords) return
    const guardado = guardarMiLugar({
      nombre: nombre.trim(),
      nota: nota.trim(),
      lat: coords.lat,
      lng: coords.lng,
      categoria: 'mios'
    })
    onGuardado?.(guardado)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-melocoton-300 text-lg">⭐</span>
          <p className="font-display text-lg font-bold text-morado-900">Guardar este lugar</p>
        </div>
        <button onClick={onCerrar} className="text-2xl leading-none text-morado-900/60" aria-label="Cerrar">
          ×
        </button>
      </div>

      {paso === 'inicio' && (
        <div className="rounded-3xl bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-morado-900/70">
            ¿Estás en un sitio que te gustó y quieres volver? Toca el botón y lo guardo con tu ubicación exacta —
            solo tendrás que ponerle nombre.
          </p>
          <button
            onClick={capturarUbicacion}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]"
          >
            📍 Estoy aquí — guárdalo
          </button>
        </div>
      )}

      {paso === 'ubicando' && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft">
          <p className="text-3xl">📡</p>
          <p className="mt-2 text-sm text-morado-900/70">Tomando tu ubicación…</p>
        </div>
      )}

      {paso === 'error' && (
        <div className="rounded-3xl bg-red-50 p-5 shadow-soft">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={capturarUbicacion}
            className="mt-3 w-full rounded-full bg-lavanda-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {paso === 'formulario' && (
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-soft">
          <p className="text-xs text-morado-900/50">
            Ubicación tomada ✓ {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-morado-900">¿Cómo se llama?</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. El Labrador"
              className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-morado-900"
            />
            {nombre && <span className="text-[11px] text-morado-900/45">Te lo sugerí yo — cámbialo si no es así.</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-morado-900">Una nota (opcional)</span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. pintxos baratos, buen ambiente los jueves"
              className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-morado-900"
            />
          </label>
          <button
            onClick={guardar}
            disabled={!nombre.trim()}
            className="rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Guardar en mi mapa
          </button>
        </div>
      )}
    </div>
  )
}
