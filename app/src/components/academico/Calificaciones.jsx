import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// Notas parciales por asignatura, con el promedio calculado.
//
// La vista "Mi expediente" lleva el expediente: una nota final por materia, ponderada por ECTS.
// Eso contesta "¿cómo llevo la carrera?". Esta contesta la otra pregunta, la que se hace de verdad a
// mitad de semestre: "con lo que llevo en esta asignatura, ¿cómo voy?" y sobre todo "¿cuánto
// necesito sacar en el examen final?".
//
// El cálculo lo hace el Worker, no esta pantalla: Maite dice los mismos números por voz, y con dos
// implementaciones acabarían diciendo cosas distintas de la misma asignatura.

function Barra({ porcentaje }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-lavanda-50">
      <div
        className="h-full rounded-full bg-gradient-to-r from-lavanda-500 to-lavanda-700 transition-all"
        style={{ width: `${Math.min(100, porcentaje)}%` }}
      />
    </div>
  )
}

function Veredicto({ m }) {
  if (m.pesoEvaluado === 0) {
    return <p className="text-xs text-morado-900/50">Todavía sin notas. Ve metiéndolas según te las den.</p>
  }
  if (m.minimosEnRiesgo.length > 0) {
    return (
      <p className="rounded-xl bg-red-50 p-2.5 text-xs leading-relaxed text-red-800">
        ⚠️ {m.minimosEnRiesgo.join('. ')}. Con eso la asignatura suspende aunque la media te dé.
      </p>
    )
  }
  if (m.aprobadaYa) {
    return (
      <p className="rounded-xl bg-green-50 p-2.5 text-xs font-medium text-green-800">
        Ya la tienes aprobada pase lo que pase en lo que queda 🎉
      </p>
    )
  }
  if (m.imposibleAprobar) {
    // Se dice, no se esconde — pero sin dramatismo y señalando que la extraordinaria existe.
    return (
      <p className="rounded-xl bg-melocoton-300 p-2.5 text-xs leading-relaxed text-morado-900">
        Con lo que queda ya no dan los números para la ordinaria. Queda la extraordinaria: habla con
        tu profesor para saber cómo se recupera esta.
      </p>
    )
  }
  if (m.necesarioParaAprobar !== null) {
    return (
      <p className="rounded-xl bg-crema-100 p-2.5 text-xs leading-relaxed text-morado-900/80">
        Para aprobar necesitas <span className="font-semibold">{m.necesarioParaAprobar}</span> de media en
        lo que te falta.
      </p>
    )
  }
  return null
}

