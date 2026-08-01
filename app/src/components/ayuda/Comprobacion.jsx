import { useState } from 'react'
import { correrComprobaciones, resumir, TOTAL_COMPROBACIONES } from '../../lib/comprobaciones.js'

// "¿Funciona todo?" — el diagnóstico, corriendo en el teléfono de Carmen.
//
// Esta pantalla existe por una queja concreta y justa: se puede probar la app entera desde un
// portátil y aun así entregar algo roto, porque la mitad de lo que tiene que funcionar no depende
// del código. Un permiso que ella no dio. Un Atajo de iOS que nadie llegó a crear. Un correo que
// sale del servidor y se queda en spam. Nada de eso lo detecta una prueba automática: se descubre
// el día que ella lo necesita y no lo tiene.
//
// La regla que ordena todo lo de aquí: **nunca pintar de verde algo que no se ha probado.** Hay un
// tercer estado, ámbar, para lo que sencillamente no se puede saber desde el navegador — y ese
// estado no es un fallo del diagnóstico, es el dato. Un ámbar dice "esto hay que probarlo a mano y
// nadie lo ha hecho", que es exactamente la información que faltaba.

const COLOR = {
  bien: { punto: 'bg-green-500', chip: 'bg-green-100 text-green-800', etiqueta: 'Funciona' },
  mal: { punto: 'bg-red-500', chip: 'bg-red-100 text-red-800', etiqueta: 'No funciona' },
  amano: { punto: 'bg-amber-500', chip: 'bg-amber-100 text-amber-900', etiqueta: 'Hay que probarlo a mano' }
}

function Fila({ r }) {
  const c = COLOR[r.estado]
  return (
    <div className="flex gap-3 border-t border-lavanda-100 py-3 first:border-t-0">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c.punto}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-morado-900">{r.titulo}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.chip}`}>{c.etiqueta}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">{r.detalle}</p>
        {r.arreglo && (
          <p className="mt-1.5 rounded-xl bg-crema-100 p-2 text-xs leading-relaxed text-morado-900/80">
            <span className="font-semibold">Qué hacer: </span>
            {r.arreglo}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Comprobacion() {
  const [resultados, setResultados] = useState([])
  const [corriendo, setCorriendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [cuando, setCuando] = useState(null)

  async function correr() {
    setCorriendo(true)
    setResultados([])
    setProgreso(0)
    // Se van pintando conforme terminan, no todas de golpe al final: si una se atasca, se ve
    // exactamente cuál, en vez de una pantalla parada sin explicación.
    const r = await correrComprobaciones((_, hechas) => {
      setProgreso(hechas)
      setResultados((prev) => [...prev])
    })
    setResultados(r)
    setCuando(new Date())
    setCorriendo(false)
  }

  const s = resumir(resultados)
  const grupos = [...new Set(resultados.map((r) => r.grupo))]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold text-morado-900">¿Funciona todo?</p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">
          Prueba las {TOTAL_COMPROBACIONES} piezas de la app desde este teléfono: el servidor, tus
          permisos, tus datos. Tarda menos de un minuto y no cambia nada.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-morado-900/50">
          Lo que salga en <span className="font-semibold text-amber-700">ámbar</span> no es un error: es
          algo que desde aquí no se puede saber y hay que probar a mano. Sale igual para que no se
          olvide.
        </p>
        <button
          onClick={correr}
          disabled={corriendo}
          className="mt-3 w-full rounded-xl bg-lavanda-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {corriendo ? `Comprobando… ${progreso} de ${TOTAL_COMPROBACIONES}` : 'Comprobar ahora'}
        </button>
      </div>

      {resultados.length > 0 && (
        <>
          <div className="flex gap-2">
            {[
              ['bien', s.bien],
              ['mal', s.mal],
              ['amano', s.amano]
            ].map(([k, n]) => (
              <div key={k} className={`flex-1 rounded-2xl p-3 text-center ${COLOR[k].chip}`}>
                <p className="text-xl font-bold tabular-nums">{n}</p>
                <p className="text-[10px] font-semibold leading-tight">{COLOR[k].etiqueta}</p>
              </div>
            ))}
          </div>

          {grupos.map((g) => (
            <div key={g} className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-lavanda-700">{g}</p>
              {resultados.filter((r) => r.grupo === g).map((r) => (
                <Fila key={r.id} r={r} />
              ))}
            </div>
          ))}

          <p className="text-center text-xs text-morado-900/40">
            Comprobado el {cuando?.toLocaleString('es-ES')}
          </p>
        </>
      )}
    </div>
  )
}
