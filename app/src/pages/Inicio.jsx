import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useClock, formatInTZ, ventanaBuenaParaLlamar } from '../hooks/useClock.js'
import { CIUDADES_REFERENCIA } from '../data/ciudadesReferencia.js'

export default function Inicio({ onNavigate }) {
  const { checklist, ciudadReferencia, setCiudadReferencia, modoViaje, setModoViaje, ciudadViaje, setCiudadViaje } =
    useApp()
  const [editandoCiudad, setEditandoCiudad] = useState(false)
  const now = useClock()
  const pendientes = checklist.filter((i) => !i.done)
  const hechas = checklist.length - pendientes.length
  const progreso = checklist.length ? Math.round((hechas / checklist.length) * 100) : 0
  // La ventana para llamar se calcula SIEMPRE contra la ciudad de casa, también viajando: la
  // pregunta es si allá es buena hora para contestar, no si aquí es cómodo marcar.
  const buenaVentana = ventanaBuenaParaLlamar(now, ciudadReferencia.tz)

  // Viajando, el reloj grande es donde está; el chico, Pamplona (que es donde siguen sus clases).
  // Sin viajar, el grande es Pamplona y el chico su casa. En los dos casos el grande responde
  // "¿qué hora es aquí?" y el chico "¿qué hora es allá?".
  const principal = modoViaje ? { tz: ciudadViaje.tz, nombre: ciudadViaje.nombre } : { tz: 'Europe/Madrid', nombre: 'Pamplona' }
  const secundario = modoViaje
    ? { tz: 'Europe/Madrid', nombre: 'Pamplona · tus clases' }
    : { tz: ciudadReferencia.tz, nombre: ciudadReferencia.nombre }

  const ciudadEditable = modoViaje ? ciudadViaje : ciudadReferencia
  const aplicarCiudad = modoViaje ? setCiudadViaje : setCiudadReferencia

  return (
    <div className="flex flex-col gap-5 p-5 pb-8">
      <header>
        <p className="text-sm text-morado-900/60">
          {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: principal.tz }).format(now)}
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-morado-900 text-balance">Hola de nuevo 👋</h1>
      </header>

      <section className="rounded-3xl bg-lavanda-glow bg-lavanda-100 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">
            {modoViaje ? 'Donde estás' : 'Tu hora'}
          </p>
          <button
            onClick={() => setModoViaje(!modoViaje)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              modoViaje ? 'bg-lavanda-700 text-white' : 'bg-white/70 text-morado-900/60'
            }`}
          >
            ✈️ Modo viaje {modoViaje ? 'activado' : ''}
          </button>
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-display text-5xl font-bold tabular-nums text-morado-900">
              {formatInTZ(now, principal.tz)}
            </p>
            {modoViaje ? (
              editandoCiudad ? (
                <select
                  autoFocus
                  value={ciudadEditable.nombre}
                  onChange={(e) => {
                    const elegida = CIUDADES_REFERENCIA.find((c) => c.nombre === e.target.value)
                    if (elegida) aplicarCiudad(elegida)
                    setEditandoCiudad(false)
                  }}
                  onBlur={() => setEditandoCiudad(false)}
                  className="mt-0.5 rounded-lg border border-lavanda-300 bg-white px-1.5 py-0.5 text-xs text-morado-900"
                >
                  {CIUDADES_REFERENCIA.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditandoCiudad(true)}
                  className="text-xs text-morado-900/60 underline decoration-dotted"
                >
                  {principal.nombre} ✎
                </button>
              )
            ) : (
              <p className="text-xs text-morado-900/60">{principal.nombre}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-morado-900/70">
              {formatInTZ(now, secundario.tz)}
            </p>
            {!modoViaje && editandoCiudad ? (
              <select
                autoFocus
                value={ciudadEditable.nombre}
                onChange={(e) => {
                  const elegida = CIUDADES_REFERENCIA.find((c) => c.nombre === e.target.value)
                  if (elegida) aplicarCiudad(elegida)
                  setEditandoCiudad(false)
                }}
                onBlur={() => setEditandoCiudad(false)}
                className="mt-0.5 rounded-lg border border-lavanda-300 bg-white px-1.5 py-0.5 text-xs text-morado-900"
              >
                {CIUDADES_REFERENCIA.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            ) : modoViaje ? (
              <p className="text-xs text-morado-900/60">{secundario.nombre}</p>
            ) : (
              <button onClick={() => setEditandoCiudad(true)} className="text-xs text-morado-900/60 underline decoration-dotted">
                {secundario.nombre} ✎
              </button>
            )}
          </div>
        </div>

        {modoViaje && (
          <p className="mt-3 rounded-xl bg-white/70 p-2.5 text-[11px] leading-snug text-morado-900/70">
            Maite ya sabe que estás en {ciudadViaje.nombre}. Cuando te diga una hora de clase te va a aclarar si
            es de aquí o de Pamplona — tu horario sigue en hora de Pamplona.
          </p>
        )}

        <p
          className={`mt-4 rounded-full px-3 py-1.5 text-center text-xs font-semibold ${
            buenaVentana ? 'bg-lavanda-700 text-white' : 'bg-white/70 text-morado-900/60'
          }`}
        >
          {buenaVentana
            ? `📞 Buena ventana para llamar a ${ciudadReferencia.nombre} ahora`
            : `No es la mejor hora para llamar a ${ciudadReferencia.nombre} — intenta más tarde`}
        </p>
      </section>

      <button
        onClick={() => onNavigate('agente')}
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-5 text-left shadow-glow transition-transform active:scale-[0.98]"
      >
        <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 transition-transform group-active:scale-90" />
        <div aria-hidden className="absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/10" />
        <p className="relative text-xs font-semibold uppercase tracking-wide text-lavanda-100">Tu agente de voz</p>
        <p className="relative mt-1 font-display text-2xl font-bold text-white">Habla con Maite →</p>
        <p className="relative mt-1 text-sm text-lavanda-50/90">Pregúntale lo que sea de tu día a día en Pamplona.</p>
      </button>

      <section className="grid grid-cols-3 gap-3">
        <QuickButton emoji="🗺️" label="Mapa" tint="bg-lavanda-100" onClick={() => onNavigate('mapa')} />
        <QuickButton emoji="📷" label="Foto → info" tint="bg-melocoton-300/50" onClick={() => onNavigate('foto')} />
        <QuickButton emoji="📚" label="Académico" tint="bg-crema-200" onClick={() => onNavigate('academico')} />
      </section>

      <button
        onClick={() => onNavigate('sos')}
        className="flex items-center gap-3 rounded-3xl bg-red-600 p-4 text-left text-white shadow-soft transition-transform active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl">🆘</span>
        <div>
          <p className="font-display text-lg font-bold">SOS</p>
          <p className="text-xs text-red-50/90">Ayuda rápida si algo se complica</p>
        </div>
      </button>

      <section className="rounded-3xl border border-lavanda-200 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-morado-900/70">Primeros 30 días</p>
            <p className="font-display text-4xl font-bold tabular-nums text-lavanda-700">
              {hechas}
              <span className="text-xl font-semibold text-morado-900/40">/{checklist.length}</span>
            </p>
          </div>
          <button
            onClick={() => onNavigate('ajustes')}
            className="rounded-full bg-lavanda-50 px-3 py-1.5 text-xs font-semibold text-lavanda-800 active:scale-95"
          >
            Ver todo
          </button>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-lavanda-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lavanda-500 to-lavanda-700 transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
        {pendientes[0] ? (
          <p className="mt-3 rounded-xl bg-crema-100 p-3 text-sm text-morado-900/80">
            Siguiente: <span className="font-semibold">{pendientes[0].label}</span>
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-melocoton-300 p-3 text-sm font-semibold text-morado-900">¡Todo listo! 🎉</p>
        )}
      </section>
    </div>
  )
}

function QuickButton({ emoji, label, tint, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-soft transition-transform active:scale-95"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${tint}`}>{emoji}</span>
      <span className="text-center text-xs font-medium leading-tight text-morado-900">{label}</span>
    </button>
  )
}
