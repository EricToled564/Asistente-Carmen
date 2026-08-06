// Señal compartida de "hay una grabación procesándose ahora mismo".
//
// Existe porque el procesamiento de una clase larga tarda 2-4 minutos y pasa en la pantalla de
// Captura — pero donde Carmen va a mirar es Mis apuntes, y ahí no había ninguna señal. El día que
// se probó, la grabación estaba procesándose y la lista vacía se leyó como "no se guardó nada": la
// información existía y la app la calló.
//
// Va en localStorage y no en estado de React porque las dos pantallas son componentes distintos y
// el de Captura se desmonta si ella navega a Apuntes mientras procesa; la subida sigue viva (el
// fetch no se cancela), así que la señal también tiene que seguir viva.

const CLAVE = 'maite.apunteProcesando'

// Más de 20 minutos es una señal huérfana (la página murió a mitad), no un proceso vivo. Se
// descarta para que un fallo antiguo no deje un "procesando…" eterno.
const MAX_MS = 20 * 60 * 1000

export function marcarProcesando(materia) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ materia, desde: Date.now() }))
  } catch {
    // Sin localStorage no hay señal, pero el procesamiento funciona igual.
  }
}

export function terminarProceso() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* nada */
  }
}

export function procesoActivo() {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p?.desde || Date.now() - p.desde > MAX_MS) {
      terminarProceso()
      return null
    }
    return { materia: p.materia || '', minutos: Math.floor((Date.now() - p.desde) / 60000) }
  } catch {
    return null
  }
}
