#!/usr/bin/env node
//
// Registra las 10 server tools de Maite en ElevenLabs y las engancha al agente.
//
// Estructura verificada contra el OpenAPI oficial de ElevenLabs
// (https://api.elevenlabs.io/openapi.json, consultado el 26-jul-2026):
//
//   POST /v1/convai/tools    body: ToolRequestModel { tool_config }
//     tool_config -> WebhookToolConfig-Input, required: name, description, api_schema
//       type: const "webhook"
//       response_timeout_secs: entero entre 5 y 120 (default 20)
//       api_schema -> WebhookToolApiSchemaConfig-Input, required: url
//         method: enum GET|POST|PUT|PATCH|DELETE
//         query_params_schema -> QueryParamsJsonSchema, required: properties
//         request_body_schema -> ObjectJsonSchemaProperty (type/properties/required)
//     respuesta -> ToolResponseModel, con `id` garantizado
//
//   PATCH /v1/convai/agents/{agent_id}   para enganchar las tools por id
//     conversation_config.agent.prompt.tool_ids
//
// El único punto que el spec no fija es el anidamiento exacto de conversation_config (viene
// declarado como objeto libre). Por eso el script lee el agente ANTES de escribir y respeta la
// forma real que devuelva, en vez de asumirla.
//
// Uso:
//   export ELEVENLABS_API_KEY=...
//   export WORKER_URL=https://asistentecarmen.erictoled564.workers.dev
//   node scripts/registrar-tools-elevenlabs.mjs             # dry run: enseña qué mandaría
//   node scripts/registrar-tools-elevenlabs.mjs --aplicar   # crea las tools de verdad
//
// La API key NO se pasa por argumento a propósito: los argumentos quedan en el historial del
// shell y en la lista de procesos.

const API = 'https://api.elevenlabs.io/v1'
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_8701kyeepa7tffmr5475esyq7rtq'
const APLICAR = process.argv.includes('--aplicar')

const API_KEY = process.env.ELEVENLABS_API_KEY
const WORKER_URL = (process.env.WORKER_URL || '').replace(/\/$/, '')

if (!WORKER_URL) {
  console.error('Falta WORKER_URL. Despliega el Worker primero (npx wrangler deploy) y exporta su URL.')
  process.exit(1)
}
if (APLICAR && !API_KEY) {
  console.error('Falta ELEVENLABS_API_KEY.')
  process.exit(1)
}

