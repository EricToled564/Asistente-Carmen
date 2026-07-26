const API_URL = 'https://api.resend.com/emails'

// `to` acepta un correo o varios separados por coma. Para una alerta de SOS, depender de que UNA
// persona tenga el móvil a mano es demasiado frágil: si esa está durmiendo, en una reunión o sin
// batería, el aviso no llega a nadie. Poner dos o tres direcciones no cuesta nada y multiplica la
// probabilidad de que alguien lo vea a tiempo.
export async function enviarEmail(
  apiKey: string,
  opts: { to: string; from: string; subject: string; html: string }
) {
  const destinatarios = opts.to
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
  if (destinatarios.length === 0) throw new Error('Resend: no hay destinatarios')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: opts.from, to: destinatarios, subject: opts.subject, html: opts.html })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${text}`)
  }
}
