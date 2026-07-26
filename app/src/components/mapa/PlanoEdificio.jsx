import { useMemo, useState } from 'react'
import { PLANTAS_INFO, LUGARES, ESTILO_TIPO, lugaresDePlanta } from '../../data/edificio.js'

// Plano interior dibujado con nuestro propio código (ver data/edificio.js sobre por qué se
// abandonó el embed de Google My Maps: su selector de plantas no respondía dentro del iframe y
// era imposible arreglarlo desde fuera por la política de mismo-origen del navegador).
//
// El plano es esquemático: el edificio es una nave alargada con un pasillo central y salas a
// ambos lados, así que se dibuja exactamente así — norte arriba, sur abajo, oeste a la izquierda.
// Cada sala es un botón real de React, así que seleccionar una planta o tocar una sala SIEMPRE
// responde: es código nuestro, no contenido de terceros.
export default function PlanoEdificio({ onClose, onIrARuta }) {
  const [planta, setPlanta] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const lugares = useMemo(() => lugaresDePlanta(planta), [planta])
  const norte = lugares.filter((l) => l.lado === 'norte')
  const sur = lugares.filter((l) => l.lado === 'sur')
  const conectores = lugares.filter((l) => !l.lado)

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return []
    return LUGARES.filter(
      (l) => l.nombre.toLowerCase().includes(q) || (l.salas || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [busqueda])

  function irALugar(lugar) {
    setPlanta(lugar.planta)
    setSeleccionado(lugar)
    setBusqueda('')
  }

  return (
    <div className="flex h-full flex-col bg-lavanda-50">
      <div className="flex items-center justify-between bg-gradient-to-b from-morado-800 to-morado-900 px-4 py-3">
        <button onClick={onClose} className="text-2xl leading-none text-crema-50" aria-label="Cerrar">
          ←
        </button>
        <p className="text-sm font-semibold text-crema-50">🏛️ Plano interior — Arquitectura</p>
        <div className="w-8" />
      </div>

      {/* Buscador: escribir el nombre o número de sala salta directo a esa planta */}
      <div className="bg-morado-900 px-4 pb-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar aula, sala o servicio…"
          className="w-full rounded-full bg-white/10 px-4 py-2 text-sm text-crema-50 placeholder-crema-100/40 outline-none focus:bg-white/20"
        />
        {resultados.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl bg-white p-2 shadow-soft">
            {resultados.map((l) => (
              <button
                key={l.id}
                onClick={() => irALugar(l)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm active:bg-lavanda-50"
              >
                <span>{ESTILO_TIPO[l.tipo].emoji}</span>
                <span className="flex-1 truncate text-morado-900">{l.nombre}</span>
                <span className="shrink-0 text-xs text-morado-900/40">Planta {l.planta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de plantas — botones propios, siempre responden */}
      <div className="flex gap-2 px-4 py-3">
        {PLANTAS_INFO.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPlanta(p.id)
              setSeleccionado(null)
            }}
            className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold shadow-soft transition-transform active:scale-95 ${
              planta === p.id ? 'bg-gradient-to-r from-lavanda-700 to-lavanda-600 text-white' : 'bg-white text-morado-900/70'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <p className="px-4 pb-2 text-xs text-morado-900/50">
        {PLANTAS_INFO.find((p) => p.id === planta)?.descripcion}
      </p>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="rounded-3xl bg-white p-3 shadow-soft">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-morado-900/30">
            Norte · lado del río
          </p>

          <FilaDeSalas lugares={norte} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />

          {/* El pasillo central, con las escaleras/ascensor que caen sobre su eje */}
          <div className="my-2 flex items-center gap-1.5 rounded-xl bg-crema-200 px-2 py-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-morado-900/40">O</span>
            <div className="flex flex-1 items-center justify-around gap-1">
              {conectores.length === 0 ? (
                <span className="text-[11px] text-morado-900/40">Pasillo</span>
              ) : (
                conectores.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSeleccionado(l)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-transform active:scale-95 ${
                      seleccionado?.id === l.id ? 'ring-2 ring-lavanda-700' : ''
                    }`}
                    style={{ background: ESTILO_TIPO[l.tipo].fondo, color: ESTILO_TIPO[l.tipo].color }}
                  >
                    {ESTILO_TIPO[l.tipo].emoji} {l.nombre}
                  </button>
                ))
              )}
            </div>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-morado-900/40">E</span>
          </div>

          <FilaDeSalas lugares={sur} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-morado-900/30">
            Sur
          </p>
        </div>

        {seleccionado && (
          <div className="mt-3 rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
                style={{ background: ESTILO_TIPO[seleccionado.tipo].fondo }}
              >
                {ESTILO_TIPO[seleccionado.tipo].emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-morado-900">{seleccionado.nombre}</p>
                <p className="text-xs text-morado-900/50">
                  Planta {seleccionado.planta}
                  {seleccionado.lado ? ` · lado ${seleccionado.lado}` : ' · sobre el pasillo'}
                </p>
                {seleccionado.salas && <p className="mt-1 text-xs text-morado-900/60">Salas: {seleccionado.salas}</p>}
                {seleccionado.nota && <p className="mt-1 text-xs text-morado-900/60">{seleccionado.nota}</p>}
              </div>
            </div>
            {onIrARuta && (
              <button
                onClick={onIrARuta}
                className="mt-3 w-full rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
              >
                🧭 Guíame hasta aquí
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FilaDeSalas({ lugares, seleccionado, onSeleccionar }) {
  if (lugares.length === 0) {
    return <div className="rounded-xl border border-dashed border-lavanda-200 py-3 text-center text-[11px] text-morado-900/30">Sin salas de este lado</div>
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {lugares.map((l) => (
        <button
          key={l.id}
          onClick={() => onSeleccionar(l)}
          className={`flex min-w-[92px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-transform active:scale-95 ${
            seleccionado?.id === l.id ? 'ring-2 ring-lavanda-700' : ''
          }`}
          style={{ background: ESTILO_TIPO[l.tipo].fondo }}
        >
          <span className="text-base">{ESTILO_TIPO[l.tipo].emoji}</span>
          <span className="text-center text-[11px] font-semibold leading-tight" style={{ color: ESTILO_TIPO[l.tipo].color }}>
            {l.nombre}
          </span>
        </button>
      ))}
    </div>
  )
}
