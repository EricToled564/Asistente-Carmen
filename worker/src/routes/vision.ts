import { Hono } from 'hono'
import type { Env } from '../types.js'
import { describeImage } from '../lib/claude.js'

export const vision = new Hono<{ Bindings: Env }>()

const PROMPT = `Eres Maite, un companion cálido y práctico para una estudiante mexicana de primer año \
del Grado en Diseño en la Universidad de Navarra, Pamplona. Te acaba de mandar una foto (un \
letrero, un menú, un formulario, un edificio, lo que sea). Explícale en español MX qué dice o \
qué significa, de forma breve y útil. Si es un formulario o trámite, dile qué necesita hacer. \
Si no reconoces nada útil en la imagen, dilo con honestidad en vez de inventar.`

vision.post('/vision', async (c) => {
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
  // @cloudflare/workers-types tipa FormData.get() como `string | null` únicamente; en runtime
  // sí devuelve File cuando el campo es un archivo — se castea explícitamente aquí.
  const image = formData.get('image') as unknown as File | null
  if (!(image instanceof File)) {
    return c.json({ error: 'Falta el campo "image"' }, 400)
  }

  const buffer = await image.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

  try {
    const texto = await describeImage(c.env.ANTHROPIC_API_KEY, base64, image.type || 'image/jpeg', PROMPT)
    return c.json({ texto })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No pude analizar la imagen' }, 502)
  }
})