function Materia({ m, onGuardar, onBorrar }) {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')

  async function guardar(componenteId) {
    const nota = Number(String(valor).replace(',', '.'))
    if (!valor.trim() || Number.isNaN(nota) || nota < 0 || nota > 10) {
      setError('Pon un número del 0 al 10.')
      return
    }
    setError('')
    await onGuardar(m.kbCode, componenteId, nota)
    setEditando(null)
    setValor('')
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <button onClick={() => setAbierto((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-morado-900">{m.materia}</p>
            <p className="mt-0.5 text-xs text-morado-900/50">
              {m.pesoEvaluado === 0
                ? `${m.componentes.length} apartados, ninguno calificado`
                : `${m.pesoEvaluado}% de la asignatura ya evaluado`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-bold tabular-nums text-lavanda-700">
              {m.notaHastaAhora === null ? '—' : m.notaHastaAhora}
            </p>
            <p className="text-[10px] text-morado-900/40">de media</p>
          </div>
        </div>
        <div className="mt-2">
          <Barra porcentaje={m.pesoEvaluado} />
        </div>
      </button>

      <div className="mt-2.5">
        <Veredicto m={m} />
      </div>

      <button
        onClick={() => setAbierto((v) => !v)}
        className="mt-2.5 rounded-full bg-lavanda-50 px-3 py-1.5 text-xs font-semibold text-lavanda-800"
      >
        {abierto ? 'Ocultar apartados' : 'Ver y meter notas'}
      </button>

      {abierto && (
        <div className="mt-3 flex flex-col gap-1.5">
          {/* De dónde salen estos porcentajes. Importa: no es lo mismo un reparto que viene de su
              guía docente que uno que se inventó ella porque la guía no lo publicaba, y si la
              pantalla no lo distingue, los dos parecen igual de fiables. */}
          {m.origen === 'extraido' && (
            <p className="rounded-xl bg-lavanda-50 p-2.5 text-[11px] leading-relaxed text-lavanda-900">
              Estos porcentajes los saqué de tu guía docente al preparar el semestre, y tú los revisaste.
            </p>
          )}
          {m.origen === 'manual' && (
            <p className="rounded-xl bg-melocoton-300/50 p-2.5 text-[11px] leading-relaxed text-morado-900">
              Este desglose lo pusiste tú a mano, no sale de la guía docente.
            </p>
          )}
          {m.origen === 'ninguno' && (
            <p className="rounded-xl bg-melocoton-300/50 p-2.5 text-[11px] leading-relaxed text-morado-900">
              Esta asignatura todavía no tiene desglose. Usa "Preparar" arriba para sacarlo de su guía
              docente.
            </p>
          )}
          {m.aviso && (
            <p className="rounded-xl bg-lavanda-50 p-2.5 text-[11px] leading-relaxed text-lavanda-900">{m.aviso}</p>
          )}
          {m.asistenciaMinima && (
            <p className="text-[11px] text-morado-900/50">
              Asistencia mínima obligatoria: {m.asistenciaMinima}%.
            </p>
          )}

          {m.componentes.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl bg-crema-100 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-morado-900">{c.nombre}</p>
                <p className="text-[10px] text-morado-900/45">
                  vale {c.peso}%
                  {c.cuantos ? ` · ${c.cuantos} entregas` : ''}
                  {c.minimo !== undefined ? ` · mínimo ${c.minimo}` : ''}
                </p>
              </div>

              {editando === c.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardar(c.id)}
                    placeholder="0-10"
                    className="w-16 rounded-lg border border-lavanda-200 p-1.5 text-center text-sm"
                  />
                  <button
                    onClick={() => guardar(c.id)}
                    className="rounded-lg bg-lavanda-700 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditando(c.id)
                    setValor(c.nota === null ? '' : String(c.nota))
                    setError('')
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
                    c.nota === null
                      ? 'bg-white text-lavanda-700 ring-1 ring-lavanda-200'
                      : c.minimo !== undefined && c.nota < c.minimo
                        ? 'bg-red-100 text-red-800'
                        : 'bg-lavanda-700 text-white'
                  }`}
                >
                  {c.nota === null ? 'Añadir' : c.nota}
                </button>
              )}

              {c.nota !== null && editando !== c.id && (
                <button
                  onClick={() => onBorrar(m.kbCode, c.id)}
                  className="shrink-0 text-[11px] text-red-700"
                  aria-label={`Borrar la nota de ${c.nombre}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default function Calificaciones({ recargarToken }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  const cargar = useCallback(() => {
    return api
      .calificacionesListar()
      .then((d) => {
        setDatos(d)
        setError(null)
      })
      .catch(() => {
        // Sin datos no se pinta un 0: decirle que va a cero cuando lo que pasa es que no cargó
        // sería mentirle sobre lo único de la app que le da ansiedad de verdad.
        setError('No pude cargar tus notas ahorita. Revisa tu conexión.')
        setDatos(null)
      })
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar, recargarToken])

  async function guardar(kbCode, componenteId, nota) {
    await api.calificacionGuardar({ kbCode, componenteId, nota })
    await cargar()
  }

  async function borrar(kbCode, componenteId) {
    await api.calificacionBorrar(kbCode, componenteId)
    await cargar()
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!datos) return <p className="text-sm text-morado-900/50">Cargando…</p>

  const { materias, resumen } = datos

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-lavanda-50 p-4">
        <p className="text-sm font-semibold text-morado-900">Tus notas, apartado por apartado</p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">
          Cada asignatura se evalúa por partes, con su peso. Ve metiendo cada nota según te la den y
          aquí sale tu media real y cuánto necesitas en lo que falta. Los porcentajes salen de tu guía
          docente.
        </p>
        <p className="mt-2 text-xs font-medium text-lavanda-800">
          {resumen.empezadas} de {resumen.total} asignaturas empezadas
          {resumen.enRiesgo > 0 ? ` · ${resumen.enRiesgo} con algo a lo que mirar` : ''}
        </p>
      </div>

      {materias.map((m) => (
        <Materia key={m.kbCode} m={m} onGuardar={guardar} onBorrar={borrar} />
      ))}
    </div>
  )
}
