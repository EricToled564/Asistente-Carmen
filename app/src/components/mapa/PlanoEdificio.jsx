import { useRef, useState } from 'react'

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_PASO = 0.5

// Visor simple de plano estático (sin GPS en interiores — el GPS no es confiable dentro de
// edificios sin infraestructura propia del edificio, beacons BLE, etc). Zoom con botones +/- y
// pan arrastrando, en vez de pinch-zoom nativo (el viewport de la PWA lo desactiva globalmente
// con maximum-scale=1 para que se sienta como app, no como página web).
export default function PlanoEdificio({ src, alt, onClose }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState(false)
  const arrastrando = useRef(null)

  function onPointerDown(e) {
    arrastrando.current = { startX: e.clientX - offset.x, startY: e.clientY - offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!arrastrando.current) return
    setOffset({ x: e.clientX - arrastrando.current.startX, y: e.clientY - arrastrando.current.startY })
  }

  function onPointerUp() {
    arrastrando.current = null
  }

  function acercar() {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_PASO))
  }
  function alejar() {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, z - ZOOM_PASO)
      if (next === ZOOM_MIN) setOffset({ x: 0, y: 0 })
      return next
    })
  }

  return (
    <div className="flex h-full flex-col bg-morado-950">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-2xl leading-none text-crema-50" aria-label="Cerrar">
          ←
        </button>
        <p className="text-sm font-medium text-crema-50/80">{alt}</p>
        <div className="w-8" />
      </div>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="font-semibold text-crema-50">Todavía no hay un plano cargado</p>
          <p className="max-w-xs text-sm text-crema-100/70">
            Falta el archivo <code className="rounded bg-white/10 px-1">app/public/planos/escuela-arquitectura.jpg</code>.
            Ver <code className="rounded bg-white/10 px-1">app/public/planos/README.md</code>.
          </p>
        </div>
      ) : (
        <div
          className="flex-1 touch-none overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            src={src}
            alt={alt}
            onError={() => setError(true)}
            draggable={false}
            className="h-full w-full origin-center select-none object-contain"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: arrastrando.current ? 'none' : 'transform 120ms' }}
          />
        </div>
      )}

      {!error && (
        <div className="flex items-center justify-center gap-4 p-4">
          <button
            onClick={alejar}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-crema-50"
          >
            −
          </button>
          <span className="w-12 text-center text-sm text-crema-100/70">{Math.round(zoom * 100)}%</span>
          <button
            onClick={acercar}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-crema-50"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
