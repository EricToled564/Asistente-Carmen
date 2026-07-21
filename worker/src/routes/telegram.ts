import { Hono } from 'hono'
import type { Env } from '../types.js'
import { transcribirAudio } from '../lib/elevenlabs.js'
import { structureText } from '../lib/claude.js'

export const telegram = new Hono<{ Bindings: Env }>()

const SYSTEM_PROMPT_CHAT = `Eres Nava, companion personal y cálido de una estudiante mexicana de \
primer año del Grado en Diseño en la Universidad de Navarra, Pamplona. Responde en español MX, \
tono cercano y práctico, nunca condescendiente. Si no sabes algo con certeza, dilo y sugiere a \
quién preguntarle (Secretaría, ADI, recepción) en vez de inventar.`

const SYSTEM_PROMPT_APUNTES = `Estructura esta transcripción cruda de una nota de voz post-clase \
en apuntes limpios: resumen breve, puntos clave en viñetas, y tareas/entregas mencionadas con \
fecha si la dijo. Español MX. No inventes nada que no esté en la transcripción.`

interface TelegramUpdate {
  message?: {
    chat: { id: number }
    text?: string
    voice?: { file_id: string }
    audio?: { file_id: string }
  }
}

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })
}

async function getFileUrl(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
  const data = (await res.json()) as { result: { file_path: string } }
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`
}

telegram.post('/telegram', async (c) => {
  const update = await c.req.json<TelegramUpdate>()
  const message = update.message
  if (!message) return c.json({ ok: true })

  const token = c.env.TELEGRAM_BOT_TOKEN
  const chatId = message.chat.id

  try {
    if (message.text) {
      const respuesta = await structureText(c.env.ANTHROPIC_API_KEY, SYSTEM_PROMPT_CHAT, message.text)
      await sendMessage(token, chatId, respuesta)
    } else if (message.voice || message.audio) {
      const fileId = (message.voice || message.audio)!.file_id
      const fileUrl = await getFileUrl(token, fileId)
      const audioRes = await fetch(fileUrl)
      const blob = await audioRes.blob()
      const transcripcion = await transcribirAudio(c.env.ELEVENLABS_API_KEY, blob, 'nota.ogg')
      const apuntes = await structureText(c.env.ANTHROPIC_API_KEY, SYSTEM_PROMPT_APUNTES, transcripcion)
      await sendMessage(token, chatId, apuntes)
    }
  } catch (err) {
    console.error(err)
    await sendMessage(token, chatId, 'Tuve un problema procesando eso. Intenta de nuevo en un rato.')
  }

  return c.json({ ok: true })
})
