import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { INDICE_ACADEMICO } from '../../data/indiceAcademico.js'
import { obtenerContenidoMateria } from '../../data/materiasContenido.js'

export default function IndiceAcademico() {
  const [cursoAbierto, setCursoAbierto] = useState(1)
  const [materiaActiva, setMateriaActiva] = useState(null)
  const { setContextoAgente } = useApp()

  useEffect(() => {
    setContextoAgente(
      materiaActiva
        ? `Carmen está viendo el temario/evaluación de "${materiaActiva.titulo}" (${materiaActiva.kbCode}) en la pantalla — ya no hace falta que se lo repitas. Tu papel aquí es de tutora: ayúdale con explicaciones más a fondo, ejemplos o un quiz sobre ese contenido si te lo pide.`
        : null
    )
    return () => setContextoAgente(null)
  }, [materiaActiva, setContextoAgente])

  if (materiaActiva) {
    const contenido = obtenerContenidoMateria(materiaActiva.kbCode)
    return (
      <div className="flex h-full flex-col gap-3">
        <button onClick={() => setMateriaActiva(null)} className="self-start text-sm text-lavanda-700">
          ← Volver al índice
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">{materiaActiva.kbCode}</p>
          <p className="text-lg font-semibold text-morado-900">{materiaActiva.titulo}</p>
          {contenido?.metaLinea && <p className="mt-1 text-xs text-morado-900/50">{contenido.metaLinea}</p>}
        </div>

        {!contenido ? (
          <p className="rounded-2xl bg-crema-100 p-4 text-sm text-morado-900/60">
            Todavía no hay guía docente cargada para esta materia.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {contenido.secciones.map((s) => (
              <div key={s.titulo} className="rounded-2xl bg-white p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">{s.titulo}</p>
                <p className="mt-1.5 text-sm text-morado-900/80">{s.cuerpo}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-lavanda-50 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg">🎓</span>
          <p className="text-xs text-morado-900/70">
            ¿Quieres que te lo explique más a fondo o te haga un quiz? Toca el botón de Maite arriba a la derecha.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-morado-900/60">
        Todas tus materias, curso por curso. Toca una para ver su temario y evaluación.
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
