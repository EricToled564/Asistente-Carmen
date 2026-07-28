// Ciudades para el reloj secundario de Inicio: "la hora de casa" cuando está en Pamplona, y "dónde
// estoy" cuando activa el modo viaje.
//
// Antes eran ocho, elegidas a ojo. Ocho no cubren nada: su familia está repartida por México, sus
// amigas se van de Erasmus, y ella misma va a viajar. En cuanto la ciudad que busca no está, la
// función deja de servir y no hay salida — no se puede escribir una a mano.
//
// Escribir libre tampoco vale por sí solo: de un texto no sale una zona horaria, y sin zona no se
// puede calcular ninguna hora. Por eso es una lista amplia CON BUSCADOR: ella escribe y filtra,
// pero lo que se guarda siempre es un identificador IANA válido.
//
// Sobre México, que es lo que más va a usar: el país tiene ocho zonas distintas y en 2022 abolió
// el horario de verano salvo en la franja fronteriza. Poner "México = America/Mexico_City" para
// todo daría una hora equivocada en Tijuana, Hermosillo, Cancún o Chihuahua. Cada ciudad lleva la
// suya, y la base de datos IANA se encarga de las reglas.
//
// `alias` son las formas alternativas con las que puede buscarla (sin acentos, nombre en otro
// idioma, apodo). No se muestran; solo sirven para que el buscador la encuentre.

