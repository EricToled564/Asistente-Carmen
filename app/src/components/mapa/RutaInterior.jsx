import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import ElevenLabsWidget from '../agente/ElevenLabsWidget.jsx'

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

  useEffect(() => {
    api
      .rutaLugares()
      .then((data) => setPlantas(data.plantas))
      .catch(() => setError('No se pudo cargar la lista de lugares del edificio.'))
  }, [])

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
    const contextHint = `Carmen quiere que la guíes paso a paso dentro del edificio, desde "${ruta.origenNombre}" hasta "${ruta.destinoNombre}". El id de esta ruta activa es "${ruta.rutaId}". Dile primero este paso, tal cual: "${ruta.paso.instruccion}". Cuando ella confirme por voz que llegó a "${ruta.paso.checkpoint}", llama la herramienta avanzar_ruta con rutaId="${ruta.rutaId}" para obtener el siguiente paso y díselo. Repite hasta que la herramienta indique que ya llegó al destino final.`

    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <button onClick={() => setRuta(null)} className="self-start text-sm text-lavanda-700">
          ← Elegir otra ruta
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Ruta activa</p>
          <p className="text-lg font-semibold text-morado-900">
            {ruta.origenNombre} → {ruta.destinoNombre}
          </p>
        </div>
        <p className="text-sm text-morado-900/60">
          Habla con Maite y dile cuándo vas llegando a cada punto — ella te va dando el siguiente paso.
        </p>
        <div className="min-h-[420px] flex-1 rounded-2xl bg-white shadow-soft">
          <ElevenLabsWidget contextHint={contextHint} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-bold text-morado-900">¿Cómo llego?</p>
        <button onClick={onClose} className="text-2xl leading-none text-morado-900/60" aria-label="Cerrar">
          ×
        </button>
      </div>
      <p className="text-sm text-morado-900/60">
        Dile a Maite dónde estás y a dónde quieres ir, y te va guiando de viva voz, paso a paso.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!plantas ? (
        <p className="text-sm text-morado-900/50">Cargando lugares…</p>
      ) : (
        <>
          <SelectorLugar label="Estoy en" plantas={plantas} value={origenId} onChange={setOrigenId} />
          <SelectorLugar label="Quiero ir a" plantas={plantas} value={destinoId} onChange={setDestinoId} />
          <button
            onClick={iniciarRuta}
            disabled={!origenId || !destinoId || iniciando}
            className="mt-2 rounded-full bg-lavanda-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {iniciando ? 'Calculando ruta…' : 'Iniciar ruta con Maite'}
          </button>
        </>
      )}
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
        className="rounded-xl border border-lavanda-200 bg-white px-3 py-2.5 text-morado-900"
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
