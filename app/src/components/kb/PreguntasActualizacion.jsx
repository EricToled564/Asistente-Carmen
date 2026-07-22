import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export default function PreguntasActualizacion() {
  const [preguntas, setPreguntas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [activaId, setActivaId] = useState(null)
  const [respuesta, setRespuesta] = useState('')
  const [estado, setEstado] = useState('idle') // idle | enviando | listo | aclaracion | error
  const [mensaje, setMensaje] = useState('')
  const [resueltas, setResueltas] = useState(new Set())

  useEffect(() => {
    api
      .kbAnswerCatalogo()
      .then((r) => setPreguntas(r.preguntas || []))
      .catch(() => setPreguntas([]))
      .finally(() => setCargando(false))
  }, [])

  function abrir(id) {
    setActivaId(id)
    setRespuesta('')
    setEstado('idle')
    setMensaje('')
  }

  async function enviar(e) {
    e.preventDefault()
    setEstado('enviando')
    try {
      const resultado = await api.kbAnswer({ preguntaId: activaId, respuesta })
      if (resultado.necesitaAclaracion) {
        setEstado('aclaracion')
        setMensaje(resultado.mensaje)
        return
      }
      setEstado('listo')
      setResueltas((prev) => new Set(prev).add(activaId))
    } catch (err) {
      setEstado('error')
      setMensaje('No se pudo guardar. Intenta de nuevo. (' + err.message + ')')
    }
  }

  if (cargando) return <p className="px-5 text-sm text-morado-900/50">Cargando…</p>

  const activa = preguntas.find((p) => p.id === activaId)

  if (activa) {
    return (
      <div className="flex flex-col gap-3 px-5">
        <button onClick={() => setActivaId(null)} className="self-start text-sm text-lavanda-700">
          ← Volver
        </button>
        <p className="text-base font-semibold text-morado-900">{activa.pregunta}</p>

        {estado === 'listo' ? (
          <p className="rounded-xl bg-melocoton-300 p-3 text-sm font-semibold text-morado-900">
            Listo, ya actualicé lo que sabe Maite ✅
          </p>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-2">
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={3}
              autoFocus
              className="rounded-xl border border-lavanda-100 p-3 text-sm"
              placeholder="Escribe tu respuesta…"
            />
            <button
              type="submit"
              disabled={estado === 'enviando' || !respuesta.trim()}
              className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Enviar'}
            </button>
            {estado === 'aclaracion' && (
              <p className="rounded-xl bg-lavanda-50 p-3 text-sm text-lavanda-800">{mensaje}</p>
            )}
            {estado === 'error' && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-5">
      <p className="text-sm text-morado-900/60">
        Respuestas cortas para mantener a Maite al día — sin necesidad de esperar el recordatorio.
      </p>
      {preguntas.map((p) => (
        <button
          key={p.id}
          onClick={() => abrir(p.id)}
          className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-sm shadow-soft"
        >
          <span>{p.pregunta}</span>
          {resueltas.has(p.id) && <span className="text-lavanda-700">✓</span>}
        </button>
      ))}
    </div>
  )
}
