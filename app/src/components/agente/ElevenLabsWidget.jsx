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
 * Widget flotante del agente de voz (ElevenLabs Agents / Convai) — instancia ÚNICA y GLOBAL,
 * montada una sola vez en App.jsx.
 *
 * Importante (esto costó una sesión completa de debugging entenderlo): el custom element
 * <elevenlabs-convai> se define internamente con `:host { position: fixed; inset: 0 }` — es
 * SIEMPRE un overlay de posición fija sobre toda la pantalla, sin importar en qué <div> del DOM
 * lo montes. NO es un componente que se pueda "empotrar" dentro de una caja/contenedor — por eso
 * las pantallas que antes creaban su propia instancia dentro de una caja blanca (Agente, Tutor,
 * cada materia del Índice, Ruta interior) siempre se veían vacías: el chat real aparecía flotando
 * en su posición fija de siempre (o ni eso, si algo fallaba), nunca dentro de esa caja.
 *
 * La solución: una sola instancia para toda la app, que flota con `placement="top-right"` (para
 * no chocar con la barra de tabs de abajo). Las pantallas que necesitan darle contexto especial
 * (modo estudio, una materia puntual, una ruta activa) usan `setContextoAgente(...)` del
 * AppContext en vez de montar su propio widget — eso solo actualiza el atributo
 * `dynamic-variables` de la instancia que ya existe.
 */
export default function ElevenLabsWidget() {
  const containerRef = useRef(null)
  const elRef = useRef(null)
  const { config, contextoAgente } = useApp()

  // Crear el elemento UNA sola vez (mount-only) — nunca se destruye al navegar entre tabs.
  useEffect(() => {
    if (!config.elevenLabsAgentId || !containerRef.current) return
    let cancelled = false
    loadWidgetScript()
      .then(() => {
        if (cancelled || !containerRef.current || elRef.current) return
        const el = document.createElement('elevenlabs-convai')
        el.setAttribute('agent-id', config.elevenLabsAgentId)
        el.setAttribute('placement', 'top-right')
        elRef.current = el
        containerRef.current.appendChild(el)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.elevenLabsAgentId])

  // Actualizar el contexto (dynamic-variables) del elemento YA existente cuando cambie —
  // sin recrearlo, para no cortar una conversación en curso al cambiar de pantalla.
  useEffect(() => {
    if (!elRef.current) return
    const dynamicVars = {
      ...(contextoAgente ? { contexto: contextoAgente } : {}),
      ...(config.agenteViaDosHora ? calcularVariablesDeHora() : {})
    }
    if (Object.keys(dynamicVars).length > 0) {
      elRef.current.setAttribute('dynamic-variables', JSON.stringify(dynamicVars))
    } else {
      elRef.current.removeAttribute('dynamic-variables')
    }
  }, [contextoAgente, config.agenteViaDosHora])

  if (!config.elevenLabsAgentId) return null

  return <div ref={containerRef} />
}