// Las descripciones son las que el modelo lee para decidir cuándo llamar cada tool: son parte del
// prompt, no metadatos. Están alineadas con la sección TUS HERRAMIENTAS de
// docs/system-prompt-maite.md — si cambias una aquí, cámbiala allá.
const TOOLS = [
  {
    name: 'retrieve_memories',
    description:
      'Busca recuerdos guardados de conversaciones anteriores con Carmen, relevantes a lo que está diciendo ahorita. Úsalo al empezar la conversación y cuando algo suene a contexto pasado.',
    method: 'POST',
    path: '/memory/retrieve',
    body: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Palabras clave de lo que se quiere recordar. Vacío para traer los recuerdos más recientes.'
        },
        limite: { type: 'integer', description: 'Cuántos recuerdos traer como máximo (default 5).' }
      }
    }
  },
  {
    name: 'add_memories',
    description:
      'Guarda un recuerdo corto y concreto sobre Carmen para usarlo en conversaciones futuras. No lo uses para cada mensaje — solo para información que valga la pena recordar después (preferencias, preocupaciones, eventos, nombres de su gente).',
    method: 'POST',
    path: '/memory/add',
    body: {
      type: 'object',
      properties: {
        texto: {
          type: 'string',
          description:
            "El recuerdo en una o dos oraciones, en tercera persona (ej. 'Carmen tiene examen de Antropología el 14 de octubre y está nerviosa por eso')."
        },
        categoria: { type: 'string', description: "Etiqueta corta opcional (ej. 'académico', 'emocional', 'social')." }
      },
      required: ['texto']
    }
  },
  {
    name: 'iniciar_ruta',
    description:
      'Calcula la ruta a pie dentro del edificio de la Escuela de Arquitectura entre dos sitios, y devuelve el primer paso. Úsala cuando Carmen te diga dónde está y a dónde quiere ir dentro del edificio. Manda los nombres tal cual los dijo ella.',
    method: 'POST',
    path: '/ruta/iniciar',
    body: {
      type: 'object',
      properties: {
        origen: {
          type: 'string',
          description: "Dónde está Carmen ahora, con el nombre que ella usó ('la biblioteca', 'Seminario 3', 'la 1111')."
        },
        destino: { type: 'string', description: 'A dónde quiere llegar, con el nombre que ella usó.' }
      },
      required: ['origen', 'destino']
    }
  },
  {
    name: 'avanzar_ruta',
    description:
      'Devuelve el siguiente paso de una ruta que ya está en curso dentro del edificio. Llámala solo cuando Carmen confirme que llegó al punto de referencia del paso anterior.',
    method: 'POST',
    path: '/ruta/avanzar',
    body: {
      type: 'object',
      properties: {
        rutaId: {
          type: 'string',
          description:
            'El id de la ruta activa, tal como te lo dio iniciar_ruta o como viene en tu contexto si la ruta la empezó ella desde la app.'
        }
      },
      required: ['rutaId']
    }
  },
  {
    name: 'consultar_hora',
    description:
      'Consulta la hora actual en cualquier ciudad del mundo y su diferencia con Pamplona. Úsala cuando Carmen pregunte por la hora en un sitio que no sea donde ella está, Pamplona, o la ciudad de su familia.',
    method: 'GET',
    path: '/hora',
    query: {
      properties: {
        ciudad: {
          type: 'string',
          description:
            "Nombre de la ciudad en español ('Berlín', 'Nueva York') o identificador IANA de zona horaria ('Europe/Berlin'). Si conoces el IANA, mándalo."
        }
      },
      required: ['ciudad']
    }
  },
  {
    name: 'consultar_horario',
    description:
      'Comprueba si Carmen subió un horario más reciente que el del documento KB8, y devuelve las clases de un día. Llámala antes de contestar sobre clases, horas o aulas.',
    method: 'GET',
    path: '/horario/consulta',
    query: {
      properties: {
        dia: {
          type: 'string',
          description: "Día de la semana en español ('lunes', 'martes'…). Omítelo para la semana completa."
        }
      }
    }
  },
  {
    name: 'consultar_promedio',
    description:
      'Devuelve las calificaciones que Carmen ha registrado y su promedio ponderado por ECTS. Úsala cuando pregunte cómo va académicamente o por la mención de 4º.',
    method: 'GET',
    path: '/notas'
  },
  {
    name: 'consultar_calificaciones',
    description:
      'Devuelve, asignatura por asignatura, las notas parciales que Carmen ha metido (ejercicios, tests, examen final) con el peso de cada apartado, su media actual y cuánto necesita en lo que le falta para aprobar. Úsala cuando pregunte cómo va en UNA asignatura concreta o qué necesita sacar en un examen. Distinta de consultar_promedio, que es el expediente completo de la carrera.',
    method: 'GET',
    path: '/calificaciones/consulta',
    query: {
      properties: {
        materia: {
          type: 'string',
          description:
            "Nombre o parte del nombre de la asignatura ('Form and Image', 'geometrías'). Vacío devuelve todas las que tengan alguna nota."
        }
      }
    }
  },
  {
    name: 'consultar_fechas',
    description:
      'Devuelve lo que Carmen tiene por delante en su radar de fechas: las sesiones que la universidad publica fuera del horario semanal (con día, hora y aula) y las que ella misma apuntó. Úsala cuando pregunte qué tiene esta semana, cuándo es algo, o cuánto le falta para una entrega. Ojo: el portal NO dice cuáles son examen y cuáles entrega, así que no lo afirmes tú.',
    method: 'GET',
    path: '/fechas/consulta',
    query: { properties: {} }
  },
  {
    name: 'consultar_apuntes',
    description:
      'Busca en los apuntes que Carmen grabó en sus clases. Úsala antes de armar un quiz o explicar un tema, para trabajar sobre lo que dijo su profesor y no solo sobre el temario oficial.',
    method: 'GET',
    path: '/apuntes/buscar',
    query: {
      properties: {
        q: { type: 'string', description: 'El tema o las palabras clave. Vacío devuelve los apuntes más recientes.' },
        materia: { type: 'string', description: "Código de la asignatura ('KB9-2') para acotar la búsqueda. Opcional." }
      }
    }
  },
  {
    name: 'corregir_radar',
    description:
      'Corrige el radar de fechas de Carmen cuando el error se detecta hablando: ella dice "no, la entrega es el 15, no el 12" y tú lo arreglas al momento con esta tool — el cambio queda en la app y en tu base de conocimiento a la vez. Acciones: "agregar" (titulo + fecha AAAA-MM-DD, y tipo examen/entrega si lo dijo), "corregir" (titulo de la fecha existente + lo nuevo en fechaNueva/tituloNuevo/tipo/nota) y "borrar". Confirma SIEMPRE con Carmen lo que vas a cambiar antes de llamar, y lee el campo "mensaje" de la respuesta: te dice qué pasó y qué decirle.',
    method: 'POST',
    path: '/fechas/corregir',
    body: {
      type: 'object',
      required: ['accion'],
      properties: {
        accion: { type: 'string', description: "'agregar', 'corregir' o 'borrar'." },
        titulo: {
          type: 'string',
          description:
            'El nombre de la fecha, tal como Carmen lo dice. Para agregar es el título nuevo; para corregir/borrar es cómo se llama la que ya está (vale una parte del nombre).'
        },
        fecha: {
          type: 'string',
          description:
            'AAAA-MM-DD. Al agregar: la fecha del evento. Al corregir/borrar: la fecha ACTUAL del registro, para distinguir si hay dos con el mismo nombre. Opcional.'
        },
        fechaNueva: { type: 'string', description: 'Solo para corregir: la fecha correcta, AAAA-MM-DD.' },
        tituloNuevo: { type: 'string', description: 'Solo para corregir: el nombre correcto, si lo que estaba mal era el nombre.' },
        tipo: { type: 'string', description: "'examen', 'entrega' u 'otro'. Solo si Carmen lo dijo — no lo inventes." },
        nota: { type: 'string', description: 'Detalle que Carmen quiera dejar apuntado. Opcional.' }
      }
    }
  },
  {
    name: 'consultar_bibliografia',
    description:
      'Devuelve el libro (título y autor) que Carmen apuntó para una materia, si lo tiene. Úsala en modo estudio antes de explicar un tema, para poder referirte al libro por nombre — pero NO tienes su contenido, así que no inventes citas ni capítulos.',
    method: 'GET',
    path: '/bibliografia/consulta',
    query: {
      properties: {
        materia: {
          type: 'string',
          description: "Nombre o parte del nombre de la asignatura ('Antropología', 'geometrías')."
        }
      },
      required: ['materia']
    }
  },
  {
    name: 'simular_calificacion',
    description:
      'Calcula qué media necesita Carmen en lo que le falta de UNA asignatura para llegar a un promedio objetivo que ella elija — por ejemplo "qué necesito para que Diseño me quede en un 8,6". Distinta de consultar_calificaciones (que solo da el mínimo para aprobar): aquí el objetivo lo pone ella, no el 5. Nunca hagas esta cuenta de cabeza ni la estimes tú — llama siempre a la tool, es el mismo cálculo exacto que ve en su pantalla.',
    method: 'GET',
    path: '/calificaciones/simulador',
    query: {
      properties: {
        materia: {
          type: 'string',
          description: "Nombre o parte del nombre de la asignatura ('Creative Traditions', 'geometrías')."
        },
        objetivo: {
          type: 'string',
          description: 'La nota objetivo que Carmen quiere alcanzar en esa asignatura, entre 0 y 10 (por ejemplo "8.6").'
        }
      },
      required: ['materia', 'objetivo']
    }
  }
]

