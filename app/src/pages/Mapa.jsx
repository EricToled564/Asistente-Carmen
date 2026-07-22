import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PINES, CATEGORIAS, googleMapsDirectionsUrl, googleStreetViewUrl } from '../data/pines.js'
import PlanoEdificio from '../components/mapa/PlanoEdificio.jsx'

// Los íconos default de Leaflet dependen de assets externos que se rompen fácil con bundlers
// (y verse como un pin azul genérico de Google Maps tampoco calza con el look de la app). En vez
// de eso: un pin propio, un círculo de color con el emoji de la categoría, dibujado con divIcon
// (sin imágenes externas, cero dependencia de red para el ícono en sí).
function iconoPara(categoria) {
  const color = CATEGORIAS[categoria]?.color || '#c45a3e'
  const emoji = CATEGORIAS[categoria]?.emoji || '📍'
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,.35); border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -32]
  })
}

export default function Mapa() {
  const [filtro, setFiltro] = useState('todas')
  const [plano, setPlano] = useState(null)

  const pinesFiltrados = useMemo(
    () => (filtro === 'todas' ? PINES : PINES.filter((p) => p.categoria === filtro)),
    [filtro]
  )

  const centro = useMemo(() => {
    const campus = PINES.find((p) => p.id === 'escuela-arquitectura')
    return [campus.lat, campus.lng]
  }, [])

  if (plano) {
    return <PlanoEdificio onClose={() => setPlano(null)} />
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex gap-2 overflow-x-auto p-3 pb-2"
        style={{ maskImage: 'linear-gradient(to right, black 92%, transparent)' }}
      >
        <FiltroChip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} emoji="📍" />
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <FiltroChip key={key} label={cat.label} emoji={cat.emoji} active={filtro === key} onClick={() => setFiltro(key)} />
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <button
          onClick={() => setPlano(true)}
          className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-lavanda-800 shadow-soft"
        >
          🏛️ Mapa interior
        </button>

        <MapContainer center={centro} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pinesFiltrados.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={iconoPara(pin.categoria)}>
              <Popup>
                <div className="max-w-[220px]">
                  <p className="font-semibold">{pin.nombre}</p>
                  <p className="mt-1 text-xs text-morado-900/70">{pin.nota}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={googleMapsDirectionsUrl(pin.lat, pin.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full bg-lavanda-700 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Cómo llegar →
                    </a>
                    <a
                      href={googleStreetViewUrl(pin.lat, pin.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800"
                    >
                      👁️ Street View
                    </a>
                    {pin.id === 'escuela-arquitectura' && (
                      <button
                        onClick={() => setPlano(true)}
                        className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800"
                      >
                        🏛️ Mapa interior
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

function FiltroChip({ label, emoji, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
        active ? 'border-lavanda-700 bg-lavanda-700 text-white' : 'border-lavanda-200 bg-white text-morado-900/70'
      }`}
    >
      <span>{emoji}</span>
      {label}
    </button>
  )
}
