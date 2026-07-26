import { LUGARES } from './edificio.js'

// Geometría del plano interior, para dibujarlo en SVG.
//
// El edificio real es una nave larga y estrecha en diagonal (ver las capturas del plano
// original): una banda de salas al norte, un pasillo que la recorre a lo largo, y otra banda de
// salas al sur. En Planta 0 hay además un ala en el extremo noreste (Secretaría, Innovation
// Factory…) que queda cruzando el patio, separada del cuerpo principal.
//
// En vez de escribir a mano las coordenadas de ~45 polígonos, se calculan: cada sala declara un
// "peso" (qué tan ancha es respecto a las demás de su banda) y el orden oeste→este ya viene de
// edificio.js. Así el plano queda proporcionado y fiel a la distribución real, y si algún día se
// agrega o quita una sala, el dibujo se reacomoda solo.
//
// Todo se calcula en un sistema "recto" (eje X a lo largo del edificio) y el SVG rota el grupo
// entero para darle la diagonal real — mucho más simple y menos propenso a errores que calcular
// cada esquina ya rotada.

const LARGO = 1000

// Bandas (coordenada Y): ala noreste arriba del todo, luego norte, pasillo, sur.
const BANDA = {
  alaNoreste: { y: 8, alto: 78 },
  norte: { y: 96, alto: 118 },
  pasillo: { y: 214, alto: 54 },
  sur: { y: 268, alto: 128 }
}
export const ALTO_TOTAL = BANDA.sur.y + BANDA.sur.alto + 8

// Las salas grandes del plano real (talleres, laboratorios, aulas magnas) se dibujan más anchas;
// los servicios pequeños (aseos, impresora) más angostos. Default 1.
const PESOS = {
  'p0-lab-etsaun': 2.1,
  'p0-impresora': 0.6,
  'p0-taller-moda': 1.9,
  'p0-aula0': 1.2,
  'p0-biblioteca': 0.9,
  'p0-conserjeria': 0.8,
  'p0-aula06': 1.2,
  'p0-aula05': 1.2,
  'p0-aula04': 1.4,
  'p0-aula02': 1.6,
  'p0-aula-magna': 1.8,
  'p0-cafeteria': 1.3,
  'p0-microondas': 0.6,
  'p0-oratorio': 1.4,
  'p0-atelier-lorda': 1.1,
  'p0-secretaria': 1.6,
  'p0-direccion-tecnica': 1.2,
  'p0-aseo-masculino-ne': 0.6,
  'p0-innovation-factory': 1.3,
  'p0-seminario01': 1.1,

  'p-1-taller-laboratorio': 3.2,
  'p-1-multifuncion': 1.2,
  'p-1-materiales': 1.4,
  'p-1-s180': 0.9,

  'p1-taller06': 1.5,
  'p1-taller05': 1.5,
  'p1-taller04': 1.5,
  'p1-taller03': 1.5,
  'p1-taller02': 1.5,
  'p1-taller01': 1.5,
  'p1-sala-c': 2.2,
  'p1-sala-b': 1.6,
  'p1-sala-a': 1.8,
  'p1-aseo-masculino': 0.6,
  'p1-punto-atencion': 0.9
}

// En Planta 0 estas quedan en el edificio anexo del extremo noreste, no en la nave principal.
const ALA_NORESTE = new Set([
  'p0-direccion-tecnica',
  'p0-secretaria',
  'p0-aseo-masculino-ne',
  'p0-innovation-factory',
  'p0-seminario01'
])

const HUECO = 5 // separación entre salas contiguas

// Reparte un grupo de salas a lo largo de un tramo horizontal, proporcional a su peso.
function repartir(lugares, banda, desdeX, hastaX) {
  const total = lugares.reduce((s, l) => s + (PESOS[l.id] || 1), 0)
  if (total === 0) return []
  const ancho = hastaX - desdeX - HUECO * Math.max(0, lugares.length - 1)
  let x = desdeX
  return lugares.map((l) => {
    const w = ancho * ((PESOS[l.id] || 1) / total)
    const rect = { ...l, x, y: banda.y, w, h: banda.alto }
    x += w + HUECO
    return rect
  })
}

export function geometriaDePlanta(planta) {
  const dePlanta = LUGARES.filter((l) => l.planta === planta)

  const norte = dePlanta.filter((l) => l.lado === 'norte' && !ALA_NORESTE.has(l.id))
  const ala = dePlanta.filter((l) => ALA_NORESTE.has(l.id))
  const sur = dePlanta.filter((l) => l.lado === 'sur')
  const conectores = dePlanta.filter((l) => !l.lado)

  const salas = [
    ...repartir(norte, BANDA.norte, 0, ala.length > 0 ? LARGO * 0.62 : LARGO),
    ...repartir(ala, BANDA.alaNoreste, LARGO * 0.42, LARGO),
    ...repartir(sur, BANDA.sur, 0, LARGO)
  ]

  // Los conectores (escaleras/ascensor) viven sobre el eje del pasillo. Se colocan según su
  // posición relativa dentro del orden general de la planta, para que caigan cerca de las salas
  // junto a las que están en la realidad.
  const conectoresGeo = conectores.map((l) => {
    const posicion = dePlanta.indexOf(l) / Math.max(1, dePlanta.length - 1)
    const w = 74
    return {
      ...l,
      x: Math.min(LARGO - w, Math.max(0, posicion * LARGO - w / 2)),
      y: BANDA.pasillo.y + 6,
      w,
      h: BANDA.pasillo.alto - 12
    }
  })

  return {
    largo: LARGO,
    alto: ALTO_TOTAL,
    pasillo: { x: 0, y: BANDA.pasillo.y, w: LARGO, h: BANDA.pasillo.alto },
    salas,
    conectores: conectoresGeo
  }
}
