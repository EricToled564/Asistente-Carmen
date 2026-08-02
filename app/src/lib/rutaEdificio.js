// El edificio de Arquitectura y el cálculo de rutas, DENTRO DE LA APP.
//
// Por qué está aquí y no solo en el servidor. Esta función existe para orientarse dentro de un
// edificio, y dentro de un edificio la cobertura es mala o no hay. Hasta hoy, pedir una ruta
// necesitaba internet dos veces: una para traer la lista de sitios y otra para calcular el camino.
// O sea que justo donde hace falta —un pasillo de la planta -1, sin señal, llegando tarde— era
// donde dejaba de funcionar. El propio componente decía "ya cargada, funciona sin señal", y era
// verdad solo después de que las dos llamadas hubieran salido bien.
//
// Ahora el plano y el algoritmo viajan en la app. Sin red, la ruta se calcula igual.
//
// El servidor CONSERVA su copia y sigue siendo necesaria: Maite la usa por voz (`iniciar_ruta` /
// `avanzar_ruta`), y eso corre en ElevenLabs, no en el teléfono.
//
// Dos copias es un riesgo real —ya nos mordió con KB8 y el horario—, así que no se vigila con un
// comentario que pide buena voluntad: `rutaEdificio.test.mjs` compara CADA par de sitios contra
// las respuestas reales del servidor. Si las dos copias se separan, el test se pone rojo.
//
// Los datos de abajo no están transcritos a mano: se generaron desde
// `worker/src/data/edificioArquitectura.ts`. Transcribir 47 paradas a mano es exactamente de donde
// salen los errores que nadie encuentra hasta que Carmen está perdida en un pasillo.

