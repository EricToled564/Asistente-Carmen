// Mapa interior real: un Google My Maps hecho a mano con las plantas del edificio (Planta -1, 0,
// 1...), aulas, baños, escaleras, ascensores, cafetería, etc, todo con capas que se pueden
// prender/apagar. Se embebe tal cual con el iframe oficial de Google My Maps — Google ya resuelve
// el pan/zoom/capas, no reinventamos nada de eso. Por eso el 90% de esta pantalla es contenido de
// Google que no controlamos visualmente — lo único "nuestro" es el marco de arriba/abajo.
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

export default function PlanoEdificio({ onClose, onIrARuta }) {
  const mid = import.meta.env.VITE_MAPA_INTERIOR_MID || MID_DEFAULT
  const ll = import.meta.env.VITE_MAPA_INTERIOR_LL || LL_DEFAULT
  const z = import.meta.env.VITE_MAPA_INTERIOR_ZOOM || Z_DEFAULT

  return (
    <div className="flex h-full flex-col bg-morado-950">
      <div className="flex items-center justify-between bg-gradient-to-b from-morado-800 to-morado-950 px-4 py-3">
        <button onClick={onClose} className="text-2xl leading-none text-crema-50" aria-label="Cerrar">
          ←
        </button>
        <p className="text-sm font-semibold text-crema-50">🏛️ Plano interior — Arquitectura</p>
        <div className="w-8" />
      </div>

      {mid ? (
        <>
          <div className="flex items-center justify-between gap-2 bg-morado-900 px-4 py-2.5">
            <p className="text-xs text-crema-100/70">
              Toca <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-crema-50">☰</span> arriba a la
              izquierda del mapa para cambiar de piso (Planta -1, 0, 1…).
            </p>
            {onIrARuta && (
              <button
                onClick={onIrARuta}
                className="shrink-0 rounded-full bg-lavanda-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
              >
                🧭 Guíame
              </button>
            )}
          </div>
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
