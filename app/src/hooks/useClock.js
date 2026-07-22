import { useEffect, useState } from 'react'

export function useClock(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function formatInTZ(date, timeZone) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }).format(date)
}

// "Buena ventana para llamar a casa": ambas partes despiertas y no en horario típico de clase.
// Regla simple: hora de la ciudad de referencia entre 7:00-22:00 Y hora España entre 8:00-23:00.
export function ventanaBuenaParaLlamar(date, tzReferencia = 'America/Mexico_City') {
  const horaReferencia = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tzReferencia }).format(date))
  const horaEs = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(date))
  return horaReferencia >= 7 && horaReferencia <= 22 && horaEs >= 8 && horaEs <= 23
}
