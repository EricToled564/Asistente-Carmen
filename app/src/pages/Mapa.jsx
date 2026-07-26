import { useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PINES, CATEGORIAS, googleMapsDirectionsUrl, googleMapsDirectionsDesdeUbicacionUrl, googleStreetViewUrl } from '../data/pines.js'
import PlanoEdificio from '../components/mapa/PlanoEdificio.jsx'
import RutaInterior from '../components/mapa/RutaInterior.jsx'
import { getCurrentPosition } from '../hooks/useGeolocation.js'
import { APPS_TRANSPORTE } from '../data/appsTransporte.js'

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
  const [mostrarRuta, setMostrarRuta] = useState(false)
  const [destinoPrellenado, setDestinoPrellenado] = useState('')
  const [mostrarLista, setMostrarLista] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [buscandoUbicacionPara, setBuscandoUbicacionPara] = useState(null)
  const mapRef = useRef(null)
  const marcadoresRef = useRef({})

  // "Ilumínalo en el mapa": centra el mapa en ese pin y abre su popup, como si lo hubieras
  // tocado directo — para que el menú/lista y el mapa se sientan conectados, no como dos cosas
  // separadas.
  function enfocarPin(pin) {
    setMostrarLista(false)
    mapRef.current?.flyTo([pin.lat, pin.lng], 17, { duration: 0.6 })
    setTimeout(() => marcadoresRef.current[pin.id]?.openPopup(), 350)
  }

  // GPS real del navegador (no el posicionamiento indoor, que sí es inviable — este es
  // outdoor, punto A → punto B en la ciudad, donde el GPS funciona normal). Si lo niega o falla,
  // cae a abrir el link sin origen: Google Maps igual pregunta la ubicación por su cuenta.
  async function irDesdeMiUbicacion(pin) {
    setBuscandoUbicacionPara(pin.id)
    const posicion = await getCurrentPosition()
    setBuscandoUbicacionPara(null)
    const url = posicion.ok
      ? googleMapsDirectionsDesdeUbicacionUrl(posicion.lat, posicion.lng, pin.lat, pin.lng)
      : googleMapsDirectionsUrl(pin.lat, pin.lng)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const pinesFiltrados = useMemo(
    () => (filtro === 'todas' ? PINES : PINES.filter((p) => p.categoria === filtro)),
    [filtro]
  )

  const centro = useMemo(() => {
    const campus = PINES.find((p) => p.id === 'escuela-arquitectura')
    return [campus.lat, campus.lng]
  }, [])

  if (plano) {
    return (
      <PlanoEdificio
        onClose={() => setPlano(null)}
        // El lugar que ya eligió en el plano llega prellenado como destino de la ruta — no tiene
        // sentido hacerla buscarlo otra vez en un select.
        onIrARuta={(destinoId) => {
          setPlano(null)
          setDestinoPrellenado(destinoId || '')
          setMostrarRuta(true)
        }}
      />
    )
  }

  if (mostrarRuta) {
    return (
      <RutaInterior
        destinoInicial={destinoPrellenado}
        onClose={() => {
          setMostrarRuta(false)
          setDestinoPrellenado('')
        }}
      />
    )
  }

  const categoriaActiva = filtro === 'todas' ? null : CATEGORIAS[filtro]

  return (
    <div className="flex h-full flex-col">
      {/* Filtro colapsable: en móvil una fila de chips con scroll horizontal se maneja mal
          (hay que arrastrar a ciegas para ver las categorías de la derecha). Colapsado ocupa una
          sola línea y al abrirlo se ven todas de golpe. */}
      <div className="p-3 pb-2">
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-soft"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-morado-900">
            <span>{categoriaActiva ? categoriaActiva.emoji : '📍'}</span>
            {categoriaActiva ? categoriaActiva.label : 'Todas las categorías'}
            <span className="text-xs font-normal text-morado-900/40">({pinesFiltrados.length})</span>
          </span>
          <span className={`text-lavanda-700 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`}>⌄</span>
        </button>

        {filtrosAbiertos && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-soft">
            <FiltroChip
              label="Todas"
              emoji="📍"
              active={filtro === 'todas'}
              onClick={() => {
                setFiltro('todas')
                setFiltrosAbiertos(false)
              }}
            />
            {Object.entries(CATEGORIAS).map(([key, cat]) => (
              <FiltroChip
                key={key}
                label={cat.label}
                emoji={cat.emoji}
                active={filtro === key}
                onClick={() => {
                  setFiltro(key)
                  setFiltrosAbiertos(false)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {filtro === 'transporte' && <AppsTransporte />}

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
          <button
            onClick={() => setMostrarLista((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-lavanda-800 shadow-soft"
          >
            {mostrarLista ? '🗺️ Ver mapa' : '📋 Todos los lugares'}
          </button>
          <button
            onClick={() => setPlano(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-lavanda-800 shadow-soft"
          >
            🏛️ Mapa interior
          </button>
          <button
            onClick={() => setMostrarRuta(true)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-lavanda-800 shadow-soft"
          >
            🧭 ¿Cómo llego?
          </button>
        </div>

        {mostrarLista && (
          <div className="absolute inset-0 z-[900] flex flex-col gap-2 overflow-y-auto bg-lavanda-50/98 p-4 pt-16">
            {pinesFiltrados.map((pin) => (
              <button
                key={pin.id}
                onClick={() => enfocarPin(pin)}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-soft active:scale-[0.98]"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{ background: `${CATEGORIAS[pin.categoria]?.color || '#7C4DBC'}22` }}
                >
                  {CATEGORIAS[pin.categoria]?.emoji || '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-morado-900">{pin.nombre}</p>
                  <p className="truncate text-xs text-morado-900/60">{pin.nota}</p>
                </div>
                <span className="text-lavanda-700">→</span>
              </button>
            ))}
          </div>
        )}

        <MapContainer ref={mapRef} center={centro} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pinesFiltrados.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={iconoPara(pin.categoria)}
              ref={(marcador) => {
                if (marcador) marcadoresRef.current[pin.id] = marcador
              }}
            >
              <Popup>
                <div className="max-w-[220px]">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ background: `${CATEGORIAS[pin.categoria]?.color || '#7C4DBC'}22` }}
                    >
                      {CATEGORIAS[pin.categoria]?.emoji || '📍'}
                    </span>
                    <div>
                      <p className="font-semibold leading-snug">{pin.nombre}</p>
                      <p className="mt-0.5 text-xs text-morado-900/70">{pin.nota}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <a
                      href={googleMapsDirectionsUrl(pin.lat, pin.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full bg-lavanda-700 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Cómo llegar →
                    </a>
                    <button
                      onClick={() => irDesdeMiUbicacion(pin)}
                      disabled={buscandoUbicacionPara === pin.id}
                      className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800 disabled:opacity-60"
                    >
                      {buscandoUbicacionPara === pin.id ? 'Ubicándote…' : '📍 Desde donde estoy'}
                    </button>
                    <a
                      href={googleStreetViewUrl(pin.lat, pin.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800"
                    >
                      👁️ Street View
                    </a>
                    {pin.id === 'escuela-arquitectura' && (
                      <>
                        <button
                          onClick={() => setPlano(true)}
                          className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800"
                        >
                          🏛️ Mapa interior
                        </button>
                        <button
                          onClick={() => setMostrarRuta(true)}
                          className="inline-block rounded-full bg-lavanda-50 px-3 py-1 text-xs font-semibold text-lavanda-800"
                        >
                          🧭 ¿Cómo llego?
                        </button>
                      </>
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

function AppsTransporte() {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {APPS_TRANSPORTE.map((app) => (
        <div key={app.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavanda-100 text-xl">
            {app.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-morado-900">{app.nombre}</p>
            <p className="text-xs text-morado-900/60">{app.descripcion}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <a href={app.ios} target="_blank" rel="noreferrer" className="rounded-full bg-lavanda-50 px-2.5 py-1 text-center text-[11px] font-semibold text-lavanda-800">
              iOS
            </a>
            <a href={app.android} target="_blank" rel="noreferrer" className="rounded-full bg-lavanda-50 px-2.5 py-1 text-center text-[11px] font-semibold text-lavanda-800">
              Android
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function FiltroChip({ label, emoji, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-transform active:scale-95 ${
        active ? 'bg-gradient-to-r from-lavanda-700 to-lavanda-600 text-white' : 'bg-lavanda-50 text-morado-900/70'
      }`}
    >
      <span>{emoji}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
