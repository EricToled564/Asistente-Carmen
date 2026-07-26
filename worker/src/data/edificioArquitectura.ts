// Datos del Edificio de Arquitectura (ETSAUN) sacados a mano de las capturas reales del Google
// My Maps que hizo el usuario (Planta -1, Planta 0, Planta 1). El edificio es una sola nave
// alargada por planta: básicamente un pasillo largo con aulas/salas colgando de él a ambos
// lados. Cada planta es un arreglo ORDENADO de paradas de oeste a este (tal como se ven en las
// fotos, confirmado con el Río Sadar corriendo por el lado norte del edificio en las tres
// plantas — o sea las imágenes sí están orientadas con el norte hacia arriba).
//
// Campo `lado`: de qué lado del pasillo cae cada aula/servicio (norte o sur), sacado de su
// posición real en la imagen. Con eso SÍ se puede dar "izquierda/derecha" de forma confiable —
// se deriva así: caminando hacia el ESTE, lado norte queda a tu izquierda y lado sur a tu
// derecha (caminando hacia el oeste es al revés). Es geometría simple (mano izquierda/derecha
// relativa a hacia dónde caminas), no una suposición — el único supuesto real es que las fotos
// están en efecto orientadas al norte arriba, que si se ve confirmado por la posición del río.
// Los conectores (escaleras/ascensor) no llevan `lado`: son puntos de paso en el eje del
// pasillo, no aulas a un costado.
//
// tipo 'conector' = escalera o ascensor (punto de cambio de planta). El campo `grupo` agrupa
// conectores que están físicamente cerca entre sí en la misma planta (oeste/centro/este) para
// saber cuál usar como referencia de piso a piso.

export type TipoParada = 'aula' | 'servicio' | 'conector'
export type GrupoConector = 'oeste' | 'centro' | 'este'
export type Lado = 'norte' | 'sur'

export interface Parada {
  id: string
  nombre: string
  planta: -1 | 0 | 1
  tipo: TipoParada
  lado?: Lado // no aplica a conectores
  salas?: string[] // números de sala que caen en esta zona, si aplica (para buscar por número)
  esAscensor?: boolean
  grupo?: GrupoConector // solo para tipo 'conector'
  nota?: string
}

