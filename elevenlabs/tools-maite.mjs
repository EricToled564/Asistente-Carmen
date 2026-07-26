// Definición de los 8 server tools (webhooks) del agente Maite, en el formato exacto que
// espera la API de ElevenLabs (POST /v1/convai/tools, campo `tool_config`).
//
// Este archivo es la fuente de verdad de la CONFIGURACIÓN; /docs/webhooks-elevenlabs.md es
// la fuente de verdad de la EXPLICACIÓN (cuándo llama Maite cada tool, qué hacer con cada
// respuesta). Si cambias algo aquí, refléjalo allá — y al revés.
//
// Contrato de la API verificado contra el SDK oficial @elevenlabs/elevenlabs-js:
//   tool_config.api_schema.query_params_schema  -> { properties, required }   (solo tipos literales)
//   tool_config.api_schema.request_body_schema  -> { type: 'object', properties, required }
//   tool_config.response_timeout_secs           -> entero entre 5 y 120

// Azúcar para no repetir `{ type: 'string', description: ... }` ocho veces.
const texto = (description) => ({ type: 'string', description })
const entero = (description) => ({ type: 'integer', description })

const query = (properties, required = []) => ({
  properties,
  ...(required.length ? { required } : {})
})

const cuerpo = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {})
})

/**
 * Construye los 8 tool_config con las URLs ya apuntando al Worker.
 * @param {string} baseUrl URL del Worker sin barra final, ej. https://companion-worker.eric.workers.dev
 */
export function construirTools(baseUrl) {
  const url = (ruta) => `${baseUrl}${ruta}`

  return [
    {
      type: 'webhook',
      name: 'retrieve_memories',
      description:
        'Busca recuerdos guardados de conversaciones anteriores con Carmen, relevantes a lo que está diciendo ahorita. Úsalo al empezar la conversación y cuando algo suene a contexto pasado.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/memory/retrieve'),
        method: 'POST',
        request_body_schema: cuerpo({
          query: texto(
            'Palabras clave de lo que se quiere recordar. Vacío para traer los recuerdos más recientes.'
          ),
          limite: entero('Cuántos recuerdos traer como máximo (default 5).')
        })
      }
    },

    {
      type: 'webhook',
      name: 'add_memories',
      description:
        'Guarda un recuerdo corto y concreto sobre Carmen para usarlo en conversaciones futuras. No lo uses para cada mensaje — solo para información que valga la pena recordar después (preferencias, preocupaciones, eventos, nombres de su gente).',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/memory/add'),
        method: 'POST',
        request_body_schema: cuerpo(
          {
            texto: texto(
              "El recuerdo en una o dos oraciones, en tercera persona (ej. 'Carmen tiene examen de Antropología el 14 de octubre y está nerviosa por eso')."
            ),
            categoria: texto("Etiqueta corta opcional (ej. 'académico', 'emocional', 'social').")
          },
          ['texto']
        )
      }
    },

    {
      type: 'webhook',
      name: 'iniciar_ruta',
      description:
        'Calcula la ruta a pie dentro del edificio de la Escuela de Arquitectura entre dos sitios, y devuelve el primer paso. Úsala cuando Carmen te diga dónde está y a dónde quiere ir dentro del edificio. Manda los nombres tal cual los dijo ella.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/ruta/iniciar'),
        method: 'POST',
        request_body_schema: cuerpo(
          {
            origen: texto(
              "Dónde está Carmen ahora, con el nombre que ella usó ('la biblioteca', 'Seminario 3', 'la 1111')."
            ),
            destino: texto('A dónde quiere llegar, con el nombre que ella usó.')
          },
          ['origen', 'destino']
        )
      }
    },

    {
      type: 'webhook',
      name: 'avanzar_ruta',
      description:
        'Devuelve el siguiente paso de una ruta que ya está en curso dentro del edificio. Llámala solo cuando Carmen confirme que llegó al punto de referencia del paso anterior.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/ruta/avanzar'),
        method: 'POST',
        request_body_schema: cuerpo(
          {
            rutaId: texto(
              'El id de la ruta activa, tal como te lo dio iniciar_ruta o como viene en tu contexto si la ruta la empezó ella desde la app.'
            )
          },
          ['rutaId']
        )
      }
    },

    {
      type: 'webhook',
      name: 'consultar_hora',
      description:
        'Consulta la hora actual en cualquier ciudad del mundo y su diferencia con Pamplona. Úsala cuando Carmen pregunte por la hora en un sitio que no sea Pamplona ni Ciudad de México, o cuando quiera saber si es buen momento para llamar a alguien en otro país.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/hora'),
        method: 'GET',
        query_params_schema: query(
          {
            ciudad: texto(
              "Nombre de la ciudad en español ('Berlín', 'Nueva York') o identificador IANA ('Europe/Berlin'). Si conoces el IANA, mándalo: no depende del diccionario de ciudades."
            )
          },
          ['ciudad']
        )
      }
    },

    {
      type: 'webhook',
      name: 'consultar_horario',
      description:
        'Comprueba si Carmen subió un horario más reciente que el del documento KB8, y devuelve las clases de un día. Llámala antes de contestar sobre clases, horas o aulas.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/horario/consulta'),
        method: 'GET',
        query_params_schema: query({
          dia: texto(
            "Día de la semana en español ('lunes', 'martes'…), con o sin acentos. Omítelo para traer la semana completa."
          )
        })
      }
    },

    {
      type: 'webhook',
      name: 'consultar_promedio',
      description:
        'Devuelve las calificaciones que Carmen ha registrado y su promedio ponderado por ECTS. Úsala cuando pregunte cómo va académicamente o por la mención de 4º.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/notas'),
        method: 'GET'
      }
    },

    {
      type: 'webhook',
      name: 'consultar_apuntes',
      description:
        'Busca en los apuntes que Carmen grabó en sus clases. Úsala antes de armar un quiz o explicar un tema, para trabajar sobre lo que dijo su profesor y no solo sobre el temario oficial.',
      response_timeout_secs: 20,
      api_schema: {
        url: url('/apuntes/buscar'),
        method: 'GET',
        query_params_schema: query({
          q: texto('El tema o las palabras clave. Vacío devuelve los apuntes más recientes.'),
          materia: texto("Código de la asignatura ('KB9-2') para acotar la búsqueda. Opcional.")
        })
      }
    }
  ]
}

/** Los nombres, en el orden en que se registran. Útil para logs y para el modo --verificar. */
export const NOMBRES = construirTools('https://x').map((t) => t.name)
