import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { conCache } from '../lib/cacheApi.js'

// Estado de los trámites de los primeros 30 días, compartido entre la tarjeta de progreso de
// Inicio y la pantalla completa de Ajustes.
//
// Vive en el Worker y no en localStorage como la vieja lista de casillas, y esa es la diferencia
// que hace que la función exista: el cron que manda "mañana tienes la cita del DNI" no puede leer
// el navegador de nadie. Si el estado se quedara en el móvil, los recordatorios serían imposibles.
export function useTramites() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  const cargar = useCallback(() => {
    return conCache('tramites', () => api.tramitesListar())
      .then((d) => {
        setDatos(d)
        setError(null)
      })
      .catch(() => {
        // Sin datos NO se inventa un progreso: enseñar "0/8" cuando en realidad no se pudo cargar
        // le diría que no ha hecho nada, que es peor que no enseñar nada.
        setError('No pude cargar tus trámites. Revisa tu conexión.')
        setDatos(null)
      })
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Todas las acciones recargan después: el servidor calcula `citaPasada` y el resumen, así que
  // adivinarlos aquí sería tener dos verdades distintas sobre lo mismo.
  const accion = useCallback(
    async (fn) => {
      await fn()
      await cargar()
    },
    [cargar]
  )

  return {
    tramites: datos?.tramites || null,
    resumen: datos?.resumen || null,
    hoy: datos?.hoy || null,
    desdeCache: datos?.__cache || null,
    error,
    recargar: cargar,
    agendar: (id, cita) => accion(() => api.tramiteAgendar(id, cita)),
    quitarCita: (id) => accion(() => api.tramiteQuitarCita(id)),
    completar: (id) => accion(() => api.tramiteCompletar(id)),
    reabrir: (id) => accion(() => api.tramiteReabrir(id))
  }
}

// Formatea "2026-08-15" + "09:30" para leerlo de un vistazo.
//
// La fecha se ancla a mediodía UTC a propósito: `new Date('2026-08-15')` se interpreta como
// medianoche UTC, y en un móvil configurado en México eso se pinta como el 14 de agosto. La cita
// saldría con un día menos justo en la pantalla que existe para no perderse una cita.
export function citaLegible(cita) {
  if (!cita) return null
  try {
    const dia = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date(`${cita.fecha}T12:00:00Z`))
    return `${dia} a las ${cita.hora}`
  } catch {
    return `${cita.fecha} a las ${cita.hora}`
  }
}

// Días que faltan, contados en fechas de calendario y no en horas: lo que importa es "es mañana",
// no "faltan 19,4 horas".
export function diasHasta(fecha, hoy) {
  if (!fecha || !hoy) return null
  const a = new Date(`${hoy}T12:00:00Z`)
  const b = new Date(`${fecha}T12:00:00Z`)
  return Math.round((b - a) / 86400000)
}
