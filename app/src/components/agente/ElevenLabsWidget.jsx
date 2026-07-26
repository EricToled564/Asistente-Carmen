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

// Fecha y hora que se le pasan al agente como dynamic-variables.
//
// Por qué SIEMPRE se mandan (antes eran un fallback opcional): la variable {{system__time}} de
// ElevenLabs sí trae el día de la semana, pero en INGLÉS ("Friday, 12:33 12 December 2025"), y
// el horario de Carmen está en español (Lunes, Martes...). Obligar al modelo a traducir el día
// antes de buscar en su horario es un paso extra donde se puede equivocar, justo en la pregunta
// más frecuente que le va a hacer: "¿qué clase tengo hoy?". Aquí se lo damos ya resuelto y en
// español, calculado por el navegador contra la zona horaria correcta.
//
// La hora de México va aparte porque la diferencia con España cambia dos veces al año (España
// aplica horario de verano, México ya no) — restar "seis o siete horas" de memoria es
// exactamente el tipo de cuenta que un modelo falla en silencio.
function calcularVariablesDeHora() {
  const ahora = new Date()
  const enPamplona = (opciones) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', ...opciones }).format(ahora)

  return {
    // "domingo" — el día de la semana suelto, para que empate directo con su horario
    dia_semana: enPamplona({ weekday: 'long' }),
    // "domingo, 26 de julio de 2026, 14:30"
    fecha_actual: enPamplona({ dateStyle: 'full', timeStyle: 'short' }),
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
      ...calcularVariablesDeHora(), // siempre: ver el comentario de la función
      ...(contextoAgente ? { contexto: contextoAgente } : {})
    }
    elRef.current.setAttribute('dynamic-variables', JSON.stringify(dynamicVars))
  }, [contextoAgente])

  if (!config.elevenLabsAgentId) return null

  return <div ref={containerRef} />
}
