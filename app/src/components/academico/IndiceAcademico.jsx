import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { INDICE_ACADEMICO } from '../../data/indiceAcademico.js'

export default function IndiceAcademico() {
  const [cursoAbierto, setCursoAbierto] = useState(1)
  const [materiaActiva, setMateriaActiva] = useState(null)
  const { setContextoAgente } = useApp()

  useEffect(() => {
    setContextoAgente(
      materiaActiva
        ? `Carmen quiere información sobre la materia "${materiaActiva.titulo}" (${materiaActiva.kbCode}). Responde solo con lo que tengas en ese documento del KB.`
        : null
    )
    return () => setContextoAgente(null)
  }, [materiaActiva, setContextoAgente])

  if (materiaActiva) {
    return (
      <div className="flex h-full flex-col gap-3">
        <button onClick={() => setMateriaActiva(null)} className="self-start text-sm text-lavanda-700">
          ← Volver al índice
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">{materiaActiva.kbCode}</p>
          <p className="text-lg font-semibold text-morado-900">{materiaActiva.titulo}</p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">💬</span>
          <p className="text-sm text-morado-900/60">
            Toca el botón de Maite (arriba a la derecha) y pregúntale lo que quieras de esta materia — temario,
            evaluación, bibliografía. Ya sabe de cuál le estás hablando.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-morado-900/60">
        Todas tus materias, curso por curso. Toca una para preguntarle a Maite sobre ella.
      </p>
      {INDICE_ACADEMICO.map((c) => {
        const abierto = cursoAbierto === c.curso
        return (
          <div key={c.curso} className="overflow-hidden rounded-2xl bg-white shadow-soft">
            <button
              onClick={() => setCursoAbierto(abierto ? null : c.curso)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span className="font-display text-lg font-bold text-morado-900">{c.curso}º curso</span>
              <span className={`text-lavanda-700 transition-transform ${abierto ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {abierto && (
              <div className="flex flex-col gap-4 px-4 pb-4">
                {c.semestres.map((s) => (
                  <div key={s.semestre} className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-morado-900/40">
                      {s.semestre}
                      {s.semestre === 1 ? 'er' : 'o'} semestre
                    </p>
                    {s.materias.length === 0 ? (
                      <p className="text-sm text-morado-900/40">Sin guía docente todavía.</p>
                    ) : (
                      s.materias.map((m) => (
                        <button
                          key={m.kbCode + m.titulo}
                          onClick={() => setMateriaActiva(m)}
                          className="flex items-center justify-between rounded-xl bg-lavanda-50 px-3 py-2 text-left text-sm"
                        >
                          <span className="text-morado-900">{m.titulo}</span>
                          <span className="text-lavanda-700">→</span>
                        </button>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