// --- Planta -1 ---------------------------------------------------------
const PLANTA_MENOS1: Parada[] = [
  { id: 'p-1-seminario5', nombre: 'Seminario 5', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-seminario4', nombre: 'Seminario 4', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-seminario3', nombre: 'Seminario 3', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-escalera', nombre: 'Escalera (junto a Seminario 3)', planta: -1, tipo: 'conector', grupo: 'oeste' },
  { id: 'p-1-multifuncion', nombre: 'Sala Multifunción (con microondas)', planta: -1, tipo: 'servicio', lado: 'norte' },
  { id: 'p-1-s180', nombre: 'S180', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-materiales', nombre: 'Aula de Materiales', planta: -1, tipo: 'aula', lado: 'norte' },
  {
    id: 'p-1-taller-laboratorio',
    nombre: 'Taller Laboratorio',
    planta: -1,
    tipo: 'aula',
    lado: 'sur',
    nota: 'Nave grande al sur de los seminarios, cruzando frente a la escalera.'
  }
]
// Nota: Planta -1 no tiene ascensor registrado en el mapa — solo esta escalera. Si Carmen necesita
// acceso accesible a esta planta, hay que confirmarlo aparte (no lo inventamos aquí).

// --- Planta 0 (planta principal / acceso) -------------------------------
const PLANTA_0: Parada[] = [
  { id: 'p0-lab-etsaun', nombre: 'Laboratorio ETSAUN', planta: 0, tipo: 'aula', lado: 'norte', salas: ['0380', '0382', '0360', '0370', '0390'] },
  { id: 'p0-escalera-oeste', nombre: 'Escalera (junto al Laboratorio ETSAUN)', planta: 0, tipo: 'conector', grupo: 'oeste' },
  { id: 'p0-impresora', nombre: 'Autoservicio de impresora', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-aula06', nombre: 'Aula 06', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-aula05', nombre: 'Aula 05', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-aula04', nombre: 'Aula 04', planta: 0, tipo: 'aula', lado: 'sur' },
  {
    id: 'p0-taller-moda',
    nombre: 'Taller de Moda',
    planta: 0,
    tipo: 'aula',
    lado: 'norte',
    salas: ['0340', '0330', '0341', '0342'],
    nota: 'Zona grande junto al pasillo central, entre Aula 05/04 y Aula 0.'
  },
  { id: 'p0-aula0', nombre: 'Aula 0', planta: 0, tipo: 'aula', lado: 'norte', salas: ['0230'] },
  {
    id: 'p0-biblioteca',
    nombre: 'Biblioteca',
    planta: 0,
    tipo: 'servicio',
    lado: 'norte',
    salas: ['0270'],
    nota: 'Junto al Taller de Moda, entre Aula 0 y Conserjería.'
  },
  { id: 'p0-aula02', nombre: 'Aula 02', planta: 0, tipo: 'aula', lado: 'sur', salas: ['0490', '0500'] },
  { id: 'p0-pasillo-escaleras', nombre: 'Escaleras (pasillo central)', planta: 0, tipo: 'conector', grupo: 'centro' },
  { id: 'p0-ascensor', nombre: 'Ascensor', planta: 0, tipo: 'conector', grupo: 'centro', esAscensor: true },
  { id: 'p0-conserjeria', nombre: 'Conserjería', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-aula-magna', nombre: 'Aula Magna', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-cafeteria', nombre: 'Cafetería', planta: 0, tipo: 'servicio', lado: 'sur' },
  { id: 'p0-microondas', nombre: 'Zona de microondas', planta: 0, tipo: 'servicio', lado: 'sur' },
  { id: 'p0-escaleras-cafeteria', nombre: 'Escaleras (junto a la Cafetería)', planta: 0, tipo: 'conector', grupo: 'centro' },
  {
    id: 'p0-oratorio',
    nombre: 'Oratorio',
    planta: 0,
    tipo: 'servicio',
    lado: 'sur',
    salas: ['0530', '0550', '0555', '0570'],
    nota: 'Ala sureste, después de la Cafetería.'
  },
  { id: 'p0-atelier-lorda', nombre: 'Atelier Lorda', planta: 0, tipo: 'aula', lado: 'sur', nota: 'Junto al Oratorio, con terraza.' },
  {
    id: 'p0-direccion-tecnica',
    nombre: 'Dirección de Arquitectura Técnica',
    planta: 0,
    tipo: 'servicio',
    lado: 'norte',
    nota: 'Ala noreste, cruzando el patio desde la Cafetería.'
  },
  {
    id: 'p0-secretaria',
    nombre: 'Secretaría',
    planta: 0,
    tipo: 'servicio',
    lado: 'norte',
    salas: ['0010', '0030', '0050', '0060', '0070', '0080', '0090', '0100', '0115'],
    nota: 'Ala noreste (edificio anexo, cruzando desde Dirección de Arquitectura Técnica).'
  },
  { id: 'p0-aseo-masculino-ne', nombre: 'Aseo masculino (ala noreste)', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-innovation-factory', nombre: 'Innovation Factory — Centro de Innovación', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-seminario01', nombre: 'Seminario 01', planta: 0, tipo: 'aula', lado: 'norte', salas: ['0130', '0140', '0150', '0170', '0180'] }
]

// --- Planta 1 ------------------------------------------------------------
const PLANTA_1: Parada[] = [
  { id: 'p1-punto-atencion', nombre: 'Punto de atención en Arquitectura', planta: 1, tipo: 'servicio', lado: 'sur' },
  { id: 'p1-sala-c', nombre: 'Sala C — Teoría de Proyectos', planta: 1, tipo: 'aula', lado: 'sur', salas: ['1075', '1080', '1082', '1084', '1086', '1087', '1089'] },
  { id: 'p1-escalera-oeste', nombre: 'Escalera (junto a Sala C)', planta: 1, tipo: 'conector', grupo: 'oeste' },
  { id: 'p1-taller06', nombre: 'Taller 06', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller05', nombre: 'Taller 05', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller04', nombre: 'Taller 04', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller03', nombre: 'Taller 03', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller02', nombre: 'Taller 02', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-aseo-masculino', nombre: 'Aseo masculino', planta: 1, tipo: 'servicio', lado: 'sur' },
  { id: 'p1-escalera-centro', nombre: 'Escaleras (centro, junto al Ascensor)', planta: 1, tipo: 'conector', grupo: 'centro' },
  { id: 'p1-ascensor', nombre: 'Ascensor', planta: 1, tipo: 'conector', grupo: 'centro', esAscensor: true },
  { id: 'p1-sala-b', nombre: 'Sala B1 y B2', planta: 1, tipo: 'aula', lado: 'sur', salas: ['1101', '1103', '1105', '1107'] },
  { id: 'p1-escalera-este', nombre: 'Escaleras (junto a Sala A)', planta: 1, tipo: 'conector', grupo: 'este' },
  { id: 'p1-sala-a', nombre: 'Sala A — Construcción', planta: 1, tipo: 'aula', lado: 'sur', salas: ['1111', '1113', '1114', '1116', '1118', '1119'] },
  { id: 'p1-taller01', nombre: 'Taller 01', planta: 1, tipo: 'aula', lado: 'norte' }
]

export const PLANTAS: Record<-1 | 0 | 1, Parada[]> = {
  [-1]: PLANTA_MENOS1,
  0: PLANTA_0,
  1: PLANTA_1
}

export const TODAS_LAS_PARADAS: Parada[] = [...PLANTA_MENOS1, ...PLANTA_0, ...PLANTA_1]

export function buscarParada(id: string): Parada | undefined {
  return TODAS_LAS_PARADAS.find((p) => p.id === id)
}

// Paradas que se pueden elegir como origen/destino (no tiene sentido "ir a" una escalera).
export function paradasSeleccionables(): Parada[] {
  return TODAS_LAS_PARADAS.filter((p) => p.tipo !== 'conector')
}
