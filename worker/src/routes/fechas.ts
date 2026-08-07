import { Hono } from 'hono'
import type { Env } from '../types.js'
import { leer, escribir, listar, esFechaValida, detectarSimultaneas, type FechaPropia } from '../lib/fechasStore.js'
import { fechaEnPamplona } from '../lib/tramitesStore.js'
import { espejarRadarSinRomper } from '../lib/kbRadar.js'

export const fechas = new Hono<{ Bindings: Env }>()

// Cada mutación del radar re-espeja el documento del KB de Maite EN SEGUNDO PLANO (waitUntil):
// la respuesta a la app no espera al KB, pero el documento queda regenerado — entero, sin
// duplicados — unos segundos después. Ver lib/kbRadar.ts para el porqué del regenerar-entero.
function espejarEnSegundoPlano(c: { env: Env; executionCtx: { waitUntil(p: Promise<unknown>): void } }) {
  try {
    c.executionCtx.waitUntil(espejarRadarSinRomper(c.env))
  } catch {
    // Fuera de Workers (tests locales) executionCtx no existe; el espejo se hará en la próxima.
  }
}

// GET /fechas — el radar entero: lo publicado por la universidad y lo que ella apuntó.
fechas.get('/fechas', async (c) => {
  const hoy = fechaEnPamplona()
  const { fechas: lista, avisoPortal } = await listar(c.env, hoy)
  const porVenir = lista.filter((f) => f.fecha >= hoy && !f.hecha)
  return c.json({
    hoy,
    fechas: lista,
    avisoPortal,
    // Sesiones oficiales que coinciden en fecha y hora con otra asignatura: no es que el radar las
    // repita, son dos eventos reales publicados por la universidad. Sin esto en pantalla parece un
    // fallo.
    simultaneas: detectarSimultaneas(porVenir),
    resumen: {
      total: lista.length,
      porVenir: porVenir.length,
      oficiales: lista.filter((f) => f.origen === 'oficial').length
    }
  })
})

// POST /fechas — {titulo, fecha, tipo, nota}. Una fecha suya.
fechas.post('/fechas', async (c) => {
  const b = await c.req.json<Partial<FechaPropia>>()
  const titulo = String(b.titulo || '').trim()
  if (!titulo) return c.json({ error: 'Falta el título' }, 400)
  if (!esFechaValida(b.fecha)) return c.json({ error: 'La fecha tiene que venir como AAAA-MM-DD' }, 400)
  const tipo = b.tipo === 'examen' || b.tipo === 'entrega' ? b.tipo : 'otro'

  const a = await leer(c.env)
  const nueva: FechaPropia = {
    id: `propia:${crypto.randomUUID()}`,
    titulo,
    fecha: b.fecha,
    tipo,
    ...(b.nota ? { nota: String(b.nota).slice(0, 300) } : {})
  }
  a.propias.push(nueva)
  await escribir(c.env, a)
  espejarEnSegundoPlano(c)
  return c.json({ ok: true, fecha: nueva })
})

// DELETE /fechas/:id — borra las suyas; las oficiales se ocultan, no se borran.
fechas.delete('/fechas/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const a = await leer(c.env)

  if (id.startsWith('oficial:')) {
    if (!a.ocultas.includes(id)) a.ocultas.push(id)
    a.hechas = a.hechas.filter((x) => x !== id)
    await escribir(c.env, a)
    espejarEnSegundoPlano(c)
    return c.json({ ok: true, accion: 'ocultada' })
  }

  const antes = a.propias.length
  a.propias = a.propias.filter((f) => f.id !== id)
  if (a.propias.length === antes) return c.json({ error: 'No tengo esa fecha' }, 404)
  a.hechas = a.hechas.filter((x) => x !== id)
  await escribir(c.env, a)
  espejarEnSegundoPlano(c)
  return c.json({ ok: true, accion: 'borrada' })
})

// POST /fechas/:id/hecha — {hecha: true|false}
fechas.post('/fechas/:id/hecha', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const b = await c.req.json<{ hecha?: boolean }>().catch(() => ({ hecha: true }))
  const a = await leer(c.env)

  if (b.hecha === false) {
    a.hechas = a.hechas.filter((x) => x !== id)
  } else if (!a.hechas.includes(id)) {
    a.hechas.push(id)
  }
  await escribir(c.env, a)
  espejarEnSegundoPlano(c)
  return c.json({ ok: true })
})

