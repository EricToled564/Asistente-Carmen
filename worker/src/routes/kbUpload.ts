import { Hono } from 'hono'
import type { Env } from '../types.js'
import { describeImage, structureText } from '../lib/claude.js'
import { fusionarYActualizarKb } from '../lib/kbMerge.js'
import { getKbDocId } from '../lib/kbRegistry.js'
import { marcarHorarioActualizado, guardarHorarioEstructurado, type HorarioEstructurado } from '../lib/horarioEstado.js'

export const kbUpload = new Hono<{ Bindings: Env }>()

// Mecanismo B (self-service): a qué código de KB corresponde cada tipo del selector. El
// document_id real de cada código vive en el registro de KV (ver lib/kbRegistry.ts), no aquí.
// Antes solo había tres (horario/trámite/otro), y todo lo demás caía en "otro" → KB7, que es
// "cultura y vida diaria". O sea que un contrato de alquiler nuevo o un cambio de la tarjeta de
// transporte terminaba escrito en el documento equivocado, y Maite luego no lo encontraba al
// buscar por el tema correcto.
const TIPO_A_KB_CODE: Record<string, string> = {
  horario: 'KB8', // horario de clases
  alojamiento: 'KB3', // dónde vive, contrato, residencia
  campus: 'KB4', // edificios, servicios, biblioteca
  transporte: 'KB5', // villavesa, tarjetas, trenes
  tramite: 'KB6', // DNI, empadronamiento, banco, sanidad
  ocio: 'KB11', // sitios, planes, vida social
  seguridad: 'KB12', // recursos de seguridad y apoyo
  otro: 'KB7' // cultura y vida diaria: el cajón de sastre, ahora sí solo para lo que no encaja
}

const EXTRACCION_PROMPT = `Eres Maite. Te suben una foto o texto para actualizar el Knowledge Base de \
tu propio agente. Extrae el contenido útil y estructurable. Si NO reconoces esto como información \
estructurable (por ejemplo es una foto irrelevante o texto sin sentido), responde EXACTAMENTE con \
la palabra "ACLARACION" seguido de una pregunta corta pidiendo que se lo describan — nunca inventes \
contenido para rellenar. Si sí lo reconoces, responde solo con el contenido extraído en texto plano.`

function formatoPrompt(tipo: string) {
  return `Formatea el siguiente contenido como un documento markdown limpio para el Knowledge Base \
de un agente conversacional, tipo "${tipo}". Usa encabezados y viñetas donde tenga sentido. No \
agregues información que no esté en el contenido original.`
}

// Además del markdown para Maite, "horario" necesita una versión JSON estricta para que la app
// la pinte como tabla (ver components/academico/Horario.jsx) — es la única categoría de
// "Actualizar mi info" que se muestra visualmente en la app, no solo se lee en conversación.
const HORARIO_JSON_PROMPT = `A partir de este horario de clases en markdown, extrae los datos como JSON \
estricto, SIN texto extra antes o después, con esta forma exacta:
{"grupo": string, "cursoAcademico": string, "notas": string[], "clases": [{"dia": string, "hora": string, "materia": string, "aula": string}]}
"dia" debe ser exactamente uno de: "Lunes", "Martes", "Miércoles", "Jueves", "Viernes". Si no \
encuentras "grupo" o "cursoAcademico", usa cadena vacía. "notas" son advertencias o aclaraciones \
que aparezcan en el texto (materias duplicadas, semestre faltante, etc.) — arreglo vacío si no hay. \
No inventes clases que no estén en el texto original.`