function cuerpoDeTool(t) {
  const api_schema = { url: `${WORKER_URL}${t.path}`, method: t.method }
  if (t.query) api_schema.query_params_schema = t.query
  if (t.body) api_schema.request_body_schema = t.body
  return {
    tool_config: {
      type: 'webhook',
      name: t.name,
      description: t.description,
      // 20s cubre de sobra: el endpoint más lento es una búsqueda en KV. Si se deja el default y
      // resulta ser corto, la tool falla a mitad de conversación y Maite se queda muda.
      response_timeout_secs: 20,
      api_schema
    }
  }
}

async function llamar(metodo, ruta, cuerpo) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  })
  const texto = await res.text()
  if (!res.ok) {
    // El cuerpo del error es lo único que dice si el schema está mal — imprimirlo entero ahorra
    // la ronda de adivinar.
    throw new Error(`${metodo} ${ruta} -> ${res.status}\n${texto}`)
  }
  return texto ? JSON.parse(texto) : {}
}

async function main() {
  console.log(`Worker:  ${WORKER_URL}`)
  console.log(`Agente:  ${AGENT_ID}`)
  console.log(`Modo:    ${APLICAR ? 'APLICAR (crea de verdad)' : 'dry run'}\n`)

  if (!APLICAR) {
    for (const t of TOOLS) {
      console.log(`--- ${t.name} (${t.method} ${WORKER_URL}${t.path}) ---`)
      console.log(JSON.stringify(cuerpoDeTool(t), null, 2))
      console.log()
    }
    console.log(`${TOOLS.length} tools. Vuelve a correr con --aplicar cuando el JSON se vea bien.`)
    return
  }

  // Se leen las tools que ya existan para poder correr esto dos veces sin duplicar nada. Es un
  // caso realista: si el script falla a mitad, o si hay que retocar una descripción, lo natural es
  // volver a lanzarlo — y ocho tools duplicadas con el mismo nombre confunden al modelo a la hora
  // de elegir cuál llamar.
  const existentes = await llamar('GET', '/convai/tools')
  const porNombre = new Map(
    (existentes.tools || []).map((t) => [t.tool_config?.name, t.id]).filter(([n]) => n)
  )
  if (porNombre.size) console.log(`Ya había ${porNombre.size} tool(s) en la cuenta.\n`)

  const ids = []
  for (const t of TOOLS) {
    const yaEsta = porNombre.get(t.name)
    if (yaEsta) {
      process.stdout.write(`Actualizando ${t.name}… `)
      await llamar('PATCH', `/convai/tools/${yaEsta}`, cuerpoDeTool(t))
      ids.push(yaEsta)
      console.log(yaEsta)
      continue
    }
    process.stdout.write(`Creando ${t.name}… `)
    const creada = await llamar('POST', '/convai/tools', cuerpoDeTool(t))
    if (!creada.id) throw new Error(`No vino el id de la tool:\n${JSON.stringify(creada, null, 2)}`)
    ids.push(creada.id)
    console.log(creada.id)
  }

  // Leer el agente ANTES de escribirlo, y modificar solo `tool_ids`.
  //
  // Esto no es prudencia de más: `conversation_config` viene declarado en el OpenAPI como objeto
  // libre, así que no hay garantía de que el PATCH haga merge profundo. Mandar
  // `{agent:{prompt:{tool_ids}}}` a secas podría reemplazar el objeto `prompt` entero y llevarse
  // por delante el system prompt de Maite — 5.800 palabras y varias sesiones de trabajo.
  console.log('\nLeyendo la configuración actual del agente…')
  const agente = await llamar('GET', `/convai/agents/${AGENT_ID}`)
  const cc = agente.conversation_config || {}
  const ag = cc.agent || {}
  // El GET devuelve `tools` (el formato inline antiguo) ADEMÁS de `tool_ids`. Reenviar los dos
  // hace que la API conteste 400 "Cannot specify both tools and tool IDs", así que se descarta y
  // se manda solo `tool_ids`, que es el formato vigente.
  const { tools: _inlineObsoletas, ...prompt } = ag.prompt || {}
  const largoPrompt = (prompt.prompt || '').length
  console.log(`  system prompt actual: ${largoPrompt} caracteres`)
  console.log(`  tools enganchadas ahora: ${(prompt.tool_ids || []).length}`)

  if (largoPrompt === 0) {
    console.log('\n  ⚠️  El agente no tiene system prompt cargado todavía.')
    console.log('     No es un error de este script, pero acuérdate de pegarlo:')
    console.log('     docs/system-prompt-maite.md, de ---INICIO--- para abajo.')
  }

  console.log(`\nEnganchando las ${ids.length} al agente…`)
  await llamar('PATCH', `/convai/agents/${AGENT_ID}`, {
    conversation_config: { ...cc, agent: { ...ag, prompt: { ...prompt, tool_ids: ids } } }
  })

  // Releer y comprobar de verdad, en vez de fiarse de que el PATCH devolvió 200.
  const despues = await llamar('GET', `/convai/agents/${AGENT_ID}`)
  const promptDespues = despues.conversation_config?.agent?.prompt || {}
  const enganchadas = (promptDespues.tool_ids || []).length
  const promptSigue = (promptDespues.prompt || '').length

  console.log(`\nComprobación tras el PATCH:`)
  console.log(`  tools enganchadas: ${enganchadas}/${ids.length} ${enganchadas === ids.length ? '✅' : '❌'}`)
  console.log(
    `  system prompt: ${promptSigue} caracteres ${promptSigue === largoPrompt ? '✅ intacto' : '❌ CAMBIÓ'}`
  )

  if (enganchadas === ids.length && promptSigue === largoPrompt) {
    console.log('\nListo. Haz la prueba de humo en voz de docs/webhooks-elevenlabs.md.')
  } else {
    console.log('\n⚠️  Algo no cuadra. Revisa el agente en el dashboard antes de seguir.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`)
  process.exit(1)
})
