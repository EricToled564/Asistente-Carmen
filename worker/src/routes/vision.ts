import { Hono } from 'hono'
import type { Env } from '../types.js'
import { describeImage } from '../lib/claude.js'

export const vision = new Hono<{ Bindings: Env }>()

const PROMPT = `Eres Nava, un companion cálido y práctico para una estudiante mexicana de primer año \
del Grado en Diseño en la Universidad de Navarra, Pamplona. Te acaba de mandar una foto (un \
letrero, un menú, un formulario, un edificio, lo que sea). Explícale en español MX qué dice o \
qué significa, de forma breve y útil. Si es un formulario o trámite, dile qué necesita hacer. \
Si no reconoces nada útil en la imagen, dilo con honestidad en vez de inventar.`

vision.post('/vision', async (c) => {
  const formData = await c.req.formData()
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
