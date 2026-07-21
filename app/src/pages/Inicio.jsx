import { useApp } from '../context/AppContext.jsx'
import { useClock, formatInTZ, ventanaBuenaParaLlamar } from '../hooks/useClock.js'

export default function Inicio({ onNavigate }) {
  const { checklist } = useApp()
  const now = useClock()
  const pendientes = checklist.filter((i) => !i.done)
  const buenaVentana = ventanaBuenaParaLlamar(now)

  return (
    <div className="flex flex-col gap-5 p-5 pb-8">
      <header>
        <p className="text-sm text-noche-900/60">
          {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(now)}
        </p>
        <h1 className="font-display text-3xl font-semibold text-terracota-700">Hola de nuevo 👋</h1>
      </header>

      <section className="rounded-2xl bg-terracota-50 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-terracota-600">Hora de casa</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-display text-3xl">{formatInTZ(now, 'America/Mexico_City')}</p>
            <p className="text-xs text-noche-900/60">Ciudad de México</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl text-noche-900/70">{formatInTZ(now, 'Europe/Madrid')}</p>
            <p className="text-xs text-noche-900/60">Pamplona</p>
          </div>
        </div>
        <p className={`mt-3 rounded-full px-3 py-1 text-center text-xs font-medium ${buenaVentana ? 'bg-terracota-500 text-crema-50' : 'bg-noche-900/5 text-noche-900/60'}`}>
          {buenaVentana ? '📞 Buena ventana para llamar a casa ahora' : 'No es la mejor hora para llamar — intenta más tarde'}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <QuickButton emoji="💬" label="Hablar con Nava" onClick={() => onNavigate('agente')} />
        <QuickButton emoji="🗺️" label="Ver mapa" onClick={() => onNavigate('mapa')} />
        <QuickButton emoji="📷" label="Foto → info" onClick={() => onNavigate('foto')} />
        <QuickButton emoji="📚" label="Académico" onClick={() => onNavigate('academico')} />
        <QuickButton emoji="🆘" label="SOS" danger onClick={() => onNavigate('sos')} />
      </section>

      <section className="rounded-2xl border border-terracota-100 p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium text-noche-900/80">Primeros 30 días</p>
          <button onClick={() => onNavigate('ajustes')} className="text-xs font-semibold text-terracota-600">
            Ver todo
          </button>
        </div>
        <p className="mt-1 text-sm text-noche-900/60">
          {pendientes.length === 0 ? '¡Todo listo! 🎉' : `Te faltan ${pendientes.length} de ${checklist.length} tareas`}
        </p>
        {pendientes[0] && (
          <p className="mt-2 rounded-xl bg-crema-100 p-3 text-sm">
            Siguiente: <span className="font-medium">{pendientes[0].label}</span>
          </p>
        )}
      </section>
    </div>
  )
}

function QuickButton({ emoji, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl p-4 shadow-soft ${
        danger ? 'bg-terracota-600 text-crema-50' : 'bg-white text-noche-900'
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
