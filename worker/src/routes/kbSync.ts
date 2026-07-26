import { Hono } from 'hono'
import type { Env } from '../types.js'
import { setKbDocId } from '../lib/kbRegistry.js'

export const kbSync = new Hono<{ Bindings: Env }>()

// POST /kb-registrar-ids — rellena el registro `kb-doc-id:*` de KV solo, leyendo la base de
// conocimiento del agente en ElevenLabs.
//
// Por qué existe: sin ese registro, /kb-upload, /kb-answer y el cron de auto-investigación no
// pueden actualizar ningún documento (lo loguean y lo omiten). La forma "oficial" de llenarlo era
// correr 60 veces `wrangler kv key put`, a mano, copiando cada document_id del dashboard. Eso no
// se hace: se hace mal, o no se hace.
//
// Aquí el Worker se lo registra a sí mismo, porque ya tiene las dos piezas que hacen falta —
// acceso a KV y la API key de ElevenLabs. Una llamada y queda.
//
// El código de cada documento (KB1, KB9-31) se saca del NOMBRE con el que está subido, que
// empieza justo por ahí ("KB9-31 - Nota: Claves Culturales..."). Si algún día alguien sube uno con
// otro formato de nombre, sale en `sinCodigo` en vez de registrarse mal en silencio.

// "KB9-31 - Nota: ..." -> "KB9-31" · "KB2 — Plan..." -> "KB2"
function codigoDeNombre(nombre: string): string | null {
  const m = nombre.trim().match(/^(KB\d+(?:-\d+)?)/i)
  return m ? m[1].toUpperCase() : null
}

interface DocKB {
  id: string
  name: string
}

kbSync.post('/kb-registrar-ids', async (c) => {
  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json({ error: 'El Worker no tiene ELEVENLABS_API_KEY configurada' }, 500)
  }
  if (!c.env.ELEVENLABS_AGENT_ID) {
    return c.json({ error: 'El Worker no tiene ELEVENLABS_AGENT_ID configurada' }, 500)
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${c.env.ELEVENLABS_AGENT_ID}`, {
    headers: { 'xi-api-key': c.env.ELEVENLABS_API_KEY }
  })
  if (!res.ok) {
    return c.json({ error: `ElevenLabs respondió ${res.status} al leer el agente` }, 502)
  }

  const agente = (await res.json()) as {
    conversation_config?: { agent?: { prompt?: { knowledge_base?: DocKB[] } } }
  }
  // Se lee la KB DEL AGENTE, no la de la cuenta: la cuenta puede tener documentos de otros
  // proyectos, y registrar aquí el id de un documento que Maite ni siquiera consulta haría que
  // /kb-answer escribiera en el sitio equivocado.
  const documentos = agente.conversation_config?.agent?.prompt?.knowledge_base || []

  const registrados: Record<string, string> = {}
  const sinCodigo: string[] = []
  const duplicados: string[] = []

  for (const doc of documentos) {
    const codigo = codigoDeNombre(doc.name || '')
    if (!codigo) {
      sinCodigo.push(doc.name)
      continue
    }
    if (registrados[codigo]) {
      // Dos documentos con el mismo código: el registro es uno a uno, así que uno de los dos se
      // quedaría fuera. Se avisa en vez de elegir en silencio.
      duplicados.push(`${codigo}: "${doc.name}"`)
      continue
    }
    await setKbDocId(c.env, codigo, doc.id)
    registrados[codigo] = doc.id
  }

  return c.json({
    ok: true,
    total: documentos.length,
    registrados: Object.keys(registrados).length,
    codigos: Object.keys(registrados).sort(),
    sinCodigo,
    duplicados
  })
})