export const PLANTAS = {
  '-1': [
    { id: "p-1-seminario5", nombre: "Seminario 5", planta: -1, tipo: "aula", lado: "norte" },
    { id: "p-1-seminario4", nombre: "Seminario 4", planta: -1, tipo: "aula", lado: "norte" },
    { id: "p-1-seminario3", nombre: "Seminario 3", planta: -1, tipo: "aula", lado: "norte" },
    { id: "p-1-escalera", nombre: "Escalera (junto a Seminario 3)", planta: -1, tipo: "conector", grupo: "oeste" },
    { id: "p-1-multifuncion", nombre: "Sala Multifunción (con microondas)", planta: -1, tipo: "servicio", lado: "norte" },
    { id: "p-1-s180", nombre: "S180", planta: -1, tipo: "aula", lado: "norte" },
    { id: "p-1-materiales", nombre: "Aula de Materiales", planta: -1, tipo: "aula", lado: "norte" },
    { id: "p-1-taller-laboratorio", nombre: "Taller Laboratorio", planta: -1, tipo: "aula", lado: "sur", nota: "Nave grande al sur de los seminarios, cruzando frente a la escalera." },
  ],
  0: [
    { id: "p0-lab-etsaun", nombre: "Laboratorio ETSAUN", planta: 0, tipo: "aula", lado: "norte", salas: ["0380", "0382", "0360", "0370", "0390"] },
    { id: "p0-escalera-oeste", nombre: "Escalera (junto al Laboratorio ETSAUN)", planta: 0, tipo: "conector", grupo: "oeste" },
    { id: "p0-impresora", nombre: "Autoservicio de impresora", planta: 0, tipo: "servicio", lado: "norte" },
    { id: "p0-aula06", nombre: "Aula 06", planta: 0, tipo: "aula", lado: "sur" },
    { id: "p0-aula05", nombre: "Aula 05", planta: 0, tipo: "aula", lado: "sur" },
    { id: "p0-aula04", nombre: "Aula 04", planta: 0, tipo: "aula", lado: "sur" },
    { id: "p0-taller-moda", nombre: "Taller de Moda", planta: 0, tipo: "aula", lado: "norte", salas: ["0340", "0330", "0341", "0342"], nota: "Zona grande junto al pasillo central, entre Aula 05/04 y Aula 0." },
    { id: "p0-aula0", nombre: "Aula 0", planta: 0, tipo: "aula", lado: "norte", salas: ["0230"] },
    { id: "p0-biblioteca", nombre: "Biblioteca", planta: 0, tipo: "servicio", lado: "norte", salas: ["0270"], nota: "Junto al Taller de Moda, entre Aula 0 y Conserjería." },
    { id: "p0-aula02", nombre: "Aula 02", planta: 0, tipo: "aula", lado: "sur", salas: ["0490", "0500"] },
    { id: "p0-pasillo-escaleras", nombre: "Escaleras (pasillo central)", planta: 0, tipo: "conector", grupo: "centro" },
    { id: "p0-ascensor", nombre: "Ascensor", planta: 0, tipo: "conector", grupo: "centro", esAscensor: true },
    { id: "p0-conserjeria", nombre: "Conserjería", planta: 0, tipo: "servicio", lado: "norte" },
    { id: "p0-aula-magna", nombre: "Aula Magna", planta: 0, tipo: "aula", lado: "sur" },
    { id: "p0-cafeteria", nombre: "Cafetería", planta: 0, tipo: "servicio", lado: "sur" },
    { id: "p0-microondas", nombre: "Zona de microondas", planta: 0, tipo: "servicio", lado: "sur" },
    { id: "p0-escaleras-cafeteria", nombre: "Escaleras (junto a la Cafetería)", planta: 0, tipo: "conector", grupo: "centro" },
    { id: "p0-oratorio", nombre: "Oratorio", planta: 0, tipo: "servicio", lado: "sur", salas: ["0530", "0550", "0555", "0570"], nota: "Ala sureste, después de la Cafetería." },
    { id: "p0-atelier-lorda", nombre: "Atelier Lorda", planta: 0, tipo: "aula", lado: "sur", nota: "Junto al Oratorio, con terraza." },
    { id: "p0-direccion-tecnica", nombre: "Dirección de Arquitectura Técnica", planta: 0, tipo: "servicio", lado: "norte", nota: "Ala noreste, cruzando el patio desde la Cafetería." },
    { id: "p0-secretaria", nombre: "Secretaría", planta: 0, tipo: "servicio", lado: "norte", salas: ["0010", "0030", "0050", "0060", "0070", "0080", "0090", "0100", "0115"], nota: "Ala noreste (edificio anexo, cruzando desde Dirección de Arquitectura Técnica)." },
    { id: "p0-aseo-masculino-ne", nombre: "Aseo masculino (ala noreste)", planta: 0, tipo: "servicio", lado: "norte" },
    { id: "p0-innovation-factory", nombre: "Innovation Factory — Centro de Innovación", planta: 0, tipo: "servicio", lado: "norte" },
    { id: "p0-seminario01", nombre: "Seminario 01", planta: 0, tipo: "aula", lado: "norte", salas: ["0130", "0140", "0150", "0170", "0180"] },
  ],
  1: [
    { id: "p1-punto-atencion", nombre: "Punto de atención en Arquitectura", planta: 1, tipo: "servicio", lado: "sur" },
    { id: "p1-sala-c", nombre: "Sala C — Teoría de Proyectos", planta: 1, tipo: "aula", lado: "sur", salas: ["1075", "1080", "1082", "1084", "1086", "1087", "1089"] },
    { id: "p1-escalera-oeste", nombre: "Escalera (junto a Sala C)", planta: 1, tipo: "conector", grupo: "oeste" },
    { id: "p1-taller06", nombre: "Taller 06", planta: 1, tipo: "aula", lado: "norte" },
    { id: "p1-taller05", nombre: "Taller 05", planta: 1, tipo: "aula", lado: "norte" },
    { id: "p1-taller04", nombre: "Taller 04", planta: 1, tipo: "aula", lado: "norte" },
    { id: "p1-taller03", nombre: "Taller 03", planta: 1, tipo: "aula", lado: "norte" },
    { id: "p1-taller02", nombre: "Taller 02", planta: 1, tipo: "aula", lado: "norte" },
    { id: "p1-aseo-masculino", nombre: "Aseo masculino", planta: 1, tipo: "servicio", lado: "sur" },
    { id: "p1-escalera-centro", nombre: "Escaleras (centro, junto al Ascensor)", planta: 1, tipo: "conector", grupo: "centro" },
    { id: "p1-ascensor", nombre: "Ascensor", planta: 1, tipo: "conector", grupo: "centro", esAscensor: true },
    { id: "p1-sala-b", nombre: "Sala B1 y B2", planta: 1, tipo: "aula", lado: "sur", salas: ["1101", "1103", "1105", "1107"] },
    { id: "p1-escalera-este", nombre: "Escaleras (junto a Sala A)", planta: 1, tipo: "conector", grupo: "este" },
    { id: "p1-sala-a", nombre: "Sala A — Construcción", planta: 1, tipo: "aula", lado: "sur", salas: ["1111", "1113", "1114", "1116", "1118", "1119"] },
    { id: "p1-taller01", nombre: "Taller 01", planta: 1, tipo: "aula", lado: "norte" },
  ],
}

