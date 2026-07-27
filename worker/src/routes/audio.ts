import { Hono } from 'hono'
import type { Env } from '../types.js'
import { transcribirAudio } from '../lib/elevenlabs.js'
import { structureText } from '../lib/claude.js'

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

  try {
    const transcripcion = await transcribirAudio(c.env.ELEVENLABS_API_KEY, file, file.name || 'audio.webm')
    if (!transcripcion.trim()) {
      return c.json({ texto: 'No detecté audio claro. ¿Puedes intentar de nuevo más cerca del micrófono?' })
    }
    const texto = await structureText(c.env.ANTHROPIC_API_KEY, SYSTEM_PROMPT, transcripcion)
    return c.json({ texto, transcripcion })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No pude procesar el audio' }, 502)
  }
})
