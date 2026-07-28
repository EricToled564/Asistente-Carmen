import { useEffect, useRef, useState } from 'react'
import { buscarCiudades } from '../../data/ciudadesReferencia.js'

// Elegir la ciudad del reloj secundario, buscando en vez de desplegando.
//
// Antes era un <select> con ocho opciones. Con ocho, un desplegable nativo va bien; con ciento
// cincuenta es inusable en un móvil —hay que arrastrar una rueda a ciegas— y con ocho la función
// simplemente no servía en cuanto la ciudad que buscaba no estaba.
//
// No se deja escribir libre y ya: de un texto no sale una zona horaria, y sin zona no hay hora que
// calcular. Ella escribe, la lista filtra, y lo que se guarda es siempre una ciudad real con su
// identificador IANA. Si no encuentra la suya, se lo decimos y le ofrecemos preguntarle a Maite,
// que sí sabe la hora de cualquier ciudad.
export default function SelectorCiudad({ actual, onElegir, onCerrar, onNavigate }) {
  const [consulta, setConsulta] = useState('')
  const contenedor = useRef(null)
  const resultados = buscarCiudades(consulta)

  useEffect(() => {
    const fuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) onCerrar()
    }
    const escape = (e) => e.key === 'Escape' && onCerrar()
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [onCerrar])

  return (
    <div ref={contenedor} className="absolute left-0 right-0 top-0 z-40 rounded-2xl bg-white p-2 shadow-glow ring-1 ring-lavanda-100">
      <input
        autoFocus
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        placeholder="Busca una ciudad…"
        className="w-full rounded-xl border border-lavanda-200 px-3 py-2 text-sm text-morado-900 outline-none focus:border-lavanda-500"
      />

      <ul className="mt-1.5 max-h-64 overflow-y-auto">
        {resultados.length === 0 ? (
          <li className="p-3 text-xs leading-relaxed text-morado-900/60">
            No tengo esa ciudad en la lista. Puedes preguntarle la hora a Maite: ella sabe la de
            cualquier sitio del mundo.
            {onNavigate && (
              <button
                onClick={() => {
                  onCerrar()
                  onNavigate('agente')
                }}
                className="mt-2 block rounded-full bg-lavanda-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Preguntarle a Maite
              </button>
            )}
          </li>
        ) : (
          resultados.map((c) => {
            const esActual = c.nombre === actual?.nombre
            return (
              <li key={`${c.nombre}-${c.tz}`}>
                <button
                  onClick={() => {
                    onElegir(c)
                    onCerrar()
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${
                    esActual ? 'bg-lavanda-50' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${esActual ? 'font-semibold text-lavanda-800' : 'text-morado-900'}`}>
                      {c.nombre}
                    </span>
                    <span className="block text-[11px] text-morado-900/45">
                      {c.pais} ·{' '}
                      {/* La hora actual de cada opción, para elegir sin tener que imaginársela. */}
                      {new Intl.DateTimeFormat('es-ES', { timeStyle: 'short', timeZone: c.tz }).format(new Date())}
                    </span>
                  </span>
                  {esActual && <span className="text-xs text-lavanda-600">●</span>}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