export const TODAS_LAS_PARADAS = [...PLANTAS[-1], ...PLANTAS[0], ...PLANTAS[1]]

export function buscarParada(id) {
  return TODAS_LAS_PARADAS.find((p) => p.id === id)
}

// Los sitios que se pueden elegir como origen o destino. No tiene sentido "ir a" una escalera.
export function paradasSeleccionables() {
  return TODAS_LAS_PARADAS.filter((p) => p.tipo !== 'conector')
}

// La misma forma que devuelve `GET /ruta/lugares`, para que la pantalla no tenga que distinguir
// si los datos vinieron del servidor o de aquí.
export function plantasParaSelector() {
  return [-1, 0, 1].map((planta) => ({
    planta,
    lugares: PLANTAS[planta].filter((p) => p.tipo !== 'conector').map((p) => ({ id: p.id, nombre: p.nombre, salas: p.salas }))
  }))
}

// --- El cálculo de la ruta -------------------------------------------------------------------
//
// Portado tal cual de worker/src/lib/rutaInterior.ts. Los comentarios de POR QUÉ cada decisión es
// como es viven allí; aquí se repiten solo los que hacen falta para no romperlo sin darse cuenta.

const NOMBRE_PLANTA = { '-1': 'Planta -1', 0: 'Planta 0', 1: 'Planta 1' }

function conectoresDe(planta) {
  return PLANTAS[planta].filter((p) => p.tipo === 'conector')
}

// En una planta puede haber varias escaleras del mismo grupo además del ascensor: si se pidió
// ascensor y existe uno de ese grupo, hay que usar ESE, no el primero del arreglo.
function conectorEnPlanta(planta, grupo, preferirAscensor) {
  const deEsteGrupo = conectoresDe(planta).filter((c) => c.grupo === grupo)
  if (preferirAscensor) {
    const ascensor = deEsteGrupo.find((c) => c.esAscensor)
    if (ascensor) return ascensor
  }
  return deEsteGrupo[0]
}

function caminoDePlantas(origen, destino) {
  const paso = destino > origen ? 1 : -1
  const camino = [origen]
  let actual = origen
  while (actual !== destino) {
    actual += paso
    camino.push(actual)
  }
  return camino
}

