// Ciudades para el reloj secundario en Inicio ("hora de casa"). Ciudad de México es el default
// (donde vive su familia); las demás son para cuando Carmen viaje y quiera comparar la hora de
// otra ciudad en vez de la de casa.
export const CIUDADES_REFERENCIA = [
  { nombre: 'Ciudad de México', tz: 'America/Mexico_City' },
  { nombre: 'Guadalajara / Monterrey', tz: 'America/Mexico_City' },
  { nombre: 'Nueva York', tz: 'America/New_York' },
  { nombre: 'Los Ángeles', tz: 'America/Los_Angeles' },
  { nombre: 'Bogotá', tz: 'America/Bogota' },
  { nombre: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires' },
  { nombre: 'Londres', tz: 'Europe/London' },
  { nombre: 'Tokio', tz: 'Asia/Tokyo' }
]

export const CIUDAD_REFERENCIA_DEFAULT = CIUDADES_REFERENCIA[0]
