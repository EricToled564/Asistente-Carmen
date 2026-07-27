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
// La hora de casa va aparte porque la diferencia con España cambia dos veces al año (España
// aplica horario de verano, México ya no) — restar "seis o siete horas" de memoria es
// exactamente el tipo de cuenta que un modelo falla en silencio.
//
// MODO VIAJE: cuando está activo, `fecha_actual` y `dia_semana` pasan a ser los del sitio donde
// Carmen está, no los de Pamplona. Pero `hora_pamplona` se manda SIEMPRE, en los dos modos, y esa
// no es una redundancia: su horario de clases, las tutorías y todo lo del campus están en hora de
// Pamplona. Si el modo viaje sustituyera una zona por otra sin más, en cuanto cruzara un huso
// Maite empezaría a contestar mal "¿a qué hora tengo clase mañana?" — con total seguridad, que es
// la peor forma de fallar. Teniendo las dos puede decir lo único correcto: "es a las nueve en
// Pamplona, que aquí donde estás son las tres de la mañana".
function calcularVariablesDeHora({ modoViaje, ciudadViaje, ciudadCasa }) {
  const ahora = new Date()
  const formatear = (tz, opciones) => new Intl.DateTimeFormat('es-ES', { timeZone: tz, ...opciones }).format(ahora)

  const tzActual = modoViaje ? ciudadViaje.tz : 'Europe/Madrid'
  const lugarActual = modoViaje ? ciudadViaje.nombre : 'Pamplona'

  return {
    // "domingo" — el día de la semana suelto, para que empate directo con su horario
    dia_semana: formatear(tzActual, { weekday: 'long' }),
    // "domingo, 26 de julio de 2026, 14:30"
    fecha_actual: formatear(tzActual, { dateStyle: 'full', timeStyle: 'short' }),
    lugar_actual: lugarActual,
    modo_viaje: modoViaje ? `sí — Carmen está en ${ciudadViaje.nombre}, fuera de Pamplona` : 'no',
    hora_pamplona: formatear('Europe/Madrid', { timeStyle: 'short' }),
    ciudad_casa: ciudadCasa.nombre,
    hora_casa: formatear(ciudadCasa.tz, { timeStyle: 'short' })
  }
}

/**
 * Widget del agente de voz (ElevenLabs Agents / Convai). Vive SOLO en la pantalla de Maite.
 *
 * Sobre el widget en sí (esto costó una sesión entera de debugging entenderlo): el custom element
 * <elevenlabs-convai> se define internamente con `:host { position: fixed; inset: 0 }` — es
 * SIEMPRE un overlay de posición fija sobre toda la pantalla, sin importar en qué <div> del DOM
 * lo montes. No se puede empotrar dentro de una caja, y solo acepta cuatro posiciones
 * (top-left, top-right, bottom-left, bottom-right); no hay forma de moverlo a otro sitio.
 *
 * Antes había UNA instancia global flotando sobre todas las pantallas. Funcionaba, pero el botón
 * quedaba encima del contenido en sitios donde no venía a cuento, y no había manera de quitarlo
 * de en medio. Ahora se monta solo cuando Carmen entra a la pantalla de Maite, y el resto de la
 * app la invoca con botones que llevan ahí (ver components/agente/BotonMaite.jsx).
 *
 * Consecuencia asumida: salir de la pantalla corta la conversación en curso, porque el elemento
 * se destruye. Es un intercambio consciente — a cambio, el botón solo aparece donde tiene sentido
 * y la pantalla de Maite es un sitio al que ir, no algo que flota encima de todo.
 */
export default function ElevenLabsWidget() {
  const containerRef = useRef(null)
  const elRef = useRef(null)
  const { config, contextoAgente, modoViaje, ciudadViaje, ciudadReferencia } = useApp()

  // Se crea al entrar a la pantalla y se destruye al salir.
  //
  // El `remove()` de la limpieza no es opcional: el widget se pinta con position:fixed sobre toda
  // la ventana, así que si el elemento sobrevive al desmontaje de React se queda flotando encima
  // de la pantalla siguiente, sin nada que lo controle ni forma de cerrarlo.
  useEffect(() => {
    if (!config.elevenLabsAgentId || !containerRef.current) return
    let cancelled = false
    loadWidgetScript()
      .then(() => {
        if (cancelled || !containerRef.current || elRef.current) return
        const el = document.createElement('elevenlabs-convai')
        el.setAttribute('agent-id', config.elevenLabsAgentId)
        el.setAttribute('placement', 'bottom-right')
        elRef.current = el
        containerRef.current.appendChild(el)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
      elRef.current?.remove()
      elRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.elevenLabsAgentId])

  // Actualizar el contexto (dynamic-variables) del elemento YA existente cuando cambie —
  // sin recrearlo, para no cortar una conversación en curso al cambiar de pantalla.
  useEffect(() => {
    if (!elRef.current) return
    const dynamicVars = {
      // Siempre: ver el comentario de la función sobre por qué no basta con {{system__time}}.
      ...calcularVariablesDeHora({ modoViaje, ciudadViaje, ciudadCasa: ciudadReferencia }),
      ...(contextoAgente ? { contexto: contextoAgente } : {})
    }
    elRef.current.setAttribute('dynamic-variables', JSON.stringify(dynamicVars))
  }, [contextoAgente, modoViaje, ciudadViaje, ciudadReferencia])

  if (!config.elevenLabsAgentId) return null

  return <div ref={containerRef} />
}
