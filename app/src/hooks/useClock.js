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

// Aquí vivía `ventanaBuenaParaLlamar`, que pintaba en Inicio un aviso permanente del tipo "no es la
// mejor hora para llamar a Ciudad de México, intenta más tarde". Se quitó: Carmen sabe perfectamente
// a qué hora puede llamar a su casa, y decírselo cada vez que abre la app es tratarla como si no.
// Los dos relojes ya dan el dato; qué hacer con él es cosa suya.