// Un grupo de conector presente en TODAS las plantas del camino: así es la misma escalera de
// principio a fin, no una combinación de conectores que en la realidad no se tocan entre sí.
function grupoComunEnCamino(camino, preferirAscensor) {
  const grupos = ['centro', 'oeste', 'este']
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

function nombresIntermedios(planta, indiceA, indiceB) {
  const paradas = PLANTAS[planta]
  const [desde, hasta] = indiceA < indiceB ? [indiceA, indiceB] : [indiceB, indiceA]
  return paradas.slice(desde + 1, hasta).map((p) => p.nombre)
}

// Caminando hacia el este, el lado norte queda a tu izquierda y el sur a tu derecha; hacia el
// oeste es al revés. Es geometría, no una suposición.
function girarHacia(lado, hacia) {
  const norteEsIzquierda = hacia === 'este'
  if (lado === 'norte') return norteEsIzquierda ? 'izquierda' : 'derecha'
  return norteEsIzquierda ? 'derecha' : 'izquierda'
}

function pasoCaminandoMismaPlanta(planta, origen, destino) {
  const paradas = PLANTAS[planta]
  const indiceOrigen = paradas.findIndex((p) => p.id === origen.id)
  const indiceDestino = paradas.findIndex((p) => p.id === destino.id)
  const intermedios = nombresIntermedios(planta, indiceOrigen, indiceDestino)
  const hacia = indiceDestino > indiceOrigen ? 'este' : 'oeste'
  const trayecto =
    intermedios.length > 0
      ? `por el pasillo de ${NOMBRE_PLANTA[planta]} pasando junto a: ${intermedios.join(', ')}`
      : `por el pasillo de ${NOMBRE_PLANTA[planta]}`

  let instruccion
  if (origen.lado) {
    instruccion = `Desde ${origen.nombre}, gira a la ${girarHacia(origen.lado, hacia)} y camina ${trayecto}, hasta llegar a ${destino.nombre}.`
  } else if (destino.lado) {
    // Saliendo de una escalera no se sabe hacia dónde queda mirando, así que en vez de inventar
    // el giro de salida se da el de LLEGADA, que sí se conoce.
    instruccion = `Desde ${origen.nombre}, camina ${trayecto}, y gira a la ${girarHacia(destino.lado, hacia)} para llegar a ${destino.nombre}.`
  } else {
    instruccion = `Desde ${origen.nombre}, camina ${trayecto}, hasta llegar a ${destino.nombre}.`
  }

  return { instruccion, checkpoint: destino.nombre }
}

function pasoCambioDePlanta(conector, plantaDestino, pisos) {
  const verbo = pisos > 0 ? 'sube' : 'baja'
  const medio = conector.esAscensor ? 'el ascensor' : 'las escaleras'
  const cantidad = Math.abs(pisos) === 1 ? '1 piso' : `${Math.abs(pisos)} pisos`
  return {
    instruccion: `Ahora toma ${medio} en ${conector.nombre} y ${verbo} ${cantidad} hasta la ${NOMBRE_PLANTA[plantaDestino]}.`,
    checkpoint: `llegar a ${NOMBRE_PLANTA[plantaDestino]} por ${conector.nombre}`
  }
}

export function calcularRuta(origenId, destinoId, preferirAscensor = true) {
  const origen = buscarParada(origenId)
  const destino = buscarParada(destinoId)
  if (!origen || !destino) return null

  if (origen.id === destino.id) {
    return {
      pasos: [{ instruccion: `Ya estás en ${destino.nombre}.`, checkpoint: destino.nombre }],
      origenNombre: origen.nombre,
      destinoNombre: destino.nombre
    }
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
    // No hay escalera ni ascensor que atraviese esas plantas. Se dice, en vez de inventar un
    // camino que no existe.
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

  const pasos = []
  const conectorOrigen = conectorEnPlanta(origen.planta, grupo, preferirAscensor)
  if (conectorOrigen.id !== origen.id) pasos.push(pasoCaminandoMismaPlanta(origen.planta, origen, conectorOrigen))
  pasos.push(pasoCambioDePlanta(conectorOrigen, destino.planta, destino.planta - origen.planta))
  const conectorDestino = conectorEnPlanta(destino.planta, grupo, preferirAscensor)
  if (conectorDestino.id !== destino.id) pasos.push(pasoCaminandoMismaPlanta(destino.planta, conectorDestino, destino))

  return { pasos, origenNombre: origen.nombre, destinoNombre: destino.nombre }
}
