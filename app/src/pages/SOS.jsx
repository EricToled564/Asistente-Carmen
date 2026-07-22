import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { getCurrentPosition, getBatteryLevel } from '../hooks/useGeolocation.js'
import SOSButton from '../components/sos/SOSButton.jsx'
import ModoEmergencia from '../components/sos/ModoEmergencia.jsx'

export default function SOS() {
  const { config } = useApp()
  const [modoEmergencia, setModoEmergencia] = useState(false)
  const [estado, setEstado] = useState('idle') // idle | enviando | enviado | error

  async function disparar() {
    setEstado('enviando')
    const [posicion, bateria] = await Promise.all([getCurrentPosition(), getBatteryLevel()])

    const payload = {
      lat: posicion.ok ? posicion.lat : null,
      lng: posicion.ok ? posicion.lng : null,
      ubicacionDisponible: posicion.ok,
      bateria
    }

    try {
      await api.sos(payload)
      setEstado('enviado')
    } catch {
      // Nunca falla en silencio: aunque el Worker no responda, seguimos al modo
      // emergencia y dejamos abierto el canal de WhatsApp como respaldo manual.
      setEstado('error')
    }

    if (config.whatsappNumero && posicion.ok) {
      const texto = encodeURIComponent(
        `🆘 SOS desde Maite. Mi ubicación: https://www.google.com/maps?q=${posicion.lat},${posicion.lng}${
          bateria != null ? ` — batería ${bateria}%` : ''
        }`
      )
      window.open(`https://wa.me/${config.whatsappNumero}?text=${texto}`, '_blank')
    }

    setModoEmergencia(true)
  }

  if (modoEmergencia) {
    return (
      <ModoEmergencia
        onSalir={() => {
          setModoEmergencia(false)
          setEstado('idle')
        }}
      />
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-red-700">SOS</h1>
        <p className="mt-1 max-w-xs text-sm text-morado-900/60">
          Mantén presionado para avisar a tu familia con tu ubicación. Tienes 5 segundos para cancelar.
        </p>
      </div>

      <SOSButton onDisparar={disparar} />

      {estado === 'enviando' && <p className="text-sm text-morado-900/60">Enviando…</p>}
      {estado === 'enviado' && <p className="text-sm font-semibold text-green-700">Aviso enviado ✓</p>}
      {estado === 'error' && (
        <p className="max-w-xs text-sm text-red-700">
          No pudimos confirmar el envío automático — usa el WhatsApp que se abrió como respaldo.
        </p>
      )}

      <p className="max-w-xs text-xs text-morado-900/40">
        Esto no reemplaza la Emergencia SOS nativa del iPhone. Peligro inmediato → 112 primero.
      </p>
    </div>
  )
}
