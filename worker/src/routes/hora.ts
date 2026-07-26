import { Hono } from 'hono'
import type { Env } from '../types.js'

export const hora = new Hono<{ Bindings: Env }>()

// Consulta de hora en cualquier ciudad del mundo, para que Maite pueda responder "¿qué hora es
// en Berlín?" sin calcularlo de memoria.
//
// Por qué es un webhook y no algo que resuelva el modelo: la aritmética de husos horarios se
// falla en silencio. Hay que saber si ese país aplica horario de verano, si lo aplica en las
// mismas fechas que España, y si lo cambió hace poco (México dejó de aplicarlo en 2022, Chile y
// varios países lo han movido). Un modelo puede afirmar con total seguridad una hora equivocada.
// Aquí lo calcula el runtime con la base de datos IANA de zonas horarias, que ya trae todas esas
// reglas y se actualiza sola.
//
// El agente puede mandar el identificador IANA directamente ("Europe/Berlin") — los modelos los
// conocen bien — o el nombre de la ciudad en español, que se resuelve con el diccionario de
// abajo. Cualquiera de los dos funciona.

// Ciudades que Carmen podría preguntar de verdad: donde vive, su casa, y los destinos típicos de
// una estudiante en Europa o con familia repartida. No pretende ser exhaustivo: si la ciudad no
// está aquí, el agente manda el identificador IANA y funciona igual.
const CIUDADES: Record<string, string> = {
  pamplona: 'Europe/Madrid',
  madrid: 'Europe/Madrid',
  barcelona: 'Europe/Madrid',
  espana: 'Europe/Madrid',
  'ciudad de mexico': 'America/Mexico_City',
  cdmx: 'America/Mexico_City',
  mexico: 'America/Mexico_City',
  monterrey: 'America/Monterrey',
  guadalajara: 'America/Mexico_City',
  cancun: 'America/Cancun',
  tijuana: 'America/Tijuana',
  berlin: 'Europe/Berlin',
  paris: 'Europe/Paris',
  londres: 'Europe/London',
  roma: 'Europe/Rome',
  lisboa: 'Europe/Lisbon',
  amsterdam: 'Europe/Amsterdam',
  bruselas: 'Europe/Brussels',
  viena: 'Europe/Vienna',
  praga: 'Europe/Prague',
  dublin: 'Europe/Dublin',
  atenas: 'Europe/Athens',
  estambul: 'Europe/Istanbul',
  'nueva york': 'America/New_York',
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  chicago: 'America/Chicago',
  miami: 'America/New_York',
  toronto: 'America/Toronto',
  bogota: 'America/Bogota',
  lima: 'America/Lima',
  santiago: 'America/Santiago',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  'sao paulo': 'America/Sao_Paulo',
  tokio: 'Asia/Tokyo',
  pekin: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  dubai: 'Asia/Dubai',
  sidney: 'Australia/Sydney',
  sydney: 'Australia/Sydney'
}

// Quita acentos y normaliza para que "Berlín", "berlin" y "BERLÍN" encuentren lo mismo.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function resolverZona(entrada: string): string | null {
  const limpio = entrada.trim()
  // Si ya viene como identificador IANA ("Europe/Berlin"), se usa tal cual — pero se valida
  // abajo, para no devolver una hora inventada si el modelo se equivocó al escribirlo.
  if (limpio.includes('/')) return limpio
  return CIUDADES[normalizar(limpio)] || null
}

function esZonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: zona })
    return true
  } catch {
    return false
  }
}

// GET /hora?ciudad=Berlin — devuelve la hora ahí y la diferencia con Pamplona, ya masticada para
// que el agente solo tenga que leerla en voz.
hora.get('/hora', (c) => {
  const ciudad = c.req.query('ciudad') || ''
  if (!ciudad.trim()) {
    return c.json({ error: 'Falta el parámetro "ciudad"' }, 400)
  }

  const zona = resolverZona(ciudad)
  if (!zona || !esZonaValida(zona)) {
    return c.json({
      encontrada: false,
      mensaje: `No reconozco la zona horaria de "${ciudad}". Pregúntale a Carmen el país o dilo con el nombre completo de la ciudad.`
    })
  }

  const ahora = new Date()
  const enZona = (zonaHoraria: string, opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-ES', { timeZone: zonaHoraria, ...opciones }).format(ahora)

  // La diferencia se calcula comparando la misma marca de tiempo formateada en ambas zonas, en
  // vez de restar offsets a mano: así el horario de verano de cada país ya viene aplicado.
  const marcaEn = (zonaHoraria: string) =>
    new Date(ahora.toLocaleString('en-US', { timeZone: zonaHoraria })).getTime()
  // En minutos, no en horas: hay zonas con desfase de media hora (India, Nepal, partes de
  // Australia). Redondear a horas enteras daría "cuatro horas" para India, que son tres y media.
  const diferenciaMinutos = Math.round((marcaEn(zona) - marcaEn('Europe/Madrid')) / 60000)
  const diferenciaHoras = diferenciaMinutos / 60

  const horaLocal = enZona(zona, { hour: '2-digit', minute: '2-digit' })
  const diaLocal = enZona(zona, { weekday: 'long', day: 'numeric', month: 'long' })

  // Texto ya redactado para leerse en voz, incluidas las medias horas ("tres horas y media").
  const abs = Math.abs(diferenciaMinutos)
  const horasEnteras = Math.floor(abs / 60)
  const minutosSueltos = abs % 60
  let magnitud = `${horasEnteras} ${horasEnteras === 1 ? 'hora' : 'horas'}`
  if (minutosSueltos === 30) magnitud = horasEnteras === 0 ? 'media hora' : `${magnitud} y media`
  else if (minutosSueltos > 0) magnitud = `${magnitud} y ${minutosSueltos} minutos`

  let relacion: string
  if (diferenciaMinutos === 0) relacion = 'la misma hora que en Pamplona'
  else if (diferenciaMinutos > 0) relacion = `${magnitud} por delante de Pamplona`
  else relacion = `${magnitud} por detrás de Pamplona`

  return c.json({
    encontrada: true,
    ciudad: ciudad.trim(),
    zonaHoraria: zona,
    hora: horaLocal,
    dia: diaLocal,
    diferenciaHoras,
    relacion,
    horaEnPamplona: enZona('Europe/Madrid', { hour: '2-digit', minute: '2-digit' })
  })
})
