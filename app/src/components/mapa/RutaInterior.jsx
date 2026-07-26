import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../context/AppContext.jsx'

// "¿Cómo llego?" — Carmen elige dónde está y a dónde quiere ir (ella misma, no hay
// posicionamiento automático dentro del edificio — ver docs/ruta-interior.md sobre por qué).
//
// La ruta completa se MUESTRA ESCRITA en pantalla, paso por paso: dentro del edificio la señal
// de datos puede ser mala o nula, y hablar con Maite requiere conexión — leer una ruta que ya se
// cargó, no. Hablar con Maite queda como opción extra (útil si se pierde a media ruta o quiere
// que le vayan cantando los pasos), no como el único camino.
export default function RutaInterior({ onClose, destinoInicial }) {
  const [plantas, setPlantas] = useState(null)
  const [error, setError] = useState(null)
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState(destinoInicial || '')
  const [ruta, setRuta] = useState(null)
  const [iniciando, setIniciando] = useState(false)
  const [pasoHecho, setPasoHecho] = useState({}) // marcar pasos ya recorridos, a mano
  const { setContextoAgente } = useApp()

  useEffect(() => {
    api
      .rutaLugares()
      .then((data) => setPlantas(data.plantas))
      .catch(() => setError('No se pudo cargar la lista de lugares del edificio.'))
  }, [])

  // Solo se le pasa contexto a Maite cuando Carmen elige hablar con ella — no de entrada, para
  // que la ruta escrita funcione sola sin depender del agente.
  function pedirAyudaAMaite() {
    if (!ruta) return
    setContextoAgente(
      `Carmen quiere que la guíes paso a paso dentro del edificio, desde "${ruta.origenNombre}" hasta "${ruta.destinoNombre}". El id de esta ruta activa es "${ruta.rutaId}". Dile primero este paso, tal cual: "${ruta.paso.instruccion}". Cuando ella confirme por voz que llegó a "${ruta.paso.checkpoint}", llama la herramienta avanzar_ruta con rutaId="${ruta.rutaId}" para obtener el siguiente paso y díselo. Repite hasta que la herramienta indique que ya llegó al destino final.`
    )
  }

  useEffect(() => () => setContextoAgente(null), [setContextoAgente])

  async function iniciarRuta() {
    if (!origenId || !destinoId) return
    setIniciando(true)
    setError(null)
    setPasoHecho({})
    try {
      const data = await api.rutaIniciar({ origenId, destinoId })
      setRuta(data)
    } catch {
      setError('No se pudo calcular la ruta. Intenta de nuevo.')
    } finally {
      setIniciando(false)
    }
  }

  if (ruta) {
    const pasos = ruta.pasos || [ruta.paso]
    return (
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
        <button
          onClick={() => {
            setRuta(null)
            setContextoAgente(null)
          }}
          className="self-start text-sm text-lavanda-700"
        >
          ← Elegir otra ruta
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-5 shadow-glow">
          <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <p className="relative text-xs font-semibold uppercase tracking-wide text-lavanda-100">Tu ruta</p>
          <p className="relative mt-1 font-display text-xl font-bold text-white">
            {ruta.origenNombre} → {ruta.destinoNombre}
          </p>
          <p className="relative mt-1 text-xs text-lavanda-50/80">
            {pasos.length} {pasos.length === 1 ? 'paso' : 'pasos'} · ya cargada, funciona sin señal
          </p>
        </div>

        {/* La ruta escrita: esto es lo que Carmen sigue dentro del edificio */}
        <div className="flex flex-col gap-2">
          {pasos.map((paso, i) => {
            const hecho = pasoHecho[i]
            return (
              <button
                key={i}
                onClick={() => setPasoHecho((p) => ({ ...p, [i]: !p[i] }))}
                className={`flex items-start gap-3 rounded-2xl p-4 text-left shadow-soft transition ${
                  hecho ? 'bg-lavanda-50' : 'bg-white'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    hecho ? 'bg-lavanda-700 text-white' : 'bg-lavanda-100 text-lavanda-800'
                  }`}
                >
                  {hecho ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${hecho ? 'text-morado-900/40 line-through' : 'text-morado-900'}`}>
                    {paso.instruccion}
                  </p>
                  {i < pasos.length - 1 && (
                    <p className="mt-1 text-xs text-morado-900/45">Punto de referencia: {paso.checkpoint}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="rounded-3xl bg-crema-100 p-4">
          <p className="text-sm font-semibold text-morado-900">¿Te perdiste o prefieres que te vaya guiando?</p>
          <p className="mt-1 text-xs text-morado-900/60">
            Maite te puede ir cantando los pasos por voz. Necesita señal — si adentro no hay, sigue la lista de
            arriba, que ya está descargada.
          </p>
          <button
            onClick={pedirAyudaAMaite}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
          >
            💬 Pedirle ayuda a Maite
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lavanda-100 text-lg">🧭</span>
          <p className="font-display text-lg font-bold text-morado-900">¿Cómo llego?</p>
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-morado-900/60" aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <p className="text-sm text-morado-900/60">
          Dime dónde estás y a dónde vas, y te doy las indicaciones paso a paso.
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!plantas ? (
          <p className="mt-3 text-sm text-morado-900/50">Cargando lugares…</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <SelectorLugar label="Estoy en" plantas={plantas} value={origenId} onChange={setOrigenId} />
            <SelectorLugar label="Quiero ir a" plantas={plantas} value={destinoId} onChange={setDestinoId} />
            <button
              onClick={iniciarRuta}
              disabled={!origenId || !destinoId || iniciando}
              className="mt-1 rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-3 text-sm font-semibold text-white shadow-glow transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {iniciando ? 'Calculando ruta…' : 'Ver la ruta'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectorLugar({ label, plantas, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-morado-900">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-morado-900"
      >
        <option value="">Selecciona un lugar…</option>
        {plantas.map((p) => (
          <optgroup key={p.planta} label={`Planta ${p.planta}`}>
            {p.lugares.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
