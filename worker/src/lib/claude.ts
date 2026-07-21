// Helper delgado sobre la Claude API (Messages API). La API key vive SOLO aquí (secreto del
// Worker), nunca en el frontend.

const API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-5' // ajusta si prefieres otro modelo/costo

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

async function callClaude(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, ...body })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ content: Array<{ type: string; text?: string }> }>
}

function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n')
    .trim()
}

export async function describeImage(apiKey: string, base64Image: string, mediaType: string, prompt: string) {
  const content: ContentBlock[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
    { type: 'text', text: prompt }
  ]
  const response = await callClaude(apiKey, { messages: [{ role: 'user', content }] })
  return extractText(response)
}

export async function structureText(apiKey: string, systemPrompt: string, userText: string) {
  const response = await callClaude(apiKey, {
    system: systemPrompt,
    messages: [{ role: 'user', content: userText }]
  })
  return extractText(response)
}

/**
 * Investigación con web search para el mecanismo A de mantenimiento del KB.
 *
 * ⚠️ El tool "web_search" de la Claude API pudo haber cambiado de nombre/forma desde el
 * corte de conocimiento de este código — verifica el nombre exacto del tool y si requiere
 * un header beta en https://docs.claude.com antes de depender de esto en producción.
 */
export async function investigarFuente(apiKey: string, fuenteUrl: string, instrucciones: string) {
  const response = await callClaude(apiKey, {
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] as unknown as Record<string, unknown>[],
    messages: [
      {
        role: 'user',
        content: `Revisa la fuente oficial ${fuenteUrl}. ${instrucciones}\n\nResponde SOLO con JSON: {"cambios": boolean, "contenido_nuevo": string, "resumen_del_cambio": string, "fuente_citada": string}`
      }
    ]
  })
  return extractText(response)
}
