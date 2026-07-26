import { useState } from 'react'
import { TIPS_POR_SEMESTRE, HAY_TIPS, semestreActual } from '../../data/tipsAcademicos.js'

// Tips académicos — navegación en dos niveles: semestre → materia.
//
// Es contenido de LECTURA: Carmen no lo edita, se actualiza cuando se edita kb/KB10 y se vuelve
// a desplegar. La misma fuente la consulta Maite en conversación, así que pantalla y agente
// nunca se contradicen. Arranca abierto en su semestre actual (1º curso), el resto colapsado.
const CURSO_ACTUAL = 1

export default function TipsAcademicos() {
  const [abierto, setAbierto] = useState(`${CURSO_ACTUAL}-${semestreActual()}`)
  const [materiaAbierta, setMateriaAbierta] = useState(null)

  if (!HAY_TIPS || TIPS_POR_SEMESTRE.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">💡</span>
        <p className="font-display text-lg font-bold text-morado-900">Aún no hay tips cargados</p>
        <p className="text-sm text-morado-900/60">
          Esta pantalla lee <code className="rounded bg-lavanda-50 px-1">kb/KB10-tips-academicos.md</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-morado-900/60">
        Consejos de estudio por materia, semestre por semestre. El tuyo viene abierto.
      </p>

      {TIPS_POR_SEMESTRE.map((s) => {
        const clave = `${s.curso}-${s.semestre}`
        const estaAbierto = abierto === clave
        const esElSuyo = s.curso === CURSO_ACTUAL && s.semestre === semestreActual()

        return (
          <div key={clave} className="overflow-hidden rounded-2xl bg-white shadow-soft">
            <button
              onClick={() => {
                setAbierto(estaAbierto ? null : clave)
                setMateriaAbierta(null)
              }}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span>
                <span className="font-display text-base font-bold text-morado-900">
                  {s.curso}º curso · {s.semestre}
                  {s.semestre === 1 ? 'er' : 'º'} semestre
                </span>
                <span className="block text-xs text-morado-900/45">
                  {s.materias.length} {s.materias.length === 1 ? 'materia' : 'materias'}
                  {esElSuyo ? ' · el tuyo ahora' : ''}
                </span>
              </span>
              <span className={`text-lavanda-700 transition-transform ${estaAbierto ? 'rotate-180' : ''}`}>⌄</span>
            </button>

            {estaAbierto && (
              <div className="flex flex-col gap-1.5 px-4 pb-4">
                {s.materias.map((m) => {
                  const claveMateria = `${clave}-${m.materia}`
                  const visible = materiaAbierta === claveMateria
                  return (
                    <div key={claveMateria} className="overflow-hidden rounded-xl bg-lavanda-50">
                      <button
                        onClick={() => setMateriaAbierta(visible ? null : claveMateria)}
                        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
                      >
                        <span className="text-sm font-medium text-morado-900">{m.materia}</span>
                        <span className={`shrink-0 text-lavanda-700 transition-transform ${visible ? 'rotate-180' : ''}`}>
                          ⌄
                        </span>
                      </button>
                      {visible && (
                        <p className="whitespace-pre-line px-3 pb-3 text-sm leading-relaxed text-morado-900/75">
                          {m.tip}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <p className="px-1 text-xs text-morado-900/45">
        Maite también conoce estos tips — puedes pedírselos en conversación desde el Tutor.
      </p>
    </div>
  )
}
