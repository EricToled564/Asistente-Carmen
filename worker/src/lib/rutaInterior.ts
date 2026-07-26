import { PLANTAS, buscarParada, type Parada, type GrupoConector, type Lado } from '../data/edificioArquitectura.js'

export interface PasoRuta {
  instruccion: string
  checkpoint: string // qué debe confirmar Carmen antes de que Maite dé el siguiente paso
}

const NOMBRE_PLANTA: Record<-1 | 0 | 1, string> = { [-1]: 'Planta -1', 0: 'Planta 0', 1: 'Planta 1' }

function conectoresDe(planta: -1 | 0 | 1): Parada[] {
  return PLANTAS[planta].filter((p) => p.tipo === 'conector')
}

// Dentro de una planta puede haber varias escaleras con el mismo grupo (ej. dos "centro" junto a
// la Cafetería) además del ascensor. Si se pidió ascensor y existe uno con ese grupo en esta
// planta, hay que usar ESE conector puntual — no el primero que aparezca en el arreglo.
function conectorEnPlanta(planta: -1 | 0 | 1, grupo: GrupoConector, preferirAscensor: boolean): Parada {
  const deEsteGrupo = conectoresDe(planta).filter((c) => c.grupo === grupo)
  if (preferirAscensor) {
    const ascensor = deEsteGrupo.find((c) => c.esAscensor)
    if (ascensor) return ascensor
  }
  return deEsteGrupo[0]
}

// Camino de plantas entre origen y destino, paso a paso de piso en piso (ej. -1 -> 0 -> 1).
function caminoDePlantas(origen: -1 | 0 | 1, destino: -1 | 0 | 1): Array<-1 | 0 | 1> {
  const paso = destino > origen ? 1 : -1
  const camino: Array<-1 | 0 | 1> = [origen]
  let actual = origen
  while (actual !== destino) {
    actual = (actual + paso) as -1 | 0 | 1
    camino.push(actual)
  }
  return camino
}

// Encuentra un grupo de conector (oeste/centro/este) presente en TODAS las plantas del camino —
// así nos aseguramos de que sea la misma escalera/ascensor de principio a fin del tramo vertical,
// no una combinación inventada de conectores que no se conectan entre sí en la realidad.
function grupoComunEnCamino(camino: Array<-1 | 0 | 1>, preferirAscensor: boolean): GrupoConector | null {
  const grupos: GrupoConector[] = ['centro', 'oeste', 'este']
  const candidatos = grupos.filter((g) => camino.every((planta) => conectoresDe(planta).some((c) => c.grupo === g)))
  if (candidatos.length === 0) return null
  if (preferirAscensor) {
    const conAscensor = candidatos.find((g) =>
      camino.every((planta) => conectoresDe(planta).some((c) => c.grupo === g && c.esAscensor))
    )
    if (conAscensor) return conAscensor
  }
  return candidatos[0]
}

function nombresIntermedios(planta: -1 | 0 | 1, indiceA: number, indiceB: number): string[] {
  const paradas = PLANTAS[planta]
  const [desde, hasta] = indiceA < indiceB ? [indiceA, indiceB] : [indiceB, indiceA]
  return paradas.slice(desde + 1, hasta).map((p) => p.nombre)
}

// De qué lado toca girar para pasar del eje del pasillo a una parada de lado `lado`, caminando
// en dirección `hacia` — es la misma cuenta ya sea para SALIR de una parada hacia el pasillo o
// para ENTRAR desde el pasillo a una parada (geometría: caminando al este, norte queda a tu
// izquierda y sur a tu derecha; caminando al oeste es al revés). Ver comentario en
// data/edificioArquitectura.ts sobre por qué esto sí es confiable (no es una suposición).
function girarHacia(lado: Lado, hacia: 'este' | 'oeste'): 'izquierda' | 'derecha' {
  const norteEsIzquierda = hacia === 'este'
  if (lado === 'norte') return norteEsIzquierda ? 'izquierda' : 'derecha'
  return norteEsIzquierda ? 'derecha' : 'izquierda'
}

