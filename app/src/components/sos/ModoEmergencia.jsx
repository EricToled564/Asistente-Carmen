import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { api } from '../../lib/api.js'

export default function ModoEmergencia({ onSalir }) {
  const { config } = useApp()
  const [datosEmergencia, setDatosEmergencia] = useState(null)

  useEffect(() => {
    api
      .emergenciaObtener()
      .then(setDatosEmergencia)
      .catch(() => setDatosEmergencia(null)) // sin datos disponibles, la pantalla igual funciona
  }, [])

  return (
    <div className="flex h-full flex-col gap-4 bg-morado-900 p-6 text-crema-50 safe-top safe-bottom">
      <p className="text-center text-sm uppercase tracking-wide text-red-300">Modo emergencia activo</p>

      <a
        href="tel:112"
        className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-red-600 py-8 text-center shadow-soft"
      >
        <span className="text-5xl font-bold">112</span>
        <span className="text-sm">Emergencias España — toca para llamar</span>
      </a>

      {/* CAIVS: 24h, gratuito, confidencial, y NO hace falta denuncia previa para llamar (KB12).
          Va aquí y no escondido en el KB porque cuando hace falta, nadie se pone a preguntarle a
          un asistente de voz — se busca un botón. El 112 es para peligro inmediato; esto es para
          lo otro, que es lo que estadísticamente más le puede pasar a una chica de 18 años sola en
          una ciudad nueva. */}
      <div className="grid grid-cols-2 gap-3">
        <a href="tel:848463999" className="rounded-2xl bg-white/10 p-4 text-center">
          <p className="text-base font-semibold">📞 CAIVS</p>
          <p className="mt-0.5 text-xs text-crema-100/70">Violencia o acoso · 24h · confidencial</p>
        </a>
        <a
          href="https://wa.me/34621690351"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-white/10 p-4 text-center"
        >
          <p className="text-base font-semibold">💬 CAIVS</p>
          <p className="mt-0.5 text-xs text-crema-100/70">Por WhatsApp, si no puedes hablar</p>
        </a>
      </div>

      {config.consuladoTel && (
        <a href={`tel:${config.consuladoTel}`} className="rounded-2xl bg-white/10 p-4 text-center">
          <p className="text-lg font-semibold">📞 Consulado de México</p>
          <p className="text-sm text-crema-100/80">{config.consuladoTel}</p>
        </a>
      )}

      <div className="rounded-2xl bg-white/10 p-4 text-center">
        <p className="text-sm text-crema-100/70">Tu dirección</p>
        <p className="mt-1 text-xl font-semibold">{config.residenciaDireccion}</p>
      </div>

      {datosEmergencia?.nombreLegal && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4 text-center">
            <p className="text-xs text-crema-100/70">Nombre legal</p>
            <p className="mt-1 text-base font-semibold">{datosEmergencia.nombreLegal}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-center">
            <p className="text-xs text-crema-100/70">Tipo de sangre</p>
            <p className="mt-1 text-base font-semibold">{datosEmergencia.tipoSangre || 'No proporcionado'}</p>
          </div>
        </div>
      )}

      {/* Que quede dicho aquí, no solo en el onboarding: una app web NO puede marcar sola. iOS
          obliga a que un humano toque el botón y confirme, y eso no se puede saltar por diseño del
          sistema, no por falta de código. Lo único que marca solo es la Emergencia SOS nativa del
          iPhone — por eso es el primer punto de su checklist de los 30 días. */}
      <p className="text-center text-xs text-crema-100/60">
        Esta app no marca sola: tienes que tocar el botón. Si no puedes ni eso, usa la{' '}
        <span className="font-semibold text-crema-50">Emergencia SOS del iPhone</span> (mantén el botón lateral +
        volumen): esa llama al 112 y avisa a tus contactos con tu ubicación, sin que toques la pantalla.
      </p>

      <button onClick={onSalir} className="mt-auto rounded-full border border-white/30 py-3 text-sm text-crema-100/80">
        Salir del modo emergencia
      </button>
    </div>
  )
}
