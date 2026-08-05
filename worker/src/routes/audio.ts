import { Hono } from 'hono'
import type { Env } from '../types.js'
import { transcribirAudio } from '../lib/elevenlabs.js'
import { structureText } from '../lib/claude.js'
import { guardarApunte } from '../lib/apuntesStore.js'
import { agregarApunteAlKb } from '../lib/kbApuntes.js'
import { PLAN_ESTUDIOS } from '../data/planEstudios.js'

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// El Atajo solo puede mandar el NOMBRE de la materia (una sola variable de texto, ver
// data/atajos.js en la app) — no su kbCode. Si el nombre coincide con una del plan de estudios, se
// guarda con su kbCode real y entra en el mismo cajón que las clases grabadas desde la app. Si no
// coincide (Carmen eligió "Otras" y escribió un tema libre), se guarda igual pero sin kbCode.
function kbCodePorTitulo(materia: string): string | undefined {
  const objetivo = normalizar(materia)
  for (const bloque of PLAN_ESTUDIOS) {
    const encontrada = bloque.materias.find((m) => normalizar(m.titulo) === objetivo)
    if (encontrada) return encontrada.kbCode
  }
  return undefined
}

export const audio = new Hono<{ Bindings: Env }>()

// La materia que Carmen eligió en la app JUSTO ANTES de lanzar el Atajo de grabar.
//
// Existe porque la vía "bonita" (pasar la materia como Entrada de atajo por la URL
// shortcuts://run-shortcut) falló en el teléfono real: la petición llegaba al Worker sin el campo
// `materia`, y no hay forma de depurar el porqué desde fuera de un iPhone. Esta vía no depende de
// iOS para nada: la app lo manda por HTTP normal (que está probado), el Worker lo aparca en KV, y
// cuando el audio del Atajo llega sin materia, se usa lo aparcado.
//
// TTL corto a propósito: es un "voy a grabar AHORA", no una preferencia. Si la grabación nunca
// llega (se arrepintió, se quedó sin batería), caduca solo y no contamina una grabación de días
// después.
const KEY_PROXIMA_MATERIA = 'audio:proximaMateria'
const TTL_PROXIMA_MATERIA = 60 * 60 // 1 hora: clase larga entre "elegir" y "terminar de grabar"

audio.post('/audio/proxima-materia', async (c) => {
  const body = await c.req.json<{ materia?: string }>().catch(() => ({ materia: undefined }))
  if (!body.materia?.trim()) return c.json({ error: 'Falta "materia"' }, 400)
  await c.env.KV.put(KEY_PROXIMA_MATERIA, body.materia.trim(), { expirationTtl: TTL_PROXIMA_MATERIA })
  return c.json({ ok: true, materia: body.materia.trim() })
})

// La grabación desde la propia app (CapturaRapida) tiene su propio flujo de revisar-y-guardar y
// no debe heredar una materia aparcada: se limpia al empezar a grabar ahí.
audio.delete('/audio/proxima-materia', async (c) => {
  await c.env.KV.delete(KEY_PROXIMA_MATERIA)
  return c.json({ ok: true })
})

const SYSTEM_PROMPT = `Eres Maite, companion académico de una estudiante de Diseño en la Universidad \
de Navarra. Te llega la transcripción cruda de una grabación corta que hizo justo después de \
clase (notas dictadas de viva voz, puede tener muletillas o desorden). Estructura esto en \
apuntes limpios en español MX: 1) resumen de 2-3 líneas, 2) puntos clave en viñetas, 3) tareas \
o entregas mencionadas con su fecha si la dijo. No inventes información que no esté en el audio.`

audio.post('/audio', async (c) => {
  // formData() revienta si el cuerpo no es multipart o viene vacío, y esa excepción salía como
  // un 500. Un 500 dice "el servidor se rompió" y manda a buscar el fallo en el sitio equivocado;
  // esto es un error del cliente, que mandó mal la petición. Envolverlo lo convierte en el 400
  // que corresponde — y de paso hace que la validación de abajo llegue a ejecutarse alguna vez.
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'La petición no trae un formulario válido (multipart/form-data)' }, 400)
  }
  // Ver nota en routes/vision.ts sobre el tipado incompleto de FormData.get() en workers-types.
  const file = formData.get('audio') as unknown as File | null
  if (!(file instanceof File)) {
    return c.json({ error: 'Falta el campo "audio"' }, 400)
  }

  // Campo opcional. Su presencia es la señal de "guarda esto ya como apunte": lo mandan tanto el
  // Atajo de iOS como la grabación de la propia app (que elige materia ANTES de grabar y guarda
  // directo, mismo número de toques que el Atajo).
  // OJO: puede llegar como texto plano O como archivo. Atajos de iOS, al poner una variable en un
  // campo de formulario, puede mandarla como adjunto de texto en vez de como string — y la primera
  // versión de esto exigía string, así que una materia que SÍ venía llena se descartaba en
  // silencio y la respuesta era "Ok" sin guardar nada. Aceptar los dos formatos cierra ese hueco.
  const materiaDelFormulario = formData.get('materia') as unknown as string | File | null
  let materia: string | null = null
  if (typeof materiaDelFormulario === 'string') {
    materia = materiaDelFormulario.trim() || null
  } else if (materiaDelFormulario instanceof File) {
    materia = (await materiaDelFormulario.text()).trim() || null
  }

  // Respaldo: si el Atajo no trajo la materia (la Entrada de atajo llegó vacía — pasó en el
  // teléfono real), se usa la que la app aparcó al tocar "Grabar clase". Se consume al usarla:
  // vale para UNA grabación, no es un estado que se quede pegado.
  if (!materia) {
    const aparcada = await c.env.KV.get(KEY_PROXIMA_MATERIA)
    if (aparcada) {
      materia = aparcada
      await c.env.KV.delete(KEY_PROXIMA_MATERIA)
    }
  }

  try {
    const transcripcion = await transcribirAudio(c.env.ELEVENLABS_API_KEY, file, file.name || 'audio.webm')
    if (!transcripcion.trim()) {
      return c.json({ texto: 'No detecté audio claro. ¿Puedes intentar de nuevo más cerca del micrófono?' })
    }
    const texto = await structureText(c.env.ANTHROPIC_API_KEY, SYSTEM_PROMPT, transcripcion)

    if (typeof materia === 'string' && materia.trim()) {
      const materiaTexto = materia.trim()
      const apunte = await guardarApunte(c.env, {
        kbCode: kbCodePorTitulo(materiaTexto),
        materia: materiaTexto,
        apuntes: texto,
        transcripcion
      })
      // No bloquea la respuesta ni la deshace si falla: el apunte ya está a salvo en KV en este
      // punto (mismo razonamiento que en routes/apuntes.ts).
      const kb = await agregarApunteAlKb(c.env, apunte).catch((err) => {
        console.error('[audio] no se pudo llevar el resumen al KB', err)
        return { ok: false as const, motivo: 'No se pudo actualizar la base de conocimiento de Maite.' }
      })
      return c.json({ texto, transcripcion, guardado: true, apunte, kb })
    }

    return c.json({ texto, transcripcion })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No pude procesar el audio' }, 502)
  }
})
