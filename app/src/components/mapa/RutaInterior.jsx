import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../context/AppContext.jsx'

// "¿Cómo llego?" — Carmen elige dónde está y a dónde quiere ir (ella misma, no hay
// posicionamiento automático dentro del edificio — ver docs/ruta-interior.md sobre por qué).
// Maite la va guiando en voz, un checkpoint a la vez: le da el primer paso, y cuando Carmen le
// confirma que llegó, Maite llama la tool avanzar_ruta para conseguir el siguiente.
export default function RutaInterior({ onClose }) {
  const [plantas, setPlantas] = useState(null)
  const [error, setError] = useState(null)
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [ruta, setRuta] = useState(null) // { rutaId, paso, origenNombre, destinoNombre }
  const [iniciando, setIniciando] = useState(false)
  const { setContextoAgente } = useApp()

  useEffect(() => {
    api
      .rutaLugares()
      .then((data) => setPlantas(data.plantas))
      .catch(() => setError('No se pudo cargar la lista de lugares del edificio.'))
  }, [])

  useEffect(() => {
    if (!ruta) return
    setContextoAgente(
      `Carmen quiere que la guíes paso a paso dentro del edificio, desde "${ruta.origenNombre}" hasta "${ruta.destinoNombre}". El id de esta ruta activa es "${ruta.rutaId}". Dile primero este paso, tal cual: "${ruta.paso.instruccion}". Cuando ella confirme por voz que llegó a "${ruta.paso.checkpoint}", llama la herramienta avanzar_ruta con rutaId="${ruta.rutaId}" para obtener el siguiente paso y díselo. Repite hasta que la herramienta indique que ya llegó al destino final.`
    )
    return () => setContextoAgente(null)
  }, [ruta, setContextoAgente])

  async function iniciarRuta() {
    if (!origenId || !destinoId) return
    setIniciando(true)
    setError(null)
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
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <button onClick={() => setRuta(null)} className="self-start text-sm text-lavanda-700">
          ← Elegir otra ruta
        </button>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-5 shadow-glow">
          <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <p className="relative text-xs font-semibold uppercase tracking-wide text-lavanda-100">Ruta activa</p>
          <p className="relative mt-1 font-display text-xl font-bold text-white">
            {ruta.origenNombre} → {ruta.destinoNombre}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">🧭</span>
          <p className="text-sm text-morado-900/60">
            Toca el botón de Maite (arriba a la derecha) y ve diciéndole cuándo vas llegando a cada punto —
            ella te va dando el siguiente paso.
          </p>
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
          Dile a Maite dónde estás y a dónde quieres ir, y te va guiando de viva voz, paso a paso.
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
              {iniciando ? 'Calculando ruta…' : 'Iniciar ruta con Maite'}
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
