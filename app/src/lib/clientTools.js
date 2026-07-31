import { PINES } from '../data/pines.js'
import { listarMisLugares } from '../data/misLugares.js'
import { getCurrentPosition } from '../hooks/useGeolocation.js'
import { resolverDestino, urlComoLlegar } from './comoLlegar.js'

// Herramientas que Maite ejecuta EN EL TELÉFONO, no en el Worker.
//
// Las que ya tenía (`consultar_horario`, `iniciar_ruta`, `consultar_fechas`…) son server tools:
// ElevenLabs llama a una URL nuestra, el Worker responde un dato y ella lo cuenta. Estas son otra
// cosa: no devuelven información, HACEN algo en el aparato que Carmen tiene en la mano. El widget
// las soporta y hasta hoy no se usaban.
//
// Por qué hacía falta una: fuera del edificio Maite no tiene datos de calles, y en vez de decirlo
// se los inventaba con toda la seguridad del mundo ("cruza la avenida hacia la acera sur, unos
// cinco minutos"). Contarle el camino no es su trabajo. Abrirle el mapa, sí.
//
// Y no puede limitarse a dictar el enlace: el texto que sale de su boca es literalmente lo que
// dice el TTS, así que una URL la leería carácter por carácter. Tiene que abrirla la app.

// Qué se le devuelve al modelo.
//
// `comoDecirlo` no es decoración. Es el mismo truco que ya funciona en `consultar_fechas`: la
// instrucción viaja DENTRO de la respuesta de la herramienta, no solo en el prompt. Una regla del
// prompt la ignoró ya una vez —`iniciar_ruta` le contestó "no lo sé" y ella siguió inventando el
// camino igual—; una frase que llega pegada al resultado, justo antes de hablar, le cuesta más
// saltársela.
// Dos prohibiciones, no una, y la segunda salió de verla fallar.
//
// La primera —no describir el camino— funciona: en las simulaciones aguanta cuatro insistencias
// seguidas sin soltar una calle. Pero apareció una forma más fina del mismo error: en vez de
// inventarse el camino, se inventaba lo que el mapa PONE ("la opción más rápida que me muestra el
// mapa es caminar hasta la parada y coger una villavesa directa"). Suena a que lo está leyendo, y
// no ve nada: la herramienta abre Google Maps y no devuelve ni una ruta, ni una línea, ni un
// tiempo. Es peor que la primera versión del fallo, porque viene con una fuente falsa pegada.
const NO_DESCRIBAS =
  'NO describas el camino, NO digas calles, ni cuántos minutos, ni por dónde cruzar: no lo sabes y el mapa ya se lo dice. ' +
  'Y tú NO VES el mapa: no digas "el mapa me muestra" ni le cuentes qué línea de villavesa, qué parada o qué tiempo aparece, porque no tienes acceso a nada de eso. Lo mira ella.'

/**
 * Construye las client tools con el contexto de la app (modo viaje, callbacks de UI).
 *
 * Se crea desde el componente en vez de ser un objeto suelto porque necesita saber en qué ciudad
 * está Carmen: en modo viaje, "la catedral" no es la de Pamplona.
 */
export function crearClientTools({ ciudadActual = 'Pamplona, España' } = {}) {
  return {
    /**
     * Abre Google Maps con el camino hasta donde ella pidió, saliendo de donde está.
     *
     * Se intenta primero en una pestaña aparte para no matar la conversación. Los navegadores
     * bloquean `window.open` si no viene de un toque reciente, y aquí viene de un mensaje del
     * agente, así que lo normal es que lo bloqueen: por eso hay una segunda vía que navega la
     * pestaña actual. Esa sí sale siempre, a costa de cortar la llamada — un intercambio que vale
     * la pena, porque en ese momento lo que ella quiere es el mapa, no seguir hablando.
     */
    abrir_mapa: async ({ destino }) => {
      const texto = String(destino || '').trim()
      if (!texto) {
        return {
          abierto: false,
          motivo: 'sin_destino',
          comoDecirlo: 'Pregúntale a dónde quiere ir. Una frase corta.'
        }
      }

      // Sus lugares guardados van primero: si ella guardó "casa de Lucía", eso gana sobre
      // cualquier cosa parecida del mapa curado.
      const lugares = [...listarMisLugares(), ...PINES]
      const d = resolverDestino(texto, { lugares, ciudad: ciudadActual })

      const posicion = await getCurrentPosition()
      const url = urlComoLlegar({
        origen: posicion.ok ? { lat: posicion.lat, lng: posicion.lng } : null,
        destino: d
      })
      if (!url) {
        return {
          abierto: false,
          motivo: 'sin_destino',
          comoDecirlo: 'Pregúntale a dónde quiere ir. Una frase corta.'
        }
      }

      const via = abrirUrl(url)

      // Algunos pines llevan comillas en el nombre ("Catedral y \"la calle más bonita\""). Metidas
      // dentro de otra frase entrecomillada quedan anidadas, y lo que le llega al modelo es un
      // churro que puede acabar leyendo tal cual.
      const nombreLimpio = d.nombre.replace(/["“”]/g, '').trim()

      return {
        abierto: true,
        destino: d.nombre,
        via, // 'pestana' o 'misma' — útil para depurar desde los logs de la conversación
        // Se le dice si el destino salió del mapa de la app o si se lo pasamos a Google como texto.
        // No es un detalle: en el segundo caso Google puede resolverlo a otro sitio, y ella tiene
        // que dejar la puerta abierta a que se haya equivocado en vez de darlo por hecho.
        exacto: d.tipo === 'conocido',
        conMiUbicacion: posicion.ok,
        modo: 'transporte público',
        comoDecirlo: [
          `Google Maps YA está abierto en su pantalla, con el camino hasta "${nombreLimpio}" en transporte público.`,
          'No le digas que lo abra ella ni que lo mire en el teléfono: ya lo tiene delante.',
          d.tipo === 'conocido' ? '' : 'Ese sitio no está en el mapa de la app: se lo buscaste en Google, así que dile que compruebe que es el correcto.',
          posicion.ok ? '' : 'No se pudo leer su ubicación, así que el mapa no lleva punto de partida; puede que Google se lo pregunte.',
          NO_DESCRIBAS,
          'Una o dos frases como mucho.'
        ]
          .filter(Boolean)
          .join(' ')
      }
    }
  }
}

// Devuelve 'pestana' si se pudo abrir aparte, 'misma' si hubo que navegar la actual.
//
// Cuando toca navegar la pestaña actual, la respuesta de la herramienta se manda igual pero es
// probable que a Maite no le dé tiempo de decir su frase antes de que el teléfono cambie de app.
// No se compensa con un retraso artificial: el mapa apareciendo YA es la confirmación, y hacerla
// esperar dos segundos con la pantalla quieta se siente peor que quedarse a media frase.
function abrirUrl(url) {
  try {
    const v = window.open(url, '_blank', 'noopener,noreferrer')
    if (v) return 'pestana'
  } catch {
    // algunos navegadores lanzan en vez de devolver null
  }
  window.location.href = url
  return 'misma'
}
