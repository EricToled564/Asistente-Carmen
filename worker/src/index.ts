import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types.js'
import { vision } from './routes/vision.js'
import { audio } from './routes/audio.js'
import { telegram } from './routes/telegram.js'
import { sos } from './routes/sos.js'
import { push } from './routes/push.js'
import { kbUpload } from './routes/kbUpload.js'
import { ejecutarAutoInvestigacionSemestral, ejecutarAutoInvestigacionMensual } from './cron/kbAutoResearch.js'
import { recordatorioSubirHorario, checkInProactivo } from './cron/pushReminders.js'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors()) // ajusta origin en producción si sirves el Worker en un dominio propio distinto de Pages

app.get('/', (c) => c.json({ ok: true, servicio: 'companion-worker' }))

app.route('/', vision)
app.route('/', audio)
app.route('/', telegram)
app.route('/', sos)
app.route('/', push)
app.route('/', kbUpload)

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '0 6 1 8 *':
      case '0 6 1 1 *':
        ctx.waitUntil(ejecutarAutoInvestigacionSemestral(env))
        break
      case '0 6 1 * *':
        ctx.waitUntil(ejecutarAutoInvestigacionMensual(env))
        break
      case '0 8 25 8 *':
      case '0 8 20 12 *':
        ctx.waitUntil(recordatorioSubirHorario(env))
        break
      case '0 9 * * *':
        ctx.waitUntil(checkInProactivo(env))
        break
      default:
        console.warn(`[cron] disparo no reconocido: ${event.cron}`)
    }
  }
}