// POST /fechas/restaurar — devuelve al radar todas las oficiales que hubiera ocultado.
fechas.post('/fechas/restaurar', async (c) => {
  const a = await leer(c.env)
  const cuantas = a.ocultas.length
  a.ocultas = []
  await escribir(c.env, a)
  espejarEnSegundoPlano(c)
  return c.json({ ok: true, restauradas: cuantas })
})

// --- Consulta por voz --------------------------------------------------------------------
//
// GET /fechas/consulta — lo que viene, ya redactado. Maite pregunta esto cuando Carmen dice "¿qué
// tengo esta semana?" o "¿cuándo es el examen de…?".
fechas.get('/fechas/consulta', async (c) => {
  const hoy = fechaEnPamplona()
  const { fechas: lista } = await listar(c.env, hoy)
  const porVenir = lista.filter((f) => f.fecha >= hoy && !f.hecha).slice(0, 12)

  if (!porVenir.length) {
    return c.json({
      hay: 0,
      mensaje:
        'No tiene ninguna fecha por delante en el radar. Si te dice que sí tiene algo, dile que lo apunte en Académico → Radar de fechas para que te avise.'
    })
  }

  return c.json({
    hoy,
    hay: porVenir.length,
    fechas: porVenir.map((f) => ({
      titulo: f.titulo,
      fecha: f.fecha,
      hora: f.hora || null,
      aula: f.aula || null,
      dentroDeDias: Math.round((Date.parse(`${f.fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000),
      // Que sepa de dónde sale cada una, para no afirmar de más.
      esOficial: f.origen === 'oficial'
    })),
    comoDecirlo:
      'Las marcadas como oficiales salen del horario publicado por la universidad: puedes darlas por buenas con día, hora y aula, pero el portal NO dice si son examen, entrega o clase de correcciones, así que no lo llames "examen" salvo que Carmen lo haya llamado así. Las otras las apuntó ella. Di las fechas como se dicen hablando: "el martes 1 de diciembre", no "2026-12-01".'
  })
})

// --- Corrección por voz (server tool `corregir_radar`) -----------------------------------
//
// Para cuando el error se detecta EN LA CONVERSACIÓN: Carmen dice "no, el examen es el 15, no el
// 12" y Maite lo arregla ahí mismo, sin mandarla a la app a teclearlo. El cambio cae en el mismo
// almacén que usa la app (la pantalla del radar lo enseña corregido) y el espejo regenera el
// documento del KB — un solo dato en tres sitios, sin duplicados.
//
// La tool trabaja por TÍTULO y no por id a propósito: un agente de voz no tiene ids, tiene lo que
// Carmen dijo. Si el título matchea varias fechas, no se adivina: se devuelven las opciones y que
// Maite pregunte cuál.

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

fechas.post('/fechas/corregir', async (c) => {
  const b = await c.req
    .json<{
      accion?: string
      titulo?: string
      fecha?: string
      tipo?: string
      nota?: string
      tituloNuevo?: string
      fechaNueva?: string
    }>()
    .catch(() => ({}) as Record<string, never>)

  const accion = String(b.accion || '').toLowerCase()
  const titulo = String(b.titulo || '').trim()

  if (accion === 'agregar') {
    if (!titulo || !esFechaValida(b.fecha)) {
      return c.json({
        ok: false,
        mensaje: 'Para agregar necesito "titulo" y "fecha" en formato AAAA-MM-DD. Pregúntale a Carmen lo que falte.'
      })
    }
    const tipo = b.tipo === 'examen' || b.tipo === 'entrega' ? b.tipo : 'otro'
    const a = await leer(c.env)
    const nueva: FechaPropia = {
      id: `propia:${crypto.randomUUID()}`,
      titulo,
      fecha: b.fecha as string,
      tipo,
      ...(b.nota ? { nota: String(b.nota).slice(0, 300) } : {})
    }
    a.propias.push(nueva)
    await escribir(c.env, a)
    espejarEnSegundoPlano(c)
    return c.json({
      ok: true,
      accion: 'agregada',
      fecha: nueva,
      mensaje: `Apuntada: "${titulo}" el ${b.fecha}${tipo !== 'otro' ? ` como ${tipo}` : ''}. Ya aparece en el radar de la app y en tu base de conocimiento. Confírmaselo a Carmen en una frase.`
    })
  }

  if (accion !== 'corregir' && accion !== 'borrar') {
    return c.json({
      ok: false,
      mensaje: 'La acción tiene que ser "agregar", "corregir" o "borrar".'
    })
  }

  if (!titulo) {
    return c.json({ ok: false, mensaje: 'Dime el "titulo" (o parte) de la fecha que hay que tocar.' })
  }

  const hoy = fechaEnPamplona()
  const { fechas: lista } = await listar(c.env, hoy)
  const buscado = normalizarTexto(titulo)
  // Si además viene la fecha actual del registro, afina el match (dos entregas del mismo nombre).
  const candidatas = lista.filter(
    (f) => normalizarTexto(f.titulo).includes(buscado) && (!esFechaValida(b.fecha) || f.fecha === b.fecha)
  )

  if (!candidatas.length) {
    return c.json({
      ok: false,
      mensaje: `No encontré ninguna fecha del radar que se llame algo como "${titulo}". Pídele a Carmen el nombre tal como está apuntado, o agrega una nueva con accion=agregar.`
    })
  }
  if (candidatas.length > 1) {
    return c.json({
      ok: false,
      ambiguo: true,
      opciones: candidatas.map((f) => ({ titulo: f.titulo, fecha: f.fecha, origen: f.origen })),
      mensaje: 'Hay varias fechas que encajan. Pregúntale a Carmen cuál es (dile las opciones) y repite la llamada con el titulo exacto y su "fecha" actual.'
    })
  }

  const objetivo = candidatas[0]
  const a = await leer(c.env)

  if (accion === 'borrar') {
    if (objetivo.origen === 'oficial') {
      if (!a.ocultas.includes(objetivo.id)) a.ocultas.push(objetivo.id)
      a.hechas = a.hechas.filter((x) => x !== objetivo.id)
    } else {
      a.propias = a.propias.filter((f) => f.id !== objetivo.id)
      a.hechas = a.hechas.filter((x) => x !== objetivo.id)
    }
    await escribir(c.env, a)
    espejarEnSegundoPlano(c)
    return c.json({
      ok: true,
      accion: objetivo.origen === 'oficial' ? 'ocultada' : 'borrada',
      mensaje:
        objetivo.origen === 'oficial'
          ? `"${objetivo.titulo}" del ${objetivo.fecha} era una sesión oficial del portal: no se puede borrar, pero la oculté del radar. Si la universidad la vuelve a publicar, reaparecerá.`
          : `Borrada "${objetivo.titulo}" del ${objetivo.fecha}. El radar y tu base de conocimiento ya están al día.`
    })
  }

  // corregir
  if (objetivo.origen === 'oficial') {
    return c.json({
      ok: false,
      mensaje: `"${objetivo.titulo}" del ${objetivo.fecha} viene del horario oficial del portal y no se puede editar. Si Carmen dice que está mal, lo honesto es: ocultarla (accion=borrar) y apuntar la correcta como fecha suya (accion=agregar) — dile que haga eso, o hazlo tú si te lo confirma.`
    })
  }

  const propia = a.propias.find((f) => f.id === objetivo.id)
  if (!propia) return c.json({ ok: false, mensaje: 'Esa fecha ya no está. Vuelve a consultarme el radar.' })

  const cambios: string[] = []
  if (esFechaValida(b.fechaNueva)) {
    cambios.push(`fecha ${propia.fecha} → ${b.fechaNueva}`)
    propia.fecha = b.fechaNueva
  }
  if (b.tituloNuevo?.trim()) {
    cambios.push(`título "${propia.titulo}" → "${b.tituloNuevo.trim()}"`)
    propia.titulo = b.tituloNuevo.trim()
  }
  if (b.tipo === 'examen' || b.tipo === 'entrega' || b.tipo === 'otro') {
    if (b.tipo !== propia.tipo) cambios.push(`tipo ${propia.tipo} → ${b.tipo}`)
    propia.tipo = b.tipo
  }
  if (typeof b.nota === 'string') {
    propia.nota = b.nota.slice(0, 300) || undefined
    cambios.push('nota actualizada')
  }

  if (!cambios.length) {
    return c.json({
      ok: false,
      mensaje: 'No me dijiste qué cambiar. Manda "fechaNueva" (AAAA-MM-DD), "tituloNuevo", "tipo" o "nota".'
    })
  }

  await escribir(c.env, a)
  espejarEnSegundoPlano(c)
  return c.json({
    ok: true,
    accion: 'corregida',
    cambios,
    fecha: propia,
    mensaje: `Corregida "${propia.titulo}": ${cambios.join('; ')}. El radar de la app y tu base de conocimiento ya lo tienen. Confírmaselo a Carmen en una frase.`
  })
})
