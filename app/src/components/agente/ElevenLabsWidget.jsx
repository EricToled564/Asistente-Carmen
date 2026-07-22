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

// Vía 2 (fallback): fecha/hora calculadas en el navegador para pasarlas como dynamic-variables.
// Solo se usan si VITE_AGENTE_VIA2_HORA=true — por defecto el agente resuelve la hora vía
// {{system__time}} configurado directamente en la plataforma de ElevenLabs (Vía 1, sin código).
function calcularVariablesDeHora() {
  const ahora = new Date()
  return {
    fecha_actual: new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid'
    }).format(ahora),
    hora_mexico: new Intl.DateTimeFormat('es-MX', {
      timeStyle: 'short',
      timeZone: 'America/Mexico_City'
    }).format(ahora)
  }
}

/**
 * Widget embebido del agente de voz (ElevenLabs Agents / Convai).
 * El agent_id se configura después vía VITE_ELEVENLABS_AGENT_ID — sin él, muestra un
 * placeholder explicando qué falta en vez de fallar en silencio.
 *
 * `contextHint` inyecta contexto extra al agente (p.ej. "modo estudio" desde el tab Académico)
 * sin reimplementar su lógica aquí.
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

        const dynamicVars = {
          ...(contextHint ? { contexto: contextHint } : {}),
          ...(config.agenteViaDosHora ? calcularVariablesDeHora() : {})
        }
        if (Object.keys(dynamicVars).length > 0) {
          el.setAttribute('dynamic-variables', JSON.stringify(dynamicVars))
        }
        containerRef.current.appendChild(el)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [config.elevenLabsAgentId, config.agenteViaDosHora, contextHint])

  if (!config.elevenLabsAgentId) {
    return (
      <div className="m-4 rounded-2xl border border-dashed border-lavanda-300 bg-lavanda-50 p-5 text-sm text-morado-900/70">
        <p className="font-semibold text-lavanda-800">El agente aún no está configurado</p>
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