export const CIUDADES_REFERENCIA = [
  // --- México ---------------------------------------------------------------------------
  { nombre: 'Ciudad de México', tz: 'America/Mexico_City', pais: 'México', alias: ['cdmx', 'df', 'mexico city'] },
  { nombre: 'Guadalajara', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Monterrey', tz: 'America/Monterrey', pais: 'México' },
  { nombre: 'Puebla', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Querétaro', tz: 'America/Mexico_City', pais: 'México', alias: ['queretaro'] },
  { nombre: 'León', tz: 'America/Mexico_City', pais: 'México', alias: ['leon'] },
  { nombre: 'Toluca', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'San Luis Potosí', tz: 'America/Mexico_City', pais: 'México', alias: ['san luis potosi', 'slp'] },
  { nombre: 'Aguascalientes', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Morelia', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Cuernavaca', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Veracruz', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Oaxaca', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Tuxtla Gutiérrez', tz: 'America/Mexico_City', pais: 'México', alias: ['tuxtla', 'chiapas'] },
  { nombre: 'Villahermosa', tz: 'America/Mexico_City', pais: 'México', alias: ['tabasco'] },
  { nombre: 'Acapulco', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Pachuca', tz: 'America/Mexico_City', pais: 'México' },
  { nombre: 'Saltillo', tz: 'America/Monterrey', pais: 'México', alias: ['coahuila'] },
  { nombre: 'Torreón', tz: 'America/Monterrey', pais: 'México', alias: ['torreon'] },
  { nombre: 'Tampico', tz: 'America/Monterrey', pais: 'México' },
  { nombre: 'Reynosa', tz: 'America/Matamoros', pais: 'México' },
  { nombre: 'Matamoros', tz: 'America/Matamoros', pais: 'México' },
  { nombre: 'Nuevo Laredo', tz: 'America/Matamoros', pais: 'México' },
  { nombre: 'Mérida', tz: 'America/Merida', pais: 'México', alias: ['merida', 'yucatan'] },
  { nombre: 'Campeche', tz: 'America/Merida', pais: 'México' },
  { nombre: 'Cancún', tz: 'America/Cancun', pais: 'México', alias: ['cancun', 'quintana roo'] },
  { nombre: 'Playa del Carmen', tz: 'America/Cancun', pais: 'México' },
  { nombre: 'Tulum', tz: 'America/Cancun', pais: 'México' },
  { nombre: 'Cozumel', tz: 'America/Cancun', pais: 'México' },
  { nombre: 'Chihuahua', tz: 'America/Chihuahua', pais: 'México' },
  { nombre: 'Ciudad Juárez', tz: 'America/Ciudad_Juarez', pais: 'México', alias: ['ciudad juarez', 'juarez'] },
  { nombre: 'Culiacán', tz: 'America/Mazatlan', pais: 'México', alias: ['culiacan', 'sinaloa'] },
  { nombre: 'Mazatlán', tz: 'America/Mazatlan', pais: 'México', alias: ['mazatlan'] },
  { nombre: 'Tepic', tz: 'America/Mazatlan', pais: 'México', alias: ['nayarit'] },
  { nombre: 'Puerto Vallarta', tz: 'America/Bahia_Banderas', pais: 'México', alias: ['vallarta'] },
  { nombre: 'La Paz', tz: 'America/Mazatlan', pais: 'México', alias: ['baja california sur'] },
  { nombre: 'Los Cabos', tz: 'America/Mazatlan', pais: 'México', alias: ['cabo san lucas'] },
  { nombre: 'Hermosillo', tz: 'America/Hermosillo', pais: 'México', alias: ['sonora'] },
  { nombre: 'Tijuana', tz: 'America/Tijuana', pais: 'México' },
  { nombre: 'Mexicali', tz: 'America/Tijuana', pais: 'México' },
  { nombre: 'Ensenada', tz: 'America/Tijuana', pais: 'México' },

  // --- España ---------------------------------------------------------------------------
  { nombre: 'Pamplona', tz: 'Europe/Madrid', pais: 'España', alias: ['iruña', 'iruna', 'navarra'] },
  { nombre: 'Madrid', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Barcelona', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Valencia', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Sevilla', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Bilbao', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'San Sebastián', tz: 'Europe/Madrid', pais: 'España', alias: ['san sebastian', 'donostia'] },
  { nombre: 'Zaragoza', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Málaga', tz: 'Europe/Madrid', pais: 'España', alias: ['malaga'] },
  { nombre: 'Granada', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Santiago de Compostela', tz: 'Europe/Madrid', pais: 'España', alias: ['santiago compostela'] },
  { nombre: 'Salamanca', tz: 'Europe/Madrid', pais: 'España' },
  { nombre: 'Logroño', tz: 'Europe/Madrid', pais: 'España', alias: ['logrono', 'la rioja'] },
  // Canarias va una hora por detrás del resto de España, todo el año. Es la confusión de husos más
  // fácil de cometer dentro del propio país.
  { nombre: 'Las Palmas de Gran Canaria', tz: 'Atlantic/Canary', pais: 'España', alias: ['canarias', 'las palmas'] },
  { nombre: 'Santa Cruz de Tenerife', tz: 'Atlantic/Canary', pais: 'España', alias: ['tenerife'] },

  // --- Resto de Europa ------------------------------------------------------------------
  { nombre: 'Lisboa', tz: 'Europe/Lisbon', pais: 'Portugal' },
  { nombre: 'Oporto', tz: 'Europe/Lisbon', pais: 'Portugal', alias: ['porto'] },
  { nombre: 'París', tz: 'Europe/Paris', pais: 'Francia', alias: ['paris'] },
  { nombre: 'Lyon', tz: 'Europe/Paris', pais: 'Francia' },
  { nombre: 'Burdeos', tz: 'Europe/Paris', pais: 'Francia', alias: ['bordeaux'] },
  { nombre: 'Londres', tz: 'Europe/London', pais: 'Reino Unido', alias: ['london'] },
  { nombre: 'Edimburgo', tz: 'Europe/London', pais: 'Reino Unido', alias: ['edinburgh'] },
  { nombre: 'Dublín', tz: 'Europe/Dublin', pais: 'Irlanda', alias: ['dublin'] },
  { nombre: 'Roma', tz: 'Europe/Rome', pais: 'Italia', alias: ['rome'] },
  { nombre: 'Milán', tz: 'Europe/Rome', pais: 'Italia', alias: ['milan', 'milano'] },
  { nombre: 'Florencia', tz: 'Europe/Rome', pais: 'Italia', alias: ['firenze'] },
  { nombre: 'Berlín', tz: 'Europe/Berlin', pais: 'Alemania', alias: ['berlin'] },
  { nombre: 'Múnich', tz: 'Europe/Berlin', pais: 'Alemania', alias: ['munich', 'munchen'] },
  { nombre: 'Ámsterdam', tz: 'Europe/Amsterdam', pais: 'Países Bajos', alias: ['amsterdam'] },
  { nombre: 'Bruselas', tz: 'Europe/Brussels', pais: 'Bélgica', alias: ['brussels'] },
  { nombre: 'Viena', tz: 'Europe/Vienna', pais: 'Austria' },
  { nombre: 'Zúrich', tz: 'Europe/Zurich', pais: 'Suiza', alias: ['zurich'] },
  { nombre: 'Ginebra', tz: 'Europe/Zurich', pais: 'Suiza', alias: ['geneve', 'geneva'] },
  { nombre: 'Praga', tz: 'Europe/Prague', pais: 'Chequia', alias: ['prague'] },
  { nombre: 'Budapest', tz: 'Europe/Budapest', pais: 'Hungría' },
  { nombre: 'Varsovia', tz: 'Europe/Warsaw', pais: 'Polonia', alias: ['warsaw'] },
  { nombre: 'Cracovia', tz: 'Europe/Warsaw', pais: 'Polonia', alias: ['krakow'] },
  { nombre: 'Copenhague', tz: 'Europe/Copenhagen', pais: 'Dinamarca' },
  { nombre: 'Estocolmo', tz: 'Europe/Stockholm', pais: 'Suecia' },
  { nombre: 'Oslo', tz: 'Europe/Oslo', pais: 'Noruega' },
  { nombre: 'Helsinki', tz: 'Europe/Helsinki', pais: 'Finlandia' },
  { nombre: 'Atenas', tz: 'Europe/Athens', pais: 'Grecia' },
  { nombre: 'Estambul', tz: 'Europe/Istanbul', pais: 'Turquía', alias: ['istanbul'] },
  { nombre: 'Moscú', tz: 'Europe/Moscow', pais: 'Rusia', alias: ['moscu', 'moscow'] },
  { nombre: 'Reikiavik', tz: 'Atlantic/Reykjavik', pais: 'Islandia', alias: ['reykjavik'] },

  // --- América --------------------------------------------------------------------------
  { nombre: 'Nueva York', tz: 'America/New_York', pais: 'Estados Unidos', alias: ['new york', 'nyc'] },
  { nombre: 'Washington D. C.', tz: 'America/New_York', pais: 'Estados Unidos', alias: ['washington'] },
  { nombre: 'Boston', tz: 'America/New_York', pais: 'Estados Unidos' },
  { nombre: 'Miami', tz: 'America/New_York', pais: 'Estados Unidos' },
  { nombre: 'Atlanta', tz: 'America/New_York', pais: 'Estados Unidos' },
  { nombre: 'Chicago', tz: 'America/Chicago', pais: 'Estados Unidos' },
  { nombre: 'Houston', tz: 'America/Chicago', pais: 'Estados Unidos' },
  { nombre: 'Dallas', tz: 'America/Chicago', pais: 'Estados Unidos' },
  { nombre: 'Austin', tz: 'America/Chicago', pais: 'Estados Unidos' },
  { nombre: 'San Antonio', tz: 'America/Chicago', pais: 'Estados Unidos' },
  { nombre: 'Denver', tz: 'America/Denver', pais: 'Estados Unidos' },
  { nombre: 'Phoenix', tz: 'America/Phoenix', pais: 'Estados Unidos' },
  { nombre: 'Las Vegas', tz: 'America/Los_Angeles', pais: 'Estados Unidos' },
  { nombre: 'Los Ángeles', tz: 'America/Los_Angeles', pais: 'Estados Unidos', alias: ['los angeles'] },
  { nombre: 'San Diego', tz: 'America/Los_Angeles', pais: 'Estados Unidos' },
  { nombre: 'San Francisco', tz: 'America/Los_Angeles', pais: 'Estados Unidos' },
  { nombre: 'Seattle', tz: 'America/Los_Angeles', pais: 'Estados Unidos' },
  { nombre: 'Toronto', tz: 'America/Toronto', pais: 'Canadá' },
  { nombre: 'Montreal', tz: 'America/Toronto', pais: 'Canadá' },
  { nombre: 'Vancouver', tz: 'America/Vancouver', pais: 'Canadá' },
  { nombre: 'La Habana', tz: 'America/Havana', pais: 'Cuba', alias: ['habana', 'havana'] },
  { nombre: 'Santo Domingo', tz: 'America/Santo_Domingo', pais: 'República Dominicana' },
  { nombre: 'San Juan', tz: 'America/Puerto_Rico', pais: 'Puerto Rico' },
  { nombre: 'Ciudad de Guatemala', tz: 'America/Guatemala', pais: 'Guatemala', alias: ['guatemala'] },
  { nombre: 'San Salvador', tz: 'America/El_Salvador', pais: 'El Salvador' },
  { nombre: 'Tegucigalpa', tz: 'America/Tegucigalpa', pais: 'Honduras' },
  { nombre: 'Managua', tz: 'America/Managua', pais: 'Nicaragua' },
  { nombre: 'San José', tz: 'America/Costa_Rica', pais: 'Costa Rica', alias: ['san jose costa rica'] },
  { nombre: 'Ciudad de Panamá', tz: 'America/Panama', pais: 'Panamá', alias: ['panama'] },
  { nombre: 'Bogotá', tz: 'America/Bogota', pais: 'Colombia', alias: ['bogota'] },
  { nombre: 'Medellín', tz: 'America/Bogota', pais: 'Colombia', alias: ['medellin'] },
  { nombre: 'Cartagena', tz: 'America/Bogota', pais: 'Colombia' },
  { nombre: 'Caracas', tz: 'America/Caracas', pais: 'Venezuela' },
  { nombre: 'Quito', tz: 'America/Guayaquil', pais: 'Ecuador' },
  { nombre: 'Guayaquil', tz: 'America/Guayaquil', pais: 'Ecuador' },
  { nombre: 'Lima', tz: 'America/Lima', pais: 'Perú' },
  { nombre: 'La Paz (Bolivia)', tz: 'America/La_Paz', pais: 'Bolivia', alias: ['la paz bolivia'] },
  { nombre: 'Santiago de Chile', tz: 'America/Santiago', pais: 'Chile', alias: ['santiago chile'] },
  { nombre: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', pais: 'Argentina' },
  { nombre: 'Córdoba (Argentina)', tz: 'America/Argentina/Cordoba', pais: 'Argentina', alias: ['cordoba argentina'] },
  { nombre: 'Montevideo', tz: 'America/Montevideo', pais: 'Uruguay' },
  { nombre: 'Asunción', tz: 'America/Asuncion', pais: 'Paraguay', alias: ['asuncion'] },
  { nombre: 'São Paulo', tz: 'America/Sao_Paulo', pais: 'Brasil', alias: ['sao paulo'] },
  { nombre: 'Río de Janeiro', tz: 'America/Sao_Paulo', pais: 'Brasil', alias: ['rio de janeiro', 'rio'] },

  // --- Resto del mundo ------------------------------------------------------------------
  { nombre: 'Marrakech', tz: 'Africa/Casablanca', pais: 'Marruecos' },
  { nombre: 'Casablanca', tz: 'Africa/Casablanca', pais: 'Marruecos' },
  { nombre: 'El Cairo', tz: 'Africa/Cairo', pais: 'Egipto', alias: ['cairo'] },
  { nombre: 'Ciudad del Cabo', tz: 'Africa/Johannesburg', pais: 'Sudáfrica', alias: ['cape town'] },
  { nombre: 'Lagos', tz: 'Africa/Lagos', pais: 'Nigeria' },
  { nombre: 'Nairobi', tz: 'Africa/Nairobi', pais: 'Kenia' },
  { nombre: 'Tel Aviv', tz: 'Asia/Jerusalem', pais: 'Israel' },
  { nombre: 'Dubái', tz: 'Asia/Dubai', pais: 'Emiratos Árabes', alias: ['dubai'] },
  { nombre: 'Bombay', tz: 'Asia/Kolkata', pais: 'India', alias: ['mumbai'] },
  { nombre: 'Nueva Delhi', tz: 'Asia/Kolkata', pais: 'India', alias: ['delhi'] },
  { nombre: 'Bangkok', tz: 'Asia/Bangkok', pais: 'Tailandia' },
  { nombre: 'Singapur', tz: 'Asia/Singapore', pais: 'Singapur', alias: ['singapore'] },
  { nombre: 'Hong Kong', tz: 'Asia/Hong_Kong', pais: 'China' },
  { nombre: 'Shanghái', tz: 'Asia/Shanghai', pais: 'China', alias: ['shanghai'] },
  { nombre: 'Pekín', tz: 'Asia/Shanghai', pais: 'China', alias: ['pekin', 'beijing'] },
  { nombre: 'Seúl', tz: 'Asia/Seoul', pais: 'Corea del Sur', alias: ['seul', 'seoul'] },
  { nombre: 'Tokio', tz: 'Asia/Tokyo', pais: 'Japón', alias: ['tokyo'] },
  { nombre: 'Sídney', tz: 'Australia/Sydney', pais: 'Australia', alias: ['sidney', 'sydney'] },
  { nombre: 'Melbourne', tz: 'Australia/Melbourne', pais: 'Australia' },
  { nombre: 'Auckland', tz: 'Pacific/Auckland', pais: 'Nueva Zelanda' }
]

export const CIUDAD_REFERENCIA_DEFAULT = CIUDADES_REFERENCIA[0]

// Normaliza para buscar: sin acentos, sin mayúsculas. Sin esto, escribir "merida" no encontraría
// "Mérida" — y nadie pone acentos en un buscador desde el móvil.
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// Agrupa la lista entera por país, respetando el orden en que aparecen en el archivo (México y
// España primero, que son los dos sitios que de verdad va a mirar; luego el resto por regiones).
//
// Esto existe por un fallo real: al abrir el selector sin escribir nada se cortaba la lista en las
// primeras 40 ciudades y, como México ocupa las 41 primeras, lo único que se veía era México. La
// lista tenía 150 ciudades de 58 países y parecía una lista mexicana. Ahora sin buscar se ven
// TODAS, separadas por país, así que basta con desplazar para descubrir que están las demás.
export function ciudadesPorPais() {
  const grupos = []
  const indice = new Map()
  for (const c of CIUDADES_REFERENCIA) {
    if (!indice.has(c.pais)) {
      const grupo = { pais: c.pais, ciudades: [] }
      indice.set(c.pais, grupo)
      grupos.push(grupo)
    }
    indice.get(c.pais).ciudades.push(c)
  }
  return grupos
}

export const TOTAL_CIUDADES = CIUDADES_REFERENCIA.length
export const TOTAL_PAISES = new Set(CIUDADES_REFERENCIA.map((c) => c.pais)).size

// Con texto: filtra y ordena por relevancia. Sin texto devuelve la lista completa — el corte solo
// tiene sentido cuando hay una consulta que ordena por pertinencia; sin ella, cortar es esconder.
export function buscarCiudades(consulta, limite = 40) {
  const q = normalizar(consulta)
  if (!q) return CIUDADES_REFERENCIA

  const puntuar = (c) => {
    const nombre = normalizar(c.nombre)
    const pais = normalizar(c.pais)
    const alias = (c.alias || []).map(normalizar)
    // Empezar por lo escrito pesa más que contenerlo: quien escribe "san" busca San Sebastián o
    // San Juan, no "Ciudad de Panamá".
    if (nombre.startsWith(q) || alias.some((a) => a.startsWith(q))) return 3
    if (nombre.includes(q) || alias.some((a) => a.includes(q))) return 2
    if (pais.startsWith(q) || pais.includes(q)) return 1
    return 0
  }

  return CIUDADES_REFERENCIA.map((c) => ({ c, p: puntuar(c) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, limite)
    .map((x) => x.c)
}
