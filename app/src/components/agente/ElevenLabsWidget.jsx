import { useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { crearClientTools } from '../../lib/clientTools.js'

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

// El widget puede enseñar texto además de hablar, y hasta ahora no se estaba usando.
//
// Qué hace cada uno (comprobado leyendo el bundle de @elevenlabs/convai-widget-embed 0.15.1, no
// la documentación):
//
// - `transcript`: pinta lo que Maite va diciendo mientras lo dice. Sin esto, el panel solo tiene
//   la onda de audio: si Carmen no pilla un aula ("ARQ-P2-TALLER4A" dicho en voz alta) no tiene
//   dónde mirarlo. Con esto lo lee.
// - `text-input`: añade el botón de modo texto, para escribirle en una biblioteca o con ruido.
// - `markdown-link-allowed-hosts`: en modo texto los mensajes se pintan como markdown y los
//   enlaces son pulsables, PERO solo los de hosts en esta lista; por defecto la lista es
//   únicamente el origen de la propia página, así que un enlace a Google Maps saldría muerto.
// - `strip-audio-tags`: quita de la transcripción las etiquetas tipo `[Warmly]` que el modelo
//   sigue colando. Ojo: esto solo las OCULTA en pantalla. Que el modelo las siga generando es un
//   problema del prompt que sigue sin resolverse.
//
// Y el límite que importa, porque cambia lo que se le puede pedir a Maite: en modo VOZ la
// transcripción se pinta en texto plano, sin markdown y sin enlaces pulsables (el widget solo
// aplica markdown a los mensajes marcados `isText`, o sea a los de modo texto). Además el texto
// de la transcripción es literalmente lo que dice el TTS: no hay un canal aparte para "enseñar
// esto sin decirlo". Si Maite mete una URL en su respuesta, la va a LEER EN VOZ ALTA letra por
// letra. Por eso una URL nunca debe salir de su boca: para abrir un mapa hace falta una client
// tool que lo abra desde la app.
const ATRIBUTOS_TEXTO = {
  transcript: 'true',
  'text-input': 'true',
  'strip-audio-tags': 'true',
  'markdown-link-allowed-hosts': 'google.com,unav.edu,bulletscheduling.com',
  // El widget solo llega a "fullscreen" en pantallas <768px (todas las de Carmen) cuando ella toca
  // el botón de maximizar del panel — comprobado en el bundle 0.15.1: es el ÚNICO sitio que cambia
  // ese estado, no pasa solo por hablar o escribir. Quitando el botón (show-resize-button=false)
  // el panel se queda siempre en su tamaño compacto, y con eso deja de haber pantalla completa de
  // la que sea casi imposible salir.
  'show-resize-button': 'false'
}

/**
 * Widget del agente de voz (ElevenLabs Agents / Convai). Vive SOLO en la pantalla de Maite.
 *
 * Sobre el widget en sí (esto costó una sesión entera de debugging entenderlo): el custom element
 * <elevenlabs-convai> se define internamente con `:host { position: fixed; inset: 0 }` — es
 * SIEMPRE un overlay de posición fija sobre toda la pantalla, sin importar en qué <div> del DOM
 * lo montes. No se puede empotrar dentro de una caja.
 *
 * `placement` acepta seis valores, no cuatro (esto se pasó por alto la primera vez, mirando solo
 * las cuatro esquinas): top-left, top, top-right, bottom-left, bottom, bottom-right — comprobado
 * leyendo el array de valores válidos del bundle 0.15.1 (`ng`), no adivinado. "top" y "bottom" se
 * quedan centrados en horizontal — no hay un "centro de la pantalla" de verdad (eso movería el
 * botón a mitad del contenido, tapándolo), pero si lo que molesta es que la esquina inferior
 * derecha choca con la barra de pestañas de abajo, "top" la evita del todo y además queda
 * centrado.
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

  // Las herramientas que corren en el teléfono se rearman en cada render y se leen por ref al
  // arrancar la llamada. Van por ref y no por dependencia del efecto de montaje a propósito:
  // recrear el elemento para actualizarlas cortaría la conversación en curso, y lo que cambia
  // (que esté o no en modo viaje) tiene que poder cambiar sin cortar nada.
  const toolsRef = useRef(null)
  toolsRef.current = crearClientTools({
    ciudadActual: modoViaje ? `${ciudadViaje.nombre}, ${ciudadViaje.pais}` : 'Pamplona, España'
  })

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
        el.setAttribute('placement', 'top')
        for (const [attr, valor] of Object.entries(ATRIBUTOS_TEXTO)) el.setAttribute(attr, valor)

        // Así se registran las herramientas que corren aquí, en el teléfono. El widget dispara
        // este evento justo antes de abrir la conversación y luego RELEE `detail.config`: hay que
        // mutar el objeto que viene, no devolver uno nuevo.
        el.addEventListener('elevenlabs-convai:call', (e) => {
          e.detail.config.clientTools = { ...(e.detail.config.clientTools || {}), ...toolsRef.current }
        })

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
