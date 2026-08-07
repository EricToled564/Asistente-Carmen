import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { obtenerBloqueActual, bloqueSabido, materiasDelBloque } from '../../lib/semestreActual.js'
import BotonMaite from '../agente/BotonMaite.jsx'

// Modo estudio: antes esto era un botón único y genérico ("empieza a estudiar con Maite") sin
// decir de qué materia. El problema no era solo de forma: la tool consultar_apuntes, sin que se le
// diga una materia, devuelve los apuntes MÁS RECIENTES de cualquier clase — si Carmen grabó
// Antropología ayer y hoy quiere repasar Design Studio, Maite podía partir de la clase equivocada
// sin que nadie lo notara. Eligiendo materia primero, el contexto que arranca la conversación lleva
// el kbCode y Maite ya sabe con qué filtrar.
//
// La bibliografía (el libro de la materia, si el profesor lo mencionó) es la otra mitad de esto:
// un campo de texto simple —no un PDF subido— porque lo único que hace falta es que Maite sepa QUÉ
// libro es para poder referirse a él por nombre; no necesita "leerlo".
export default function ModoEstudio({ onNavigate }) {
  const [materias, setMaterias] = useState(() => materiasDelBloque(bloqueSabido()))
  useEffect(() => {
    obtenerBloqueActual().then((b) => setMaterias(materiasDelBloque(b)))
  }, [])

  const [kbCode, setKbCode] = useState('')
  const [bib, setBib] = useState(null) // { libro, autor } o null si no hay
  const [cargandoBib, setCargandoBib] = useState(false)
  const [editando, setEditando] = useState(false)
  const [libroForm, setLibroForm] = useState('')
  const [autorForm, setAutorForm] = useState('')
  const [guardando, setGuardando] = useState(false)

  const materia = materias.find((m) => m.kbCode === kbCode)

  useEffect(() => {
    if (!kbCode) {
      setBib(null)
      return
    }
    let vivo = true
    setCargandoBib(true)
    setEditando(false)
    api
      .bibliografiaDe(kbCode)
      .then((d) => {
        if (!vivo) return
        setBib(d.entrada || null)
        setLibroForm(d.entrada?.libro || '')
        setAutorForm(d.entrada?.autor || '')
      })
      .catch(() => vivo && setBib(null))
      .finally(() => vivo && setCargandoBib(false))
    return () => {
      vivo = false
    }
  }, [kbCode])

  async function guardarLibro(e) {
    e.preventDefault()
    if (!libroForm.trim() || !materia) return
    setGuardando(true)
    try {
      const d = await api.bibliografiaGuardar({ kbCode, materia: materia.titulo, libro: libroForm, autor: autorForm })
      setBib(d.entrada)
      setEditando(false)
    } catch {
      /* se queda en el formulario para reintentar */
    }
    setGuardando(false)
  }

  async function borrarLibro() {
    if (!kbCode) return
    await api.bibliografiaBorrar(kbCode).catch(() => {})
    setBib(null)
    setLibroForm('')
    setAutorForm('')
  }

  // El contexto que arranca la conversación: qué materia, y si hay libro, cuál — para que Maite no
  // tenga que preguntarlo ni adivinarlo llamando a las tools a ciegas.
  const contexto = materia
    ? `modo estudio de "${materia.titulo}" (código ${materia.kbCode}): ayuda con quiz y explicación de esta materia. Antes de armar un quiz o explicar un tema, usa consultar_apuntes con materia="${materia.kbCode}" para ver si Carmen grabó esa clase — si tiene apuntes propios, el quiz sale de ahí (lo que dijo su profesor) y el temario oficial del KB solo complementa.${
        bib
          ? ` El libro de esta materia es "${bib.libro}"${bib.autor ? `, de ${bib.autor}` : ''} — puedes referirte a él por nombre y explicar en ese marco, pero no inventes contenido del libro que no tienes.`
          : ''
      }`
    : 'modo estudio: ayuda con quiz y explicación de las materias del Grado en Diseño. Pregúntale primero de qué materia, porque no eligió ninguna en la pantalla.'

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-soft">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">🎓</span>
      <p className="font-display text-lg font-bold text-morado-900">Modo estudio</p>

      <div className="w-full text-left">
        <label className="text-xs font-semibold uppercase tracking-wide text-morado-900/50">
          ¿De qué materia?
        </label>
        <select
          value={kbCode}
          onChange={(e) => setKbCode(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-lavanda-200 bg-white px-3 py-2.5 text-sm text-morado-900"
        >
          <option value="">Elige una materia…</option>
          {materias.map((m) => (
            <option key={m.kbCode} value={m.kbCode}>
              {m.titulo}
            </option>
          ))}
        </select>
      </div>

      {kbCode && !cargandoBib && (
        <div className="w-full rounded-2xl bg-lavanda-50 p-3.5 text-left">
          {bib && !editando ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">Libro de esta materia</p>
                <p className="mt-1 text-sm text-morado-900">
                  {bib.libro}
                  {bib.autor ? <span className="text-morado-900/60"> — {bib.autor}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1 text-xs">
                <button onClick={() => setEditando(true)} className="font-semibold text-lavanda-700">
                  Editar
                </button>
                <button onClick={borrarLibro} className="font-semibold text-red-700">
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={guardarLibro} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">
                {bib ? 'Editar libro' : '¿Tiene un libro esta materia?'}
              </p>
              <p className="text-[11px] leading-relaxed text-morado-900/55">
                Si el profesor mencionó un libro de texto o de lectura, apúntalo aquí — así Maite sabe
                cuál es cuando te ayude a repasar. Opcional.
              </p>
              <input
                value={libroForm}
                onChange={(e) => setLibroForm(e.target.value)}
                placeholder="Título del libro"
                className="rounded-lg border border-lavanda-200 px-3 py-2 text-sm"
              />
              <input
                value={autorForm}
                onChange={(e) => setAutorForm(e.target.value)}
                placeholder="Autor (opcional)"
                className="rounded-lg border border-lavanda-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={guardando || !libroForm.trim()}
                  className="rounded-lg bg-lavanda-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                {bib && (
                  <button type="button" onClick={() => setEditando(false)} className="text-xs font-semibold text-morado-900/50">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      <p className="text-sm text-morado-900/60">
        Pídele un quiz o que te explique algo. Si grabaste esa clase, sale de{' '}
        <span className="font-semibold">tus apuntes</span> — de lo que dijo tu profesor, no de un
        temario genérico.
      </p>

      <BotonMaite contexto={contexto} onNavigate={onNavigate} className="mt-1 w-full">
        🎓 Empezar a estudiar con Maite
      </BotonMaite>
    </div>
  )
}
