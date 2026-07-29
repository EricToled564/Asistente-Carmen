import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// El radar de fechas: lo que viene y cuánto falta.
//
// Antes esto arrancaba vacío y solo tenía un formulario. Una pantalla que empieza vacía y te pide
// que teclees cada fecha no sabe nada que tú no sepas ya: era una libreta con menos sitio que una
// libreta. Ahora arranca con las sesiones que la propia universidad tiene publicadas —día, hora y
// aula— y ella añade lo suyo encima.
//
// Y vive en el Worker, no en el móvil, por lo mismo que los trámites: un recordatorio guardado solo
// en localStorage no puede sonar con la app cerrada, que es justo cuando hace falta.

function diasRestantes(fechaISO, hoyISO) {
  const a = Date.parse(`${fechaISO}T00:00:00Z`)
  const b = Date.parse(`${hoyISO}T00:00:00Z`)
  return Math.round((a - b) / 86400000)
}

function etiquetaDias(d) {
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  if (d > 0) return `${d}d`
  return 'Pasó'
}

function nombreFecha(iso) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${iso}T12:00:00`)
  )
}

export default function RadarFechas() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ titulo: '', fecha: '', tipo: 'entrega' })
  const [guardando, setGuardando] = useState(false)
  const [verPasadas, setVerPasadas] = useState(false)

  const cargar = useCallback(
    () =>
      api
        .fechasListar()
        .then((d) => {
          setDatos(d)
          setError('')
        })
        .catch(() => setError('No pude cargar tus fechas. Revisa tu conexión.')),
    []
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  async function agregar(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.fecha) return
    setGuardando(true)
    try {
      await api.fechaGuardar(form)
      setForm({ titulo: '', fecha: '', tipo: 'entrega' })
      await cargar()
    } catch {
      setError('No se pudo guardar. Inténtalo otra vez.')
    }
    setGuardando(false)
  }

  async function quitar(f) {
    await api.fechaBorrar(f.id).catch(() => {})
    await cargar()
  }

  async function marcar(f) {
    await api.fechaMarcar(f.id, !f.hecha).catch(() => {})
    await cargar()
  }

  if (error && !datos) return <p className="px-1 text-sm text-red-700">{error}</p>
  if (!datos) return <p className="px-1 text-sm text-morado-900/50">Cargando…</p>

  const hoy = datos.hoy
  const porVenir = datos.fechas.filter((f) => f.fecha >= hoy && !f.hecha)
  const pasadas = datos.fechas.filter((f) => f.fecha < hoy || f.hecha)

  const Tarjeta = ({ f }) => {
    const d = diasRestantes(f.fecha, hoy)
    const urgente = d >= 0 && d <= 3 && !f.hecha
    return (
      <div className={`rounded-2xl p-3.5 shadow-soft ${f.hecha ? 'bg-white opacity-60' : 'bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium text-morado-900 ${f.hecha ? 'line-through' : ''}`}>
              {f.origen === 'oficial' ? '🏛️' : f.tipo === 'examen' ? '📝' : f.tipo === 'entrega' ? '📦' : '📌'} {f.titulo}
            </p>
            <p className="mt-0.5 text-xs text-morado-900/55">
              {nombreFecha(f.fecha)}
              {f.hora ? ` · ${f.hora}` : ''}
              {f.aula ? ` · ${f.aula}` : ''}
            </p>
            {f.nota && <p className="mt-1 text-xs text-morado-900/50">{f.nota}</p>}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              urgente ? 'bg-lavanda-700 text-white' : 'bg-lavanda-50 text-lavanda-800'
            }`}
          >
            {etiquetaDias(d)}
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => marcar(f)} className="rounded-full bg-crema-100 px-3 py-1 text-xs font-semibold text-morado-900/70">
            {f.hecha ? 'No, aún no' : 'Ya está'}
          </button>
          <button onClick={() => quitar(f)} className="rounded-full px-2 py-1 text-xs font-semibold text-red-700">
            {/* Las oficiales no se borran: se ocultan, y vuelven con "restaurar". Borrar de verdad
                algo que el portal republica cada día sería un bucle sin fin. */}
            {f.origen === 'oficial' ? 'Ocultar' : 'Quitar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {datos.avisoPortal && (
        <p className="rounded-xl bg-melocoton-300/60 p-3 text-xs leading-relaxed text-morado-900">⚠️ {datos.avisoPortal}</p>
      )}

      {datos.resumen.oficiales > 0 && (
        <p className="rounded-xl bg-lavanda-50 p-3 text-xs leading-relaxed text-morado-900/70">
          Las que llevan 🏛️ las publica la universidad, con su aula y su hora. El portal no dice cuáles
          son examen y cuáles entrega, así que no se lo inventa: si tú sabes qué es cada una, apúntalo.
        </p>
      )}

      <form onSubmit={agregar} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold text-lavanda-800">Agregar una fecha tuya</p>
        <input
          value={form.titulo}
          onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          placeholder="Ej. Entrega maqueta Design Studio"
          className="rounded-xl border border-lavanda-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            className="min-w-0 flex-1 rounded-xl border border-lavanda-200 px-3 py-2 text-sm"
          />
          <select
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            className="rounded-xl border border-lavanda-200 px-3 py-2 text-sm"
          >
            <option value="entrega">Entrega</option>
            <option value="examen">Examen</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Agregar'}
        </button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-2">
        {porVenir.length === 0 ? (
          <p className="text-center text-sm text-morado-900/50">No tienes nada por delante.</p>
        ) : (
          porVenir.map((f) => <Tarjeta key={f.id} f={f} />)
        )}
      </div>

      {pasadas.length > 0 && (
        <>
          <button
            onClick={() => setVerPasadas((v) => !v)}
            className="self-center rounded-full px-3 py-1.5 text-xs font-semibold text-morado-900/50"
          >
            {verPasadas ? 'Ocultar' : `Ver las ${pasadas.length} que ya pasaron`}
          </button>
          {verPasadas && <div className="flex flex-col gap-2">{pasadas.map((f) => <Tarjeta key={f.id} f={f} />)}</div>}
        </>
      )}

      <button
        onClick={() => api.fechasRestaurar().then(cargar)}
        className="self-center text-xs text-morado-900/40 underline decoration-dotted"
      >
        Recuperar las oficiales que oculté
      </button>
    </div>
  )
}
