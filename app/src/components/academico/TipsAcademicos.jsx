import { useEffect, useState } from 'react'
import { TIPS_POR_SEMESTRE, HAY_TIPS } from '../../data/tipsAcademicos.js'
import { obtenerBloqueActual, bloqueSabido } from '../../lib/semestreActual.js'

// Tips académicos — SOLO los del semestre en el que Carmen está.
//
// Es contenido de LECTURA: Carmen no lo edita, se actualiza cuando se edita kb/KB10 y se vuelve
// a desplegar. La misma fuente la consulta Maite en conversación, así que pantalla y agente
// nunca se contradicen. De los otros semestres no se enseña NADA — ni colapsado: verlos solo
// invita a leer consejos de asignaturas que no está cursando. Cuando cambie de semestre (Preparar
// semestre), esta pantalla cambia sola.

export default function TipsAcademicos() {
  const [bloque, setBloque] = useState(() => bloqueSabido())
  const [abierto, setAbierto] = useState(() => {
    const b = bloqueSabido()
    return `${b.curso}-${b.semestre}`
  })
  const [materiaAbierta, setMateriaAbierta] = useState(null)
  useEffect(() => {
    obtenerBloqueActual().then((b) => {
      setBloque(b)
      setAbierto(`${b.curso}-${b.semestre}`)
    })
  }, [])

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
      <p className="text-sm text-morado-900/60">Consejos de estudio para las materias de tu semestre.</p>

      {TIPS_POR_SEMESTRE.filter((s) => s.curso === bloque.curso && s.semestre === bloque.semestre).map((s) => {
        const clave = `${s.curso}-${s.semestre}`
        const estaAbierto = abierto === clave

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
