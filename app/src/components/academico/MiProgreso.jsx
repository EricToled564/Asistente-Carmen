import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { INDICE_ACADEMICO } from '../../data/indiceAcademico.js'
import { obtenerEctsMateria } from '../../data/materiasContenido.js'
import SubidaDocumento from '../comun/SubidaDocumento.jsx'

// "Mi Progreso" — promedio del expediente y su tendencia.
//
// Decisión de diseño deliberada: NUNCA se muestra un objetivo numérico. La mención de 4º se
// asigna por orden de expediente entre quienes la piden, y no hay una nota mínima publicada —
// depende de cuántos compañeros pidan cada mención ese año y de los cupos. Inventar un "te falta
// 0.3 para Producto" sería falsear algo que le importa de verdad. Por eso: el número real, su
// tendencia, y el contexto honesto siempre visible. Sin ranking ni percentiles: no tenemos ese
// dato de nadie más y no se simula.

// Solo 1º y 2º curso definen la mención (KB1), así que son las que se pueden registrar.
const MATERIAS_QUE_CUENTAN = INDICE_ACADEMICO.filter((c) => c.curso <= 2).flatMap((c) =>
  c.semestres.flatMap((s) =>
    s.materias.map((m) => ({
      ...m,
      curso: c.curso,
      semestre: s.semestre,
      ects: obtenerEctsMateria(m.kbCode)
    }))
  )
)

