import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// "Preparar el siguiente semestre": leer las guías docentes de las asignaturas que vienen y sacar
// de ahí cómo se evalúa cada una.
//
// Las nueve de primero vienen transcritas a mano. Las otras cuarenta no, y copiarlas todas de
// golpe habría sido transcribir cuarenta párrafos de porcentajes para asignaturas que Carmen
// cursará dentro de tres años, con guías que para entonces habrán cambiado. Se hace cuando toca:
// cinco o seis cada seis meses, siempre con la versión vigente.
//
// Y nunca se guarda sin que ella lo vea. La extracción es buena pero no infalible, y un peso mal
// leído no da error — da un promedio equivocado que se creería todo el semestre.

function Propuesta({ p, onCambiar }) {
  const suma = Math.round((p.componentes || []).reduce((t, c) => t + (Number(c.peso) || 0), 0) * 100) / 100
  const cuadra = Math.abs(suma - 100) < 0.5

  if (!p.componentes?.length) {
    return (
      <div className="rounded-2xl bg-white p-3.5 shadow-soft">
        <p className="text-sm font-semibold text-morado-900">{p.materia}</p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">{p.motivo}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-morado-900">{p.materia}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            cuadra ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {suma}%
        </span>
      </div>

      {!cuadra && (
        <p className="mt-1.5 rounded-xl bg-red-50 p-2 text-[11px] leading-relaxed text-red-800">
          {p.motivo || `Los porcentajes suman ${suma} y tienen que sumar 100.`} Corrígelos abajo antes de
          guardar.
        </p>
      )}

      <div className="mt-2 flex flex-col gap-1.5">
        {p.componentes.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl bg-crema-100 p-2">
            <input
              value={c.nombre}
              onChange={(e) => {
                const comps = [...p.componentes]
                comps[i] = { ...c, nombre: e.target.value }
                onCambiar({ ...p, componentes: comps })
              }}
              className="min-w-0 flex-1 bg-transparent text-xs text-morado-900 outline-none"
            />
            <input
              type="text"
              inputMode="decimal"
              value={c.peso}
              onChange={(e) => {
                const comps = [...p.componentes]
                comps[i] = { ...c, peso: Number(String(e.target.value).replace(',', '.')) || 0 }
                onCambiar({ ...p, componentes: comps })
              }}
              className="w-14 rounded-lg border border-lavanda-200 bg-white p-1 text-center text-xs tabular-nums"
            />
            <span className="text-[11px] text-morado-900/40">%</span>
            <button
              onClick={() => onCambiar({ ...p, componentes: p.componentes.filter((_, j) => j !== i) })}
              className="text-[11px] text-red-700"
              aria-label={`Quitar ${c.nombre}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {p.aviso && (
        <p className="mt-2 rounded-xl bg-lavanda-50 p-2 text-[11px] leading-relaxed text-lavanda-900">{p.aviso}</p>
      )}
    </div>
  )
}

export default function PrepararSemestre({ onListo }) {
  const [semestres, setSemestres] = useState(null)
  const [elegido, setElegido] = useState(null)
  const [estado, setEstado] = useState('idle') // idle | leyendo | revisar | guardando | listo | error
  const [propuestas, setPropuestas] = useState([])
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(() => {
    return api
      .calificacionesSemestres()
      .then((d) => setSemestres(d.semestres || []))
      .catch(() => setSemestres([]))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function preparar(b) {
    setElegido(b)
    setEstado('leyendo')
    setMensaje('')
    try {
      const r = await api.calificacionesPreparar({ curso: b.curso, semestre: b.semestre })
      if (!r.propuestas?.length) {
        setEstado('listo')
        setMensaje(r.mensaje || 'Este semestre ya estaba preparado.')
        return
      }
      setPropuestas(r.propuestas)
      setEstado('revisar')
    } catch {
      setEstado('error')
      setMensaje('No pude leer las guías docentes ahorita. Inténtalo en un rato.')
    }
  }

  async function guardar() {
    setEstado('guardando')
    try {
      const utiles = propuestas.filter((p) => p.componentes?.length)
      const r = await api.calificacionesConfirmarSemestre({ materias: utiles })
      setEstado('listo')
      setMensaje(
        r.rechazadas?.length
          ? `Guardé ${r.guardadas.length}. No pude con ${r.rechazadas.length}: ${r.rechazadas
              .map((x) => x.motivo)
              .join('; ')}`
          : `Listo, ${r.guardadas.length} asignaturas preparadas ✅`
      )
      await cargar()
      onListo?.()
    } catch {
      setEstado('error')
      setMensaje('No se pudo guardar. Revisa que todos los porcentajes sumen 100.')
    }
  }

  if (estado === 'revisar') {
    const todasCuadran = propuestas
      .filter((p) => p.componentes?.length)
      .every((p) => Math.abs(p.componentes.reduce((t, c) => t + (Number(c.peso) || 0), 0) - 100) < 0.5)

    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setEstado('idle')} className="self-start text-sm text-lavanda-700">
          ← Volver
        </button>
        <div className="rounded-2xl bg-lavanda-50 p-3.5">
          <p className="text-sm font-semibold text-morado-900">
            Curso {elegido.curso}º, semestre {elegido.semestre}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-morado-900/60">
            Esto es lo que saqué de tus guías docentes. Revísalo antes de guardar — si algo no cuadra
            con lo que te dijo tu profesor, corrígelo aquí. Los porcentajes de cada asignatura tienen
            que sumar 100.
          </p>
        </div>

        {propuestas.map((p, i) => (
          <Propuesta
            key={p.kbCode}
            p={p}
            onCambiar={(nueva) => setPropuestas((ps) => ps.map((x, j) => (j === i ? nueva : x)))}
          />
        ))}

        <button
          onClick={guardar}
          disabled={!todasCuadran || estado === 'guardando'}
          className="rounded-xl bg-lavanda-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {estado === 'guardando' ? 'Guardando…' : 'Guardar este semestre'}
        </button>
        {!todasCuadran && (
          <p className="text-center text-xs text-red-700">
            Hay porcentajes que no suman 100. Corrígelos para poder guardar.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-lavanda-50 p-4">
        <p className="text-sm font-semibold text-morado-900">Preparar un semestre</p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">
          Cuando empieces un semestre nuevo, dale aquí. Leo las guías docentes de esas asignaturas,
          saco cómo se evalúa cada una y te lo enseño para que lo revises antes de guardarlo.
        </p>
      </div>

      {estado === 'leyendo' && (
        <p className="rounded-xl bg-crema-100 p-3 text-sm text-morado-900/70">
          Leyendo las guías docentes… esto tarda un poco, son varias asignaturas.
        </p>
      )}
      {(estado === 'listo' || estado === 'error') && mensaje && (
        <p
          className={`rounded-xl p-3 text-sm ${
            estado === 'error' ? 'bg-red-50 text-red-700' : 'bg-lavanda-50 text-lavanda-800'
          }`}
        >
          {mensaje}
        </p>
      )}

      {semestres === null ? (
        <p className="text-sm text-morado-900/50">Cargando…</p>
      ) : (
        semestres.map((b) => {
          const completo = b.preparadas === b.total
          return (
            <div key={`${b.curso}-${b.semestre}`} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-morado-900">
                  {b.curso}º curso · semestre {b.semestre}
                </p>
                <p className="mt-0.5 text-xs text-morado-900/50">
                  {b.preparadas} de {b.total} asignaturas preparadas
                </p>
              </div>
              {completo ? (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-800">
                  Listo ✓
                </span>
              ) : (
                <button
                  onClick={() => preparar(b)}
                  disabled={estado === 'leyendo'}
                  className="shrink-0 rounded-full bg-lavanda-700 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Preparar
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
