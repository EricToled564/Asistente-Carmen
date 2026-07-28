import { useEffect, useRef, useState } from 'react'

// Menú de secciones desplegable, en vez de la fila de pastillas que se desplazaba en horizontal.
//
// El problema de las pastillas no era estético: Académico tiene ocho secciones y en una pantalla de
// móvil caben tres. Las otras cinco —incluidas Apuntes y Captura, que son de las que más se usan—
// solo existían si a alguien se le ocurría arrastrar la fila hacia un lado. Nada indicaba que
// hubiera más, así que la mitad de la pestaña era invisible.
//
// Desplegado se ven TODAS de golpe, con su nombre completo. Cerrado ocupa una línea y deja el
// espacio para el contenido, que es lo que ella viene a ver.
export default function MenuColapsable({ secciones, activa, onCambiar, etiqueta = 'Sección' }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const actual = secciones.find((s) => s.id === activa) || secciones[0]

  // Cerrar al tocar fuera y con Escape. Sin esto, el menú se queda abierto tapando el contenido y
  // la única forma de cerrarlo es elegir algo — que es justo lo que no quiere quien lo abrió por
  // error.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false)
    }
    const escape = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative px-5 pb-3">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 rounded-2xl bg-lavanda-700 px-4 py-2.5 text-left text-sm font-semibold text-white shadow-soft"
      >
        <span className="flex-1 truncate">{actual?.label}</span>
        {/* Cuántas secciones hay, escrito con la palabra. Antes ponía "1/6" —la posición de la
            sección actual— y al lado de un título como "Primeros 30 días", que justo debajo enseña
            su progreso real ("1/8"), se leía como si fueran dos cuentas del mismo dato que no
            cuadran. Una fracción suelta junto a un título siempre se lee como progreso. */}
        <span className="shrink-0 text-xs font-normal text-lavanda-100">{secciones.length} secciones</span>
        <span className={`transition-transform ${abierto ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {abierto && (
        <ul
          role="listbox"
          aria-label={etiqueta}
          // Flotante y no en flujo: si empujara el contenido hacia abajo, abrir el menú movería de
          // sitio lo que estabas mirando y al cerrarlo daría un salto.
          className="absolute left-5 right-5 z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-glow ring-1 ring-lavanda-100"
        >
          {secciones.map((s) => {
            const esActual = s.id === actual?.id
            return (
              <li key={s.id} role="option" aria-selected={esActual}>
                <button
                  onClick={() => {
                    onCambiar(s.id)
                    setAbierto(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${
                    esActual ? 'bg-lavanda-50 font-semibold text-lavanda-800' : 'text-morado-900'
                  }`}
                >
                  <span className="flex-1">{s.label}</span>
                  {esActual && <span className="text-xs text-lavanda-600">●</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
