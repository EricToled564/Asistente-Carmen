// Coordenadas aproximadas de lugares públicos de Pamplona/Iruña.
// ⚠️ No se pudieron verificar en un mapa en vivo durante la construcción (sandbox sin acceso a
// internet general) — antes de entregar, abre cada una en Google Maps y ajusta si el pin no
// cae exactamente en el lugar. Sobre todo "residencia": la dirección (Av. de Pío XII, 28) es la
// confirmada en el KB, pero las coordenadas exactas son una aproximación de esa calle.
// Se pueden sobreescribir por variables de entorno VITE_RESIDENCIA_LAT / VITE_RESIDENCIA_LNG.

const residenciaLat = Number(import.meta.env.VITE_RESIDENCIA_LAT) || 42.8062
const residenciaLng = Number(import.meta.env.VITE_RESIDENCIA_LNG) || -1.6428

export const CATEGORIAS = {
  residencia: { label: 'Residencia', emoji: '🏠', color: '#7C4DBC' },
  campus: { label: 'Campus', emoji: '🎓', color: '#9C63CE' },
  tramites: { label: 'Trámites', emoji: '📋', color: '#442A54' },
  transporte: { label: 'Transporte', emoji: '🚌', color: '#63397D' },
  vida: { label: 'Vida y pintxos', emoji: '🍷', color: '#E8813F' }
}

export const PINES = [
  {
    id: 'residencia',
    categoria: 'residencia',
    nombre: 'CampusHome (mi residencia)',
    nota: 'Av. de Pío XII, 28, 31008 Pamplona — barrio Iturrama. Alianza oficial con la Universidad de Navarra.',
    lat: residenciaLat,
    lng: residenciaLng
  },
  {
    id: 'escuela-arquitectura',
    categoria: 'campus',
    nombre: 'Escuela Técnica Superior de Arquitectura',
    nota: 'Aquí tomas la mayoría de tus clases del Grado en Diseño.',
    lat: 42.8087,
    lng: -1.6122
  },
  {
    id: 'biblioteca',
    categoria: 'campus',
    nombre: 'Biblioteca de Humanidades',
    nota: 'La más cercana a Arquitectura y Diseño para estudiar.',
    lat: 42.8091,
    lng: -1.6114
  },
  {
    id: 'secretaria-campus',
    categoria: 'campus',
    nombre: 'Secretaría / ADI (Oficina de Atención al Estudiante Internacional)',
    nota: 'Tu primer punto de contacto para dudas de matrícula y visado.',
    lat: 42.8080,
    lng: -1.6140
  },
  {
    id: 'comisaria-extranjeria',
    categoria: 'tramites',
    nombre: 'Comisaría / Oficina de Extranjería (TIE)',
    nota: 'Verifica la dirección exacta vigente antes de tu cita — puede reubicarse.',
    lat: 42.8140,
    lng: -1.6420
  },
  {
    id: 'ayuntamiento',
    categoria: 'tramites',
    nombre: 'Ayuntamiento de Pamplona (empadronamiento)',
    nota: 'Plaza Consistorial 1.',
    lat: 42.8180,
    lng: -1.6446
  },
  {
    id: 'villavesa-fuente-hierro',
    categoria: 'transporte',
    nombre: 'Parada villavesa — Fuente del Hierro',
    nota: 'Parada clave para llegar al campus.',
    lat: 42.8107,
    lng: -1.6280
  },
  {
    id: 'estacion-renfe',
    categoria: 'transporte',
    nombre: 'Estación de tren (Renfe)',
    nota: 'Para viajes fuera de Pamplona.',
    lat: 42.8228,
    lng: -1.6469
  },
  {
    id: 'aeropuerto',
    categoria: 'transporte',
    nombre: 'Aeropuerto de Pamplona (Noáin)',
    nota: 'Vuelos nacionales; para internacionales normalmente Madrid o Bilbao.',
    lat: 42.7700,
    lng: -1.6461
  },
  {
    id: 'casco-viejo',
    categoria: 'vida',
    nombre: 'Casco Viejo / Plaza del Castillo',
    nota: 'Zona de pintxos, salir con amigos, ambiente de San Fermín.',
    lat: 42.8168,
    lng: -1.6432
  }
]

export function googleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
