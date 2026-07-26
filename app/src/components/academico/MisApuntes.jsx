import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function fechaLegible(iso) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid'
  }).format(new Date(iso))
}

// "Mis apuntes": lo que grabó en clase, agrupado por materia. Existe por dos razones distintas —
// para que ella los relea, y para que sean el material del que Maite saca los quizzes (server
// tool `consultar_apuntes`).
export default function MisApuntes({ recargarToken }) {
  const [lista, setLista] = useState(null)
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(null) // apunte completo, ya con transcripción
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [verTranscripcion, setVerTranscripcion] = useState(false)

  const cargar = useCallback(() => {
    api
      .apuntesListar()
      .then((d) => setLista(d.apuntes))
      .catch(() => setError('No pude cargar tus apuntes.'))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar, recargarToken])

  async function abrir(id) {
    setCargandoDetalle(true)
    setVerTranscripcion(false)
    try {
      const { apunte } = await api.apunteObtener(id)
      setAbierto(apunte)
    } catch {
      setError('No pude abrir ese apunte.')
    } finally {
      setCargandoDetalle(false)
    }
  }

  async function borrar(id) {
    // Sin diálogo de confirmación no: es la única copia de una clase que ya pasó y no se puede
    // volver a grabar.
    if (!window.confirm('¿Borrar estos apuntes? No se pueden recuperar.')) return
    try {
      await api.apunteBorrar(id)
      setAbierto(null)
      cargar()
    } catch {
      setError('No pude borrar ese apunte.')
    }
  }

  if (abierto) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setAbierto(null)} className="self-start text-sm text-lavanda-700">
          ← Todos mis apuntes
        </button>

        <div className="rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-5 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-100">{abierto.materia}</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{abierto.titulo}</p>
          <p className="mt-1 text-xs text-lavanda-50/80">{fechaLegible(abierto.creadoEn)}</p>
        </div>

        <div className="whitespace-pre-wrap rounded-3xl bg-white p-4 text-sm text-morado-900 shadow-soft">
          {abierto.apuntes}
        </div>

        {abierto.transcripcion && (
          <div className="rounded-3xl bg-crema-100 p-4">
            <button
              onClick={() => setVerTranscripcion((v) => !v)}
              className="text-sm font-semibold text-lavanda-800 underline decoration-dotted"
            >
              {verTranscripcion ? 'Ocultar' : 'Ver'} la transcripción completa
            </button>
            {verTranscripcion && (
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-morado-900/70">
                {abierto.transcripcion}
              </p>
            )}
          </div>
        )}

        <div className="rounded-3xl bg-lavanda-50 p-4">
          <p className="text-sm font-semibold text-morado-900">¿Quieres repasar esto con Maite?</p>
          <p className="mt-1 text-xs text-morado-900/60">
            Toca el botón de Maite y pídele un quiz de esta clase — busca en tus apuntes, no solo en el temario
            oficial.
          </p>
        </div>

        <button onClick={() => borrar(abierto.id)} className="self-start text-sm text-red-700">
          Borrar estos apuntes
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-700">{error}</p>}
      {cargandoDetalle && <p className="text-sm text-morado-900/50">Abriendo…</p>}

      {!lista ? (
        <p className="text-sm text-morado-900/50">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl mx-auto">
            🎙️
          </span>
          <p className="mt-3 font-display text-lg font-bold text-morado-900">Todavía no tienes apuntes</p>
          <p className="mt-1 text-sm text-morado-900/60">
            Graba unos minutos al salir de clase en la pestaña Captura. Se transcriben, se ordenan y quedan
            aquí — y Maite los usa para hacerte quizzes de tu clase, no de un temario genérico.
          </p>
        </div>
      ) : (
        lista.map((a) => (
          <button
            key={a.id}
            onClick={() => abrir(a.id)}
            className="rounded-2xl bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">{a.materia}</p>
            <p className="mt-1 text-sm font-medium text-morado-900">{a.titulo}</p>
            <p className="mt-1 text-xs text-morado-900/50">{fechaLegible(a.creadoEn)}</p>
          </button>
        ))
      )}
    </div>
  )
}