function pasoCaminandoMismaPlanta(planta: -1 | 0 | 1, origen: Parada, destino: Parada): PasoRuta {
  const paradas = PLANTAS[planta]
  const indiceOrigen = paradas.findIndex((p) => p.id === origen.id)
  const indiceDestino = paradas.findIndex((p) => p.id === destino.id)
  const intermedios = nombresIntermedios(planta, indiceOrigen, indiceDestino)
  const hacia = indiceDestino > indiceOrigen ? 'este' : 'oeste'
  const trayecto =
    intermedios.length > 0
      ? `por el pasillo de ${NOMBRE_PLANTA[planta]} pasando junto a: ${intermedios.join(', ')}`
      : `por el pasillo de ${NOMBRE_PLANTA[planta]}`

  let instruccion: string
  if (origen.lado) {
    // Se conoce el lado de origen (es una sala/servicio, no una escalera/ascensor) — se da el
    // giro de SALIDA, igual que lo describirías tú misma: "sal a la izquierda y camina...".
    instruccion = `Desde ${origen.nombre}, gira a la ${girarHacia(origen.lado, hacia)} y camina ${trayecto}, hasta llegar a ${destino.nombre}.`
  } else if (destino.lado) {
    // Se sale de un conector (escalera/ascensor) — no sabemos hacia qué lado queda mirando
    // Carmen al salir de ahí, así que en vez de inventar el giro de salida, se da el giro de
    // LLEGADA (de qué lado del pasillo toca entrar al destino), que sí se conoce con certeza.
    instruccion = `Desde ${origen.nombre}, camina ${trayecto}, y gira a la ${girarHacia(destino.lado, hacia)} para llegar a ${destino.nombre}.`
  } else {
    instruccion = `Desde ${origen.nombre}, camina ${trayecto}, hasta llegar a ${destino.nombre}.`
  }

  return { instruccion, checkpoint: destino.nombre }
}

function pasoCambioDePlanta(conector: Parada, plantaDestino: -1 | 0 | 1, pisos: number): PasoRuta {
  const verbo = pisos > 0 ? 'sube' : 'baja'
  const medio = conector.esAscensor ? 'el ascensor' : 'las escaleras'
  const cantidad = Math.abs(pisos) === 1 ? '1 piso' : `${Math.abs(pisos)} pisos`
  return {
    instruccion: `Ahora toma ${medio} en ${conector.nombre} y ${verbo} ${cantidad} hasta la ${NOMBRE_PLANTA[plantaDestino]}.`,
    checkpoint: `llegar a ${NOMBRE_PLANTA[plantaDestino]} por ${conector.nombre}`
  }
}

export interface ResultadoRuta {
  pasos: PasoRuta[]
  origenNombre: string
  destinoNombre: string
}

export function calcularRuta(origenId: string, destinoId: string, preferirAscensor = true): ResultadoRuta | null {
  const origen = buscarParada(origenId)
  const destino = buscarParada(destinoId)
  if (!origen || !destino) return null

  if (origen.id === destino.id) {
    return { pasos: [{ instruccion: `Ya estás en ${destino.nombre}.`, checkpoint: destino.nombre }], origenNombre: origen.nombre, destinoNombre: destino.nombre }
  }

  if (origen.planta === destino.planta) {
    return {
      pasos: [pasoCaminandoMismaPlanta(origen.planta, origen, destino)],
      origenNombre: origen.nombre,
      destinoNombre: destino.nombre
    }
  }

  const camino = caminoDePlantas(origen.planta, destino.planta)
  const grupo = grupoComunEnCamino(camino, preferirAscensor)

  if (!grupo) {
    // No hay un conector que atraviese las plantas necesarias (ej. Planta -1 no tiene ascensor) —
    // avisamos en vez de inventar una ruta que no existe.
    return {
      pasos: [
        {
          instruccion: `No encontré una escalera o ascensor que conecte ${NOMBRE_PLANTA[origen.planta]} con ${NOMBRE_PLANTA[destino.planta]} directamente. Pregunta en Conserjería (Planta 0) cómo llegar.`,
          checkpoint: destino.nombre
        }
      ],
      origenNombre: origen.nombre,
      destinoNombre: destino.nombre
    }
  }

  const pasos: PasoRuta[] = []

  // 1) Caminar en la planta de origen hasta el conector.
  const conectorOrigen = conectorEnPlanta(origen.planta, grupo, preferirAscensor)
  if (conectorOrigen.id !== origen.id) {
    pasos.push(pasoCaminandoMismaPlanta(origen.planta, origen, conectorOrigen))
  }

  // 2) Subir/bajar todo el tramo vertical de una sola vez (mismo conector de principio a fin).
  pasos.push(pasoCambioDePlanta(conectorOrigen, destino.planta, destino.planta - origen.planta))

  // 3) Caminar en la planta de destino desde el conector hasta el destino final.
  const conectorDestino = conectorEnPlanta(destino.planta, grupo, preferirAscensor)
  if (conectorDestino.id !== destino.id) {
    pasos.push(pasoCaminandoMismaPlanta(destino.planta, conectorDestino, destino))
  }

  return { pasos, origenNombre: origen.nombre, destinoNombre: destino.nombre }
}
