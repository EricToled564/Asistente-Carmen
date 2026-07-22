import { useApp } from '../context/AppContext.jsx'
import { useClock, formatInTZ, ventanaBuenaParaLlamar } from '../hooks/useClock.js'

export default function Inicio({ onNavigate }) {
  const { checklist } = useApp()
  const now = useClock()
  const pendientes = checklist.filter((i) => !i.done)
  const hechas = checklist.length - pendientes.length
  const buenaVentana = ventanaBuenaParaLlamar(now)

  return (
    <div className="flex flex-col gap-5 p-5 pb-8">
      <header>
        <p className="text-sm text-morado-900/60">
          {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(now)}
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-morado-900 text-balance">Hola de nuevo 👋</h1>
      </header>

      <section className="rounded-3xl bg-lavanda-glow bg-lavanda-100 p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">Hora de casa</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-display text-5xl font-bold tabular-nums text-morado-900">
              {formatInTZ(now, 'America/Mexico_City')}
            </p>
            <p className="text-xs text-morado-900/60">Ciudad de México</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-morado-900/70">
              {formatInTZ(now, 'Europe/Madrid')}
            </p>
            <p className="text-xs text-morado-900/60">Pamplona</p>
          </div>
        </div>
        <p
          className={`mt-4 rounded-full px-3 py-1.5 text-center text-xs font-semibold ${
            buenaVentana ? 'bg-lavanda-700 text-white' : 'bg-white/70 text-morado-900/60'
          }`}
        >
          {buenaVentana ? '📞 Buena ventana para llamar a casa ahora' : 'No es la mejor hora para llamar — intenta más tarde'}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <QuickButton emoji="💬" label="Hablar con Maite" onClick={() => onNavigate('agente')} />
        <QuickButton emoji="🗺️" label="Ver mapa" onClick={() => onNavigate('mapa')} />
        <QuickButton emoji="📷" label="Foto → info" onClick={() => onNavigate('foto')} />
        <QuickButton emoji="📚" label="Académico" onClick={() => onNavigate('academico')} />
        <QuickButton emoji="🆘" label="SOS" danger onClick={() => onNavigate('sos')} />
      </section>

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

function QuickButton({ emoji, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl p-4 shadow-soft transition-transform active:scale-95 ${
        danger ? 'bg-red-600 text-white' : 'bg-white text-morado-900'
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