async function extraerHorarioEstructurado(apiKey: string, markdown: string): Promise<HorarioEstructurado | null> {
  try {
    const jsonTexto = await structureText(apiKey, HORARIO_JSON_PROMPT, markdown)
    const parsed = JSON.parse(jsonTexto)
    if (!Array.isArray(parsed?.clases)) return null
    return {
      grupo: String(parsed.grupo || ''),
      cursoAcademico: String(parsed.cursoAcademico || ''),
      actualizadoEn: new Date().toISOString(),
      notas: Array.isArray(parsed.notas) ? parsed.notas.map(String) : [],
      clases: parsed.clases
    }
  } catch (err) {
    // Degradar con gracia: si la extracción JSON falla, el documento de Maite (markdown) ya se
    // actualizó bien — solo la vista visual en la app se queda con el horario anterior hasta el
    // siguiente intento. No vale la pena tumbar todo /kb-confirm por esto.
    console.error('[horario] no se pudo extraer JSON estructurado', err)
    return null
  }
}

kbUpload.post('/kb-upload', async (c) => {
  // Ver la nota en routes/vision.ts: sin este envoltorio, una petición sin formulario sale como
  // 500 (fallo del servidor) cuando en realidad es un 400 (petición mal formada).
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'La petición no trae un formulario válido (multipart/form-data)' }, 400)
  }
  const tipo = String(formData.get('tipo') || 'otro')
  // Ver nota en routes/vision.ts sobre el tipado incompleto de FormData.get() en workers-types.
  const imagen = formData.get('imagen') as unknown as File | null
  const texto = formData.get('texto')

  let contenidoCrudo = ''

  if (imagen instanceof File) {
    const buffer = await imagen.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    contenidoCrudo = await describeImage(c.env.ANTHROPIC_API_KEY, base64, imagen.type || 'image/jpeg', EXTRACCION_PROMPT)
  } else if (typeof texto === 'string' && texto.trim()) {
    contenidoCrudo = await structureText(c.env.ANTHROPIC_API_KEY, EXTRACCION_PROMPT, texto)
  } else {
    return c.json({ error: 'Sube una imagen o pega texto' }, 400)
  }

  if (contenidoCrudo.trim().startsWith('ACLARACION')) {
    return c.json({ necesitaAclaracion: true, mensaje: contenidoCrudo.replace('ACLARACION', '').trim() })
  }

  const markdown = await structureText(c.env.ANTHROPIC_API_KEY, formatoPrompt(tipo), contenidoCrudo)

  const uploadId = crypto.randomUUID()
  await c.env.KV.put(`kb-upload:${uploadId}`, JSON.stringify({ tipo, markdown }), { expirationTtl: 60 * 60 * 24 })

  return c.json({ uploadId, markdown, tipo })
})

kbUpload.post('/kb-confirm', async (c) => {
  const body = await c.req.json<{ uploadId: string; markdown: string; tipo: string }>()

  const kbCode = TIPO_A_KB_CODE[body.tipo]
  const documentId = kbCode ? await getKbDocId(c.env, kbCode) : null
  if (!documentId) {
    return c.json({ error: `Falta cargar el document_id de ${kbCode || body.tipo} en el registro de KV` }, 500)
  }

  try {
    // Fusionar, NO reemplazar. Antes esto escribía `body.markdown` como contenido completo del
    // documento: subir la foto de un recibo dejaba KB5 conteniendo solo ese recibo y borraba todo
    // lo demás sobre movilidad. Sin error, sin aviso — el agente simplemente dejaba de saber
    // cosas que sabía ayer.
    const resultado = await fusionarYActualizarKb(c.env, documentId, body.markdown, kbCode)
    if (!resultado.ok) {
      return c.json({ error: resultado.motivo }, 409)
    }
    await c.env.KV.delete(`kb-upload:${body.uploadId}`)
    if (body.tipo === 'horario') {
      await marcarHorarioActualizado(c.env)
      const estructurado = await extraerHorarioEstructurado(c.env.ANTHROPIC_API_KEY, body.markdown)
      if (estructurado) await guardarHorarioEstructurado(c.env, estructurado)
    }
    return c.json({ ok: true })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No se pudo actualizar el documento. Intenta de nuevo.' }, 502)
  }
})
