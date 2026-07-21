import { useMemo, useState } from 'react'
import { readJSON, writeJSON } from '../../lib/storage.js'

function diasRestantes(fechaISO) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const meta = new Date(fechaISO + 'T00:00:00')
  return Math.ceil((meta - hoy) / (1000 * 60 * 60 * 24))
}

export default function RadarFechas() {
  const [fechas, setFechas] = useState(() => readJSON('fechasAcademicas', []))
  const [form, setForm] = useState({ titulo: '', fecha: '', tipo: 'entrega' })

  const ordenadas = useMemo(
    () => [...fechas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    [fechas]
  )

  function agregar(e) {
    e.preventDefault()
    if (!form.titulo || !form.fecha) return
    const next = [...fechas, { ...form, id: crypto.randomUUID() }]
    setFechas(next)
    writeJSON('fechasAcademicas', next)
    setForm({ titulo: '', fecha: '', tipo: 'entrega' })
  }

  function eliminar(id) {
    const next = fechas.filter((f) => f.id !== id)
    setFechas(next)
    writeJSON('fechasAcademicas', next)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={agregar} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold text-terracota-700">Agregar entrega o examen</p>
        <input
          value={form.titulo}
          onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          placeholder="Ej. Entrega Taller de Diseño I"
          className="rounded-xl border border-terracota-100 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            className="flex-1 rounded-xl border border-terracota-100 px-3 py-2 text-sm"
          />
          <select
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            className="rounded-xl border border-terracota-100 px-3 py-2 text-sm"
          >
            <option value="entrega">Entrega</option>
            <option value="examen">Examen</option>
          </select>
        </div>
        <button type="submit" className="rounded-xl bg-terracota-600 py-2 text-sm font-semibold text-white">
          Agregar
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {ordenadas.length === 0 && (
          <p className="text-center text-sm text-noche-900/50">Aún no tienes fechas cargadas.</p>
        )}
        {ordenadas.map((f) => {
          const dias = diasRestantes(f.fecha)
          return (
            <div key={f.id} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-soft">
              <div>
                <p className="text-sm font-medium">
                  {f.tipo === 'examen' ? '📝' : '📦'} {f.titulo}
                </p>
                <p className="text-xs text-noche-900/50">{f.fecha}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    dias <= 3 ? 'bg-terracota-600 text-white' : 'bg-terracota-50 text-terracota-700'
                  }`}
                >
                  {dias === 0 ? 'Hoy' : dias > 0 ? `${dias}d` : 'Pasó'}
                </span>
                <button onClick={() => eliminar(f.id)} className="text-noche-900/30">
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
