const API_URL = 'https://api.resend.com/emails'

export async function enviarEmail(apiKey: string, opts: { to: string; from: string; subject: string; html: string }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, html: opts.html })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${text}`)
  }
}
