import { useApp } from '../../context/AppContext.jsx'

export default function ModoEmergencia({ onSalir }) {
  const { config } = useApp()

  return (
    <div className="flex h-full flex-col gap-4 bg-noche-900 p-6 text-crema-50 safe-top safe-bottom">
      <p className="text-center text-sm uppercase tracking-wide text-terracota-300">Modo emergencia activo</p>

      <a
        href="tel:112"
        className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-red-600 py-8 text-center shadow-soft"
      >
        <span className="text-5xl font-bold">112</span>
        <span className="text-sm">Emergencias España — toca para llamar</span>
      </a>

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

      <p className="text-center text-xs text-crema-100/60">
        Esta app no es un servicio de emergencia. Si hay peligro inmediato, llama al 112 primero.
      </p>

      <button onClick={onSalir} className="mt-auto rounded-full border border-white/30 py-3 text-sm text-crema-100/80">
        Salir del modo emergencia
      </button>
    </div>
  )
}
