import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PINES, CATEGORIAS, googleMapsDirectionsUrl } from '../data/pines.js'

// react-leaflet no trae los íconos por defecto correctamente empaquetados con Vite;
// se reconstruyen apuntando a los assets servidos por leaflet vía CDN de unpkg (mismo paquete,
// sin llave ni costo) para evitar el bug clásico de "íconos rotos".
const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function Mapa() {
  const [filtro, setFiltro] = useState('todas')

  const pinesFiltrados = useMemo(
    () => (filtro === 'todas' ? PINES : PINES.filter((p) => p.categoria === filtro)),
    [filtro]
  )

  const centro = useMemo(() => {
    const campus = PINES.find((p) => p.id === 'escuela-arquitectura')
    return [campus.lat, campus.lng]
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 overflow-x-auto p-3 pb-2">
        <FiltroChip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} emoji="📍" />
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <FiltroChip key={key} label={cat.label} emoji={cat.emoji} active={filtro === key} onClick={() => setFiltro(key)} />
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <MapContainer center={centro} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pinesFiltrados.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={icon}>
              <Popup>
                <div className="max-w-[220px]">
                  <p className="font-semibold">{pin.nombre}</p>
                  <p className="mt-1 text-xs text-noche-900/70">{pin.nota}</p>
                  <a
                    href={googleMapsDirectionsUrl(pin.lat, pin.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block rounded-full bg-terracota-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Cómo llegar →
                  </a>
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
        active ? 'border-terracota-600 bg-terracota-600 text-white' : 'border-terracota-200 bg-white text-noche-900/70'
      }`}
    >
      <span>{emoji}</span>
      {label}
    </button>
  )
}
