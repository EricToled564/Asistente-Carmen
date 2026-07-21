import { useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
let scriptLoadingPromise = null

function loadWidgetScript() {
  if (scriptLoadingPromise) return scriptLoadingPromise
  scriptLoadingPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return resolve()
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.type = 'text/javascript'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar el widget de ElevenLabs'))
    document.body.appendChild(script)
  })
  return scriptLoadingPromise
}

/**
 * Widget embebido del agente de voz (ElevenLabs Agents / Convai).
 * El agent_id se configura después vía VITE_ELEVENLABS_AGENT_ID — sin él, muestra un
 * placeholder explicando qué falta en vez de fallar en silencio.
 *
 * `contextHint` inyecta un atributo dynamic-variables para dar contexto extra al agente
 * (p.ej. "modo estudio" desde el tab Académico) sin reimplementar su lógica aquí.
 */
export default function ElevenLabsWidget({ contextHint }) {
  const containerRef = useRef(null)
  const { config } = useApp()

  useEffect(() => {
    if (!config.elevenLabsAgentId) return
    let cancelled = false
    loadWidgetScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = ''
        const el = document.createElement('elevenlabs-convai')
        el.setAttribute('agent-id', config.elevenLabsAgentId)
        if (contextHint) {
          el.setAttribute('dynamic-variables', JSON.stringify({ contexto: contextHint }))
        }
        containerRef.current.appendChild(el)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [config.elevenLabsAgentId, contextHint])

  if (!config.elevenLabsAgentId) {
    return (
      <div className="m-4 rounded-2xl border border-dashed border-terracota-300 bg-terracota-50 p-5 text-sm text-noche-900/70">
        <p className="font-semibold text-terracota-700">El agente aún no está configurado</p>
        <p className="mt-2">
          Falta la variable de entorno <code className="rounded bg-white px-1">VITE_ELEVENLABS_AGENT_ID</code>.
          Crea el agente en la plataforma de ElevenLabs, copia su <code>agent_id</code> y agrégalo en{' '}
          <code className="rounded bg-white px-1">app/.env</code>.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="h-full w-full" />
}
