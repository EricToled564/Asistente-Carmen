import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Agente() {
  const { config, setContextoAgente } = useApp()

  useEffect(() => {
    setContextoAgente(null) // sin contexto especial — modo conversación general
    return () => setContextoAgente(null)
  }, [setContextoAgente])

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Habla con Maite</h1>
        <p className="text-sm text-morado-900/60">Tu agente de voz — pregúntale lo que sea de tu día a día en Pamplona.</p>
      </header>

      {!config.elevenLabsAgentId ? (
        <div className="rounded-2xl border border-dashed border-lavanda-300 bg-lavanda-50 p-5 text-sm text-morado-900/70">
          <p className="font-semibold text-lavanda-800">El agente aún no está configurado</p>
          <p className="mt-2">
            Falta la variable de entorno <code className="rounded bg-white px-1">VITE_ELEVENLABS_AGENT_ID</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">💬</span>
          <p className="font-display text-lg font-bold text-morado-900">Toca el botón de Maite</p>
          <p className="text-sm text-morado-900/60">
            Aparece flotando arriba a la derecha de la pantalla — tócalo para empezar a hablarle o escribirle.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {['¿Qué clase tengo hoy?', '¿Cómo llego a la villavesa?', 'Ayúdame con mi TIE', 'Cuéntame algo de San Fermín'].map((sugerencia) => (
          <div key={sugerencia} className="rounded-xl bg-lavanda-50 px-3 py-2.5 text-morado-900/70">
            {sugerencia}
          </div>
        ))}
      </div>
    </div>
  )
}
