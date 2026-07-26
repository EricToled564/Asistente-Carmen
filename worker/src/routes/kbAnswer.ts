import { Hono } from 'hono'
import type { Env } from '../types.js'
import { structureText } from '../lib/claude.js'
import { getKbDocument } from '../lib/elevenlabs.js'
import { fusionarYActualizarKb } from '../lib/kbMerge.js'
import { getKbDocId } from '../lib/kbRegistry.js'
import { agregarRecuerdo } from '../lib/memoryStore.js'
import { CATALOGO_PREGUNTAS } from '../config/preguntasActualizacion.js'

export const kbAnswer = new Hono<{ Bindings: Env }>()

// Mecanismo C: preguntas cortas y de bajo riesgo — sin vista previa (a diferencia del mecanismo B
// de /kb-upload, que sí la tiene porque mueve documentos completos). Aun así, nunca actualiza el
// KB si la confianza de la interpretación es baja: en ese caso pide aclaración.

kbAnswer.get('/kb-answer/catalogo', (c) => c.json({ preguntas: CATALOGO_PREGUNTAS }))

const PROMPT_INTERPRETAR = `Eres Maite. Te llega la respuesta corta de Carmen a una pregunta de \
actualización de su Knowledge Base, junto con el contenido actual del documento que podría cambiar. \
Decide si la respuesta es lo bastante clara para actualizar el documento con confianza, o si es \
ambigua y hay que pedir que la aclare.

Responde SOLO con JSON: {"confianza": "alta"|"baja", "contenido_actualizado": string, "razon_si_baja": string}

Si confianza es "alta", "contenido_actualizado" debe ser el documento completo en markdown con el \
cambio integrado (mantén todo lo demás igual, no inventes datos nuevos). Si confianza es "baja", \
deja "contenido_actualizado" vacío y explica en "razon_si_baja" qué te haría falta para estar seguro.`

kbAnswer.post('/kb-answer', async (c) => {
  const body = await c.req.json<{ preguntaId?: string; respuesta?: string }>()
  const pregunta = CATALOGO_PREGUNTAS.find((p) => p.id === body.preguntaId)

  if (!pregunta) {
    return c.json({ error: 'preguntaId no reconocido' }, 400)
  }
  if (!body.respuesta?.trim()) {
    return c.json({ error: 'Falta "respuesta"' }, 400)
  }

  // "libre" no tiene documento fijo — se guarda como memoria de Maite en vez de PATCH a un KB.
  if (pregunta.kbCode === 'libre') {
    const recuerdo = await agregarRecuerdo(c.env, body.respuesta, 'preguntas-actualizacion')
    return c.json({ ok: true, guardadoComo: 'memoria', recuerdo })
  }

  const documentId = await getKbDocId(c.env, pregunta.kbCode)
  if (!documentId) {
    return c.json({ error: `Falta cargar el document_id de ${pregunta.kbCode} en el registro de KV` }, 500)
  }

  try {
    const actual = await getKbDocument(c.env.ELEVENLABS_API_KEY, documentId)
    const raw = await structureText(
      c.env.ANTHROPIC_API_KEY,
      PROMPT_INTERPRETAR,
      `Pregunta: ${pregunta.pregunta}\nRespuesta de Carmen: ${body.respuesta}\n\nDocumento actual (${pregunta.kbCode}):\n${actual}`
    )

    let interpretacion: { confianza: 'alta' | 'baja'; contenido_actualizado: string; razon_si_baja: string }
    try {
      interpretacion = JSON.parse(raw)
    } catch {
      return c.json({ necesitaAclaracion: true, mensaje: '¿Me lo puedes explicar con otras palabras?' })
    }

    if (interpretacion.confianza !== 'alta') {
      return c.json({
        necesitaAclaracion: true,
        mensaje: interpretacion.razon_si_baja || '¿Me lo puedes explicar con otras palabras?'
      })
    }

    // Pasa por la fusión con su red de seguridad aunque el modelo ya haya devuelto el documento
    // completo: `actual` puede venir vacío si la lectura falló, y en ese caso lo que el modelo
    // "actualizó" es un documento construido de la nada que borraría el real. El guardia de
    // proporción es lo único que detiene eso.
    const resultado = await fusionarYActualizarKb(c.env, documentId, interpretacion.contenido_actualizado)
    if (!resultado.ok) {
      return c.json({ error: resultado.motivo }, 409)
    }
    return c.json({ ok: true, guardadoComo: pregunta.kbCode })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'No se pudo procesar tu respuesta. Intenta de nuevo.' }, 502)
  }
})
