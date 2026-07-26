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
  vida: { label: 'Salir', emoji: '🍷', color: '#E8813F' },
  fotos: { label: 'Fotos', emoji: '📸', color: '#B57EDC' },
  mios: { label: 'Mis lugares', emoji: '⭐', color: '#E8813F' }
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
  // --- Salir (fuente: KB11-ocio-vida-social.md) -------------------------------
  // Son pines de ZONA, no de cada bar: el KB nombra los locales pero no da sus direcciones
  // exactas, y poner coordenadas inventadas por bar la mandaría al lugar equivocado. Cada pin
  // cae en la plaza/calle real y lista en la nota los sitios que el KB menciona ahí.
  {
    id: 'zona-iturrama',
    categoria: 'vida',
    nombre: 'Iturrama — su barrio',
    nota: 'El Labrador (barato, pintxos), Extra Time (futbolín y billar), Karaoke El Guateque, Manneken Beer, Bar Milton. Epicentro universitario, pegado al campus.',
    lat: 42.8058,
    lng: -1.6531
  },
  {
    id: 'plaza-felix-huarte',
    categoria: 'vida',
    nombre: 'Plaza Félix Huarte',
    nota: 'Olary: terraza amplia, cerca de las facultades.',
    lat: 42.8074,
    lng: -1.6497
  },
  {
    id: 'zona-pio-xii',
    categoria: 'vida',
    nombre: 'Av. Pío XII — cañas',
    nota: 'Payvi2 y El Café de Pío (El Cañas): clásicos de terraza, muy transitados, a un paso de CampusHome.',
    lat: 42.8095,
    lng: -1.6470
  },
  {
    id: 'plaza-yamaguchi',
    categoria: 'vida',
    nombre: 'Plaza Yamaguchi',
    nota: 'Varias terrazas: Bar Central, Cervecería La Quinta, Ristorante 1995, La Picachilla, Orient Express. Zona con mucho Erasmus.',
    lat: 42.8062,
    lng: -1.6395
  },
  {
    id: 'zona-san-juan',
    categoria: 'vida',
    nombre: 'San Juan / Ermitagaña',
    nota: 'Pubs irlandeses The Gallipot y Paddy\'s Corner, Cervecería Bávaros (jarras grandes, buena para grupos), Café Urdax (de los mejores menús del día).',
    lat: 42.8143,
    lng: -1.6564
  },
  {
    id: 'plaza-castillo',
    categoria: 'vida',
    nombre: 'Plaza del Castillo — Juevintxo',
    nota: 'Todos los jueves: pintxo-pote barato aquí y en Estafeta y San Nicolás. Es EL plan semanal universitario para integrarse rápido.',
    lat: 42.8168,
    lng: -1.6432
  },
  {
    id: 'calle-san-francisco',
    categoria: 'vida',
    nombre: 'Calle San Francisco — música en vivo',
    nota: 'Txintxarri y Tarántula: punk, rock, indie, jazz, electrónica en directo. Alternativa al reguetón.',
    lat: 42.8175,
    lng: -1.6462
  },
  {
    id: 'zona-milagrosa',
    categoria: 'vida',
    nombre: 'La Milagrosa — lo más barato',
    nota: 'Bar Inicio (descuentos entre semana, bocadillos generosos), Bar Viena. Zona UPNA, precios por debajo del centro.',
    lat: 42.8036,
    lng: -1.6395
  },

  // --- Fotos (fuente: KB11, sección de lugares fotogénicos) --------------------
  {
    id: 'ciudadela',
    categoria: 'fotos',
    nombre: 'La Ciudadela',
    nota: 'Fortaleza con fosos y murallas, convertida en parque. También sirve para despejarse en época de exámenes.',
    lat: 42.8137,
    lng: -1.6512
  },
  {
    id: 'taconera',
    categoria: 'fotos',
    nombre: 'Parque de la Taconera',
    nota: 'El parque más antiguo de la ciudad, con animales en los fosos. El Portal Nuevo (de Santa Gracia) está aquí.',
    lat: 42.8189,
    lng: -1.6487
  },
  {
    id: 'paseo-sarasate',
    categoria: 'fotos',
    nombre: 'Paseo de Sarasate',
    nota: 'Frontera entre Casco Antiguo y Ensanche; arquitectura institucional (Parlamento, Palacio de Navarra).',
    lat: 42.8158,
    lng: -1.6455
  },
  {
    id: 'catedral',
    categoria: 'fotos',
    nombre: 'Catedral y "la calle más bonita"',
    nota: 'Junto a la Catedral y el Mesón del Caballo Blanco: la callejuela con el puente colgante de madera entre edificios.',
    lat: 42.8194,
    lng: -1.6410
  },
  {
    id: 'cuesta-santo-domingo',
    categoria: 'fotos',
    nombre: 'Cuesta de Santo Domingo',
    nota: 'Ruta del encierro: la curva Mercaderes-Estafeta y el Monumento al Encierro están cerca.',
    lat: 42.8195,
    lng: -1.6440
  }
]

// travelmode=transit para que abra directo en modo transporte público (Villavesa) — Pamplona ya
// tiene sus datos de autobuses integrados en Google Transit, así que Google Maps calcula rutas
// reales en bus sin que nosotros tengamos que integrar nada aparte.
export function googleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`
}

// Misma idea pero con origen explícito (la ubicación real de Carmen en ese momento, vía GPS del
// navegador) en vez de dejar que Google Maps pregunte por su cuenta — ver botón "📍 Desde donde
// estoy" en Mapa.jsx.
export function googleMapsDirectionsDesdeUbicacionUrl(origenLat, origenLng, destinoLat, destinoLng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origenLat},${origenLng}&destination=${destinoLat},${destinoLng}&travelmode=transit`
}

// URL scheme oficial de Google Maps para abrir Street View directo (sin API key, sin costo —
// mismo patrón que googleMapsDirectionsUrl, solo con map_action=pano). Útil para que reconozca
// la fachada de un lugar ANTES de ir la primera vez — Google no siempre tiene cobertura exacta
// en el punto pedido; si no hay imagen ahí, Google salta a la más cercana disponible.
export function googleStreetViewUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}
