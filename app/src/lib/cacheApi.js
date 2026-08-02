import { readJSON, writeJSON } from './storage.js'

// Lo último que sabíamos, para cuando no hay red.
//
// De dónde sale esto: un barrido de las 21 pantallas con el servidor caído. Cuatro se quedaban
// reducidas a una sola línea —"No pude cargar tus notas ahorita. Revisa tu conexión."— y nada más.
// Sin reintento, sin datos, sin salida. Y no eran datos secretos ni cambiantes: eran sus notas,
// sus fechas de entrega y sus trámites, cosas que la app YA había traído antes y que perfectamente
// podía seguir enseñando.
//
// Es el mismo fallo que tenía la ruta dentro del edificio, en otras cuatro pantallas: pedirle al
// servidor lo que ya se sabe, y quedarse en blanco cuando el servidor no está. Justo el momento en
// que ella más va a necesitar mirar cuándo era la entrega es en el metro, en un pasillo, o con el
// móvil sin datos a fin de mes.
//
// Qué hace: guarda la última respuesta buena y la devuelve si la siguiente falla, marcada con la
// fecha. La pantalla lo dice ("esto es de ayer"), porque enseñar datos viejos SIN avisar sería
// peor que no enseñar nada — es la clase de error que hace que se pierda una entrega.
const PREFIJO = 'cache:'

export function marcaDeCache(datos) {
  return datos?.__cache || null
}

/**
 * Envuelve una llamada a la api para que sobreviva sin red.
 *
 * - Si la llamada va bien: se guarda y se devuelve tal cual.
 * - Si falla y hay copia: se devuelve la copia con `__cache` = cuándo se guardó.
 * - Si falla y no hay copia: se propaga el error, que es la verdad — nunca se ha tenido el dato.
 */
export async function conCache(clave, llamada) {
  try {
    const datos = await llamada()
    writeJSON(PREFIJO + clave, { guardadoEn: new Date().toISOString(), datos })
    return datos
  } catch (err) {
    const copia = readJSON(PREFIJO + clave, null)
    if (!copia) throw err
    return { ...copia.datos, __cache: copia.guardadoEn }
  }
}

// "hoy", "ayer" o la fecha. Un ISO en pantalla no se lo lee nadie.
export function cuandoSeGuardo(iso) {
  if (!iso) return ''
  const guardado = new Date(iso)
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000)
  if (dias <= 0) return `hoy a las ${guardado.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}
