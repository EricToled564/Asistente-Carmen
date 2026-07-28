import { useEffect, useRef, useState } from 'react'
import {
  buscarCiudades,
  ciudadesPorPais,
  TOTAL_CIUDADES,
  TOTAL_PAISES
} from '../../data/ciudadesReferencia.js'

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
//
// Sin escribir nada se ve la lista COMPLETA agrupada por país. Antes se cortaba en 40 y, como
// México va primero con 41 ciudades, la lista parecía tener solo México: el resto existía pero era
// invisible hasta ponerse a escribir a ciegas. La cabecera de cada país y el contador de arriba
// dejan claro de un vistazo cuánto hay.
export default function SelectorCiudad({ actual, onElegir, onCerrar, onNavigate }) {
  const [consulta, setConsulta] = useState('')
  const contenedor = useRef(null)
  const buscando = consulta.trim().length > 0
  const resultados = buscarCiudades(consulta)
  const grupos = buscando ? [] : ciudadesPorPais()

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

      {!buscando && (
        <p className="px-3 pt-1.5 text-[11px] text-morado-900/45">
          {TOTAL_CIUDADES} ciudades de {TOTAL_PAISES} países · desplázate o escribe para filtrar
        </p>
      )}

      <ul className="mt-1.5 max-h-64 overflow-y-auto">
        {!buscando ? (
          grupos.map((g) => (
            <li key={g.pais}>
              {/* Sin `sticky`: fijada arriba, la cabecera se montaba encima de la primera ciudad del
                  grupo y tapaba su nombre (se leía "JAPÓN · 5:09" sin "Tokio"). Cada fila ya dice
                  su país debajo, así que fijarla no aportaba nada y sí quitaba. */}
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-morado-900/40">
                {g.pais}
              </p>
              <ul>
                {g.ciudades.map((c) => (
                  <li key={`${c.nombre}-${c.tz}`}>
                    <Opcion ciudad={c} actual={actual} onElegir={onElegir} onCerrar={onCerrar} />
                  </li>
                ))}
              </ul>
            </li>
          ))
        ) : resultados.length === 0 ? (
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
          resultados.map((c) => (
            <li key={`${c.nombre}-${c.tz}`}>
              <Opcion ciudad={c} actual={actual} onElegir={onElegir} onCerrar={onCerrar} />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function Opcion({ ciudad, actual, onElegir, onCerrar }) {
  const esActual = ciudad.nombre === actual?.nombre
  return (
    <button
      onClick={() => {
        onElegir(ciudad)
        onCerrar()
      }}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${esActual ? 'bg-lavanda-50' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${esActual ? 'font-semibold text-lavanda-800' : 'text-morado-900'}`}>
          {ciudad.nombre}
        </span>
        <span className="block text-[11px] text-morado-900/45">
          {ciudad.pais} ·{' '}
          {/* La hora actual de cada opción, para elegir sin tener que imaginársela. */}
          {new Intl.DateTimeFormat('es-ES', { timeStyle: 'short', timeZone: ciudad.tz }).format(new Date())}
        </span>
      </span>
      {esActual && <span className="text-xs text-lavanda-600">●</span>}
    </button>
  )
}