export default function MiProgreso() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [mostrarSubida, setMostrarSubida] = useState(false)
  const [manual, setManual] = useState({ kbCode: '', nota: '' })

  async function cargar() {
    try {
      setDatos(await api.notasListar())
    } catch {
      setError('No pude cargar tus notas ahorita.')
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const historial = useMemo(() => {
    if (!datos?.notas?.length) return []
    // Promedio ponderado acumulado tras cada nota registrada — la tendencia real, no una curva
    // decorativa: cada punto es cómo iba su expediente en ese momento.
    let sumaPonderada = 0
    let sumaEcts = 0
    return datos.notas
      .filter((n) => n.curso <= 2 && n.nota >= 5)
      .map((n) => {
        sumaPonderada += n.nota * n.ects
        sumaEcts += n.ects
        return { materia: n.materia, promedio: sumaPonderada / sumaEcts }
      })
  }, [datos])

  async function procesar({ modo, archivo }) {
    if (modo === 'foto') {
      if (!archivo) throw new Error('Elige una foto primero')
      const fd = new FormData()
      fd.append('imagen', archivo)
      const res = await api.notaExtraerDeFoto(fd)
      if (res.necesitaAclaracion) return res
      // Se intenta emparejar el nombre leído con una materia del plan; si no cuadra, ella la
      // elige en la vista previa. Nunca se guarda una materia que no exista en su plan.
      const encontrada = MATERIAS_QUE_CUENTAN.find((m) =>
        m.titulo.toLowerCase().includes((res.materia || '').toLowerCase().slice(0, 12))
      )
      return { preview: { kbCode: encontrada?.kbCode || '', nota: String(res.nota ?? '') } }
    }
    if (!manual.kbCode || manual.nota === '') throw new Error('Elige la materia y escribe la calificación')
    return { preview: { ...manual } }
  }

  async function confirmar(preview) {
    const materia = MATERIAS_QUE_CUENTAN.find((m) => m.kbCode === preview.kbCode)
    if (!materia) throw new Error('Elige una materia de tu plan')
    if (!materia.ects) throw new Error('Esa materia no tiene ECTS en su guía docente')
    await api.notaGuardar({
      kbCode: materia.kbCode,
      materia: materia.titulo,
      nota: Number(preview.nota),
      ects: materia.ects,
      curso: materia.curso
    })
    setManual({ kbCode: '', nota: '' })
    setMostrarSubida(false)
    cargar()
  }

  async function borrar(id) {
    await api.notaBorrar(id)
    cargar()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* El número, sin objetivo inventado al lado */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-5 shadow-glow">
        <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <p className="relative text-xs font-semibold uppercase tracking-wide text-lavanda-100">Nota media del expediente</p>
        <p className="relative mt-1 font-display text-5xl font-bold tabular-nums text-white">
          {datos?.promedio != null ? datos.promedio.toFixed(2) : '—'}
        </p>
        <p className="relative mt-1 text-xs text-lavanda-50/85">
          {datos?.materias
            ? `${datos.materias} ${datos.materias === 1 ? 'materia' : 'materias'} · ${datos.ectsComputados} ECTS computados`
            : 'Aún no has registrado ninguna calificación'}
        </p>
      </div>

      {/* Contexto honesto: siempre visible, nunca colapsable */}
      <div className="rounded-2xl bg-crema-100 p-4">
        <p className="text-xs leading-relaxed text-morado-900/75">
          {datos?.contexto ||
            'La mención se asigna por orden de expediente entre quienes la piden — no hay una nota fija que garantice un lugar, así que esto es tu progreso, no una cuenta regresiva a un número mágico.'}
        </p>
      </div>

      {historial.length > 1 && <Tendencia historial={historial} />}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Registrar una calificación — mismo componente de subida que el resto de la app */}
      <div className="rounded-3xl bg-white p-4 shadow-soft">
        {mostrarSubida ? (
          <SubidaDocumento
            titulo="Registrar una calificación"
            descripcion="Sube la foto de tu boletín o escríbela a mano — revisas antes de guardar."
            textoExito="Calificación registrada ✅"
            onProcesar={procesar}
            onConfirmar={confirmar}
            camposManual={
              <div className="flex flex-col gap-2">
                <select
                  value={manual.kbCode}
                  onChange={(e) => setManual((m) => ({ ...m, kbCode: e.target.value }))}
                  className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-sm text-morado-900"
                >
                  <option value="">Elige la materia…</option>
                  {MATERIAS_QUE_CUENTAN.map((m) => (
                    <option key={m.kbCode} value={m.kbCode}>
                      {m.curso}º · {m.titulo}
                      {m.ects ? ` (${m.ects} ECTS)` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={manual.nota}
                  onChange={(e) => setManual((m) => ({ ...m, nota: e.target.value }))}
                  placeholder="Calificación (0-10)"
                  className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-sm text-morado-900"
                />
              </div>
            }
            renderPreview={(preview, setPreview) => (
              <div className="flex flex-col gap-2">
                <select
                  value={preview?.kbCode || ''}
                  onChange={(e) => setPreview({ ...preview, kbCode: e.target.value })}
                  className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-sm text-morado-900"
                >
                  <option value="">Elige la materia…</option>
                  {MATERIAS_QUE_CUENTAN.map((m) => (
                    <option key={m.kbCode} value={m.kbCode}>
                      {m.curso}º · {m.titulo}
                      {m.ects ? ` (${m.ects} ECTS)` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={preview?.nota ?? ''}
                  onChange={(e) => setPreview({ ...preview, nota: e.target.value })}
                  className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-sm text-morado-900"
                />
              </div>
            )}
          />
        ) : (
          <button
            onClick={() => setMostrarSubida(true)}
            className="w-full rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]"
          >
            + Registrar una calificación
          </button>
        )}
      </div>

      {datos?.notas?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-morado-900/40">Tus calificaciones</p>
          {datos.notas.map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                  n.nota >= 5 ? 'bg-lavanda-100 text-lavanda-800' : 'bg-melocoton-300 text-morado-900'
                }`}
              >
                {n.nota}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-morado-900">{n.materia}</p>
                <p className="text-xs text-morado-900/50">
                  {n.curso}º curso · {n.ects} ECTS
                  {n.nota < 5 && ' · no computa hasta aprobar'}
                </p>
              </div>
              <button onClick={() => borrar(n.id)} className="shrink-0 px-2 text-morado-900/30" aria-label="Borrar">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Gráfica de tendencia dibujada a mano en SVG — no vale la pena una librería de charts para una
// línea. Cada punto es el promedio acumulado tras registrar esa materia.
function Tendencia({ historial }) {
  const W = 300
  const H = 90
  const valores = historial.map((h) => h.promedio)
  const min = Math.min(...valores, 5)
  const max = Math.max(...valores, 10)
  const rango = max - min || 1

  const puntos = historial.map((h, i) => ({
    x: (i / Math.max(1, historial.length - 1)) * (W - 20) + 10,
    y: H - 12 - ((h.promedio - min) / rango) * (H - 26)
  }))
  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-morado-900/40">Cómo va tu promedio</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
        <path d={linea} fill="none" stroke="#7C4DBC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#7C4DBC" />
        ))}
      </svg>
      <p className="text-[11px] text-morado-900/45">
        Cada punto es tu promedio después de registrar una materia más.
      </p>
    </div>
  )
}
