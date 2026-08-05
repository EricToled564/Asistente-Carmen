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

  // Campo opcional, solo lo manda el Atajo de iOS (la app web nunca lo incluye). Su presencia es
  // la señal de "guarda esto ya, no hay pantalla donde Carmen pueda revisarlo antes" — el atajo no
  // tiene forma de mostrarle un borrador para corregir ni de preguntarle la materia.
  const materia = formData.get('materia')

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
