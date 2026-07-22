// Mapa interior real: un Google My Maps hecho a mano con las plantas del edificio (Planta -1, 0,
// 1...), aulas, baños, escaleras, ascensores, cafetería, etc, todo con capas que se pueden
// prender/apagar. Se embebe tal cual con el iframe oficial de Google My Maps — Google ya resuelve
// el pan/zoom/capas, no reinventamos nada de eso.
//
// El "mid" (map ID) es el identificador del mapa en Google My Maps. Si algún día se rehace el
// mapa desde cero, solo hay que reemplazar VITE_MAPA_INTERIOR_MID en app/.env con el mid nuevo
// (se saca de la URL al abrir el mapa: .../viewer?mid=AQUI_ESTA).
const MID_DEFAULT = '1iquvC0I2WUC3kOCaInYVIwLDXjM5Sbo'
// Centro y zoom del edificio (sacados del link original que compartiste, con ?ll=...&z=21).
// Sin esto, el embed carga con la vista por default de Google (zoom de toda la ciudad) — en un
// celular eso se ve como un punto ilegible, no como el plano del edificio.
const LL_DEFAULT = '42.79925098358511,-1.6580781721418103'
const Z_DEFAULT = '21'

export default function PlanoEdificio({ onClose }) {
  const mid = import.meta.env.VITE_MAPA_INTERIOR_MID || MID_DEFAULT
  const ll = import.meta.env.VITE_MAPA_INTERIOR_LL || LL_DEFAULT
  const z = import.meta.env.VITE_MAPA_INTERIOR_ZOOM || Z_DEFAULT

  return (
    <div className="flex h-full flex-col bg-morado-950">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-2xl leading-none text-crema-50" aria-label="Cerrar">
          ←
        </button>
        <p className="text-sm font-medium text-crema-50/80">Plano interior — Escuela de Arquitectura</p>
        <div className="w-8" />
      </div>

      {mid ? (
        <>
          <p className="px-4 pb-2 text-center text-xs text-crema-100/60">
            Toca el ícono ☰ arriba a la izquierda del mapa para mostrar/ocultar pisos (Planta -1, 0, 1…).
          </p>
          <iframe
            title="Plano interior del edificio"
            src={`https://www.google.com/maps/d/embed?mid=${mid}&ll=${ll}&z=${z}`}
            className="w-full flex-1 border-0"
            loading="lazy"
            allowFullScreen
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-4xl">🗺️</p>
          <p className="font-semibold text-crema-50">Todavía no hay un mapa interior cargado</p>
          <p className="max-w-xs text-sm text-crema-100/70">
            Falta <code className="rounded bg-white/10 px-1">VITE_MAPA_INTERIOR_MID</code> en{' '}
            <code className="rounded bg-white/10 px-1">app/.env</code>.
          </p>
        </div>
      )}
    </div>
  )
}
