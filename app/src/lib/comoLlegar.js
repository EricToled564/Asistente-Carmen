// Cómo llegar a un sitio de FUERA del edificio.
//
// Para moverse DENTRO de la Escuela de Arquitectura ya está `iniciar_ruta` / `avanzar_ruta`: el
// Worker tiene el plano del edificio y sabe decirle "sal del aula, gira a la izquierda, baja por
// la escalera del fondo". Eso funciona porque los datos existen.
//
// Fuera del edificio no existen. Y ahí es donde Maite se los inventaba: en una simulación, después
// de que `iniciar_ruta` contestara honestamente que no sabía, ella siguió igual y soltó "cruza la
// avenida hacia la acera sur y en unos cinco minutos lo tienes". Se lo acababa de inventar entero.
// Carmen se lo habría creído, porque suena a alguien que sabe.
//
// La salida no es enseñarle a Maite las calles de Pamplona —eso es un mapa, y ya hay uno bueno—
// sino quitarle el trabajo: que ABRA Google Maps con el destino puesto y se calle. Google pone el
// camino, ella no describe ninguno.
//
// Este archivo es solo la parte con lógica: de un nombre dicho en voz alta a una URL. Se separa
// del resto para poder probarlo sin navegador (ver comoLlegar.test.mjs). Abrirlo de verdad es
// cosa de clientTools.js.

export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras que Carmen va a decir de más y que no ayudan a distinguir un sitio de otro. "llévame a
// la biblioteca" y "la biblio" tienen que caer en el mismo pin.
//
// La lista es de palabras enteras y no de prefijos a propósito. Un prefijo tipo /^ens/ para cazar
// "enséñame" se comería también "Ensanche", y un pin que empieza por una sílaba prohibida deja de
// encontrarse sin que nadie se entere. Enumerar es más largo pero falla de forma visible: si falta
// una conjugación, el sitio no se reconoce y cae en la búsqueda por texto, que igual funciona.
const RUIDO = new Set([
  'a', 'al', 'la', 'el', 'los', 'las', 'de', 'del', 'un', 'una', 'mi', 'mis',
  'para', 'por', 'en', 'que', 'esta', 'con', 'hasta', 'pamplona', 'irunea', 'iruna',
  // preguntar
  'como', 'donde', 'cual', 'cuales', 'porfa', 'favor', 'ahora', 'ahorita', 'oye',
  // ir
  'ir', 'irme', 'voy', 'vamos', 'vaya', 'llego', 'llegar', 'llegamos', 'llega',
  'llevame', 'llevar', 'llevas', 'salir', 'salgo', 'volver', 'vuelvo', 'venir',
  // pedir
  'quiero', 'queria', 'quisiera', 'necesito', 'puedo', 'puedes', 'podrias', 'tengo',
  'dime', 'dile', 'sabes', 'ensename', 'muestrame', 'abre', 'abreme', 'ponme', 'busca',
  // el propio mapa
  'mapa', 'ruta', 'camino', 'direccion', 'direcciones', 'indicaciones', 'ubicacion'
])

function palabrasUtiles(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length > 2 && !RUIDO.has(p))
}

// Cuánto se parece lo que dijo Carmen a un lugar que conocemos.
//
// No es búsqueda difusa ni nada sofisticado: cuenta cuántas de sus palabras aparecen en el nombre
// del sitio. Deliberadamente NO mira las notas del pin, que son párrafos largos llenos de nombres
// de bares — "quiero ir al Milton" haría match con media lista si contaran.
function puntuar(consulta, lugar) {
  const nombre = normalizar(lugar.nombre)
  const palabras = palabrasUtiles(consulta)
  if (!palabras.length) return 0
  let aciertos = 0
  for (const p of palabras) {
    // Prefijo y no igualdad: "biblio" tiene que pegar con "biblioteca", y "arquitectura" con
    // "arquitectura" aunque el pin diga "Escuela Técnica Superior de Arquitectura".
    if (nombre.split(' ').some((n) => n.startsWith(p) || p.startsWith(n))) aciertos++
  }
  return aciertos / palabras.length
}

// Umbral alto a propósito. Equivocarse de pin es peor que no encontrarlo: si no lo encuentra, cae
// en la búsqueda por texto y Google resuelve; si acierta el pin equivocado, la manda con total
// seguridad a la otra punta de la ciudad.
const MINIMO_PARECIDO = 0.6

export function buscarLugar(consulta, lugares) {
  let mejor = null
  let mejorPuntos = 0
  for (const lugar of lugares) {
    if (typeof lugar?.lat !== 'number' || typeof lugar?.lng !== 'number') continue
    const puntos = puntuar(consulta, lugar)
    if (puntos > mejorPuntos) {
      mejorPuntos = puntos
      mejor = lugar
    }
  }
  return mejorPuntos >= MINIMO_PARECIDO ? mejor : null
}

function coord(n) {
  return Number(n).toFixed(6).replace(/\.?0+$/, '')
}

/**
 * La URL de Google Maps para ir de `origen` a `destino`, en transporte público.
 *
 * - `origen` es {lat,lng} (el GPS de Carmen) o null. Si es null no se pone el parámetro y Google
 *   usa la ubicación del teléfono por su cuenta; sale peor porque a veces pregunta, pero es mejor
 *   que inventarse un punto de partida.
 * - `destino` es {lat,lng} cuando lo reconocimos en nuestro mapa, o {consulta:'texto'} cuando no.
 *   Google acepta texto libre en `destination`, así que un sitio que nosotros no tenemos —una
 *   farmacia, el cine, la casa de una amiga— sigue funcionando.
 *
 * travelmode=transit porque el 90 % de sus trayectos son en villavesa y Pamplona tiene sus
 * autobuses en Google Transit.
 */
export function urlComoLlegar({ origen, destino }) {
  const partes = ['api=1', 'travelmode=transit']
  if (origen && Number.isFinite(origen.lat) && Number.isFinite(origen.lng)) {
    partes.push(`origin=${coord(origen.lat)},${coord(origen.lng)}`)
  }
  const d =
    destino && Number.isFinite(destino.lat) && Number.isFinite(destino.lng)
      ? `${coord(destino.lat)},${coord(destino.lng)}`
      : String(destino?.consulta || '').trim()
  if (!d) return null
  partes.push(`destination=${encodeURIComponent(d)}`)
  return `https://www.google.com/maps/dir/?${partes.join('&')}`
}

/**
 * De lo que Carmen dijo a lo que hay que abrir.
 *
 * `ciudad` se le pega a la búsqueda por texto y no es un detalle menor: "la catedral" a secas, sin
 * ciudad, le puede salir la de cualquier sitio. Va como parámetro y no fijo a "Pamplona" porque
 * en modo viaje Carmen no está en Pamplona, y mandarla a una catedral a mil kilómetros sería el
 * mismo fallo con otra cara.
 */
export function resolverDestino(texto, { lugares = [], ciudad = 'Pamplona, España' } = {}) {
  const limpio = String(texto || '').trim()
  if (!limpio) return null

  const pin = buscarLugar(limpio, lugares)
  if (pin) return { tipo: 'conocido', nombre: pin.nombre, lat: pin.lat, lng: pin.lng }

  // Si ya nombró la ciudad, no se la repetimos: "catedral de Pamplona, Pamplona, España" confunde
  // al buscador de Google más que ayudarlo.
  const yaTieneCiudad = normalizar(limpio).includes(normalizar(ciudad.split(',')[0]))
  return {
    tipo: 'busqueda',
    nombre: limpio,
    consulta: yaTieneCiudad ? limpio : `${limpio}, ${ciudad}`
  }
}
