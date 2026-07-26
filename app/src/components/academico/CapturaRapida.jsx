import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { INDICE_ACADEMICO } from '../../data/indiceAcademico.js'

const MAX_MS = 2 * 60 * 1000

// Todas las materias del grado, para etiquetar la grabación. No se filtra por el semestre en
// curso: si repite una asignatura o se mete a una clase que no le toca, tiene que poder guardarla
// igual.
const MATERIAS = INDICE_ACADEMICO.flatMap((c) =>
  c.semestres.flatMap((s) => s.materias.map((m) => ({ ...m, curso: c.curso })))
)

// Captura rápida post-clase: graba, transcribe y estructura, y —esto es lo que la hace útil— la
// guarda. Antes el resultado se pintaba en pantalla y se perdía al cambiar de pestaña.
//
// Los apuntes se muestran editables antes de guardar, y con la transcripción cruda a la vista si
// la quiere: el texto sale de un reconocimiento de voz sobre una grabación de aula, con ruido y
// nombres propios que se transcriben mal. Guardar automáticamente lo que salga sería guardarle
// errores como si fueran sus apuntes.
export default function CapturaRapida({ onGuardado }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [procesando, setProcesando] = useState(false)
  const [borrador, setBorrador] = useState(null) // { apuntes, transcripcion }
  const [kbCode, setKbCode] = useState('')
  const [verTranscripcion, setVerTranscripcion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  async function iniciar() {
    setError(null)
    setBorrador(null)
    setGuardado(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        enviar(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setGrabando(true)
      setSegundos(0)
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          const next = s + 1
          if (next * 1000 >= MAX_MS) detener()
          return next
        })
      }, 1000)
    } catch {
      setError('No pude acceder al micrófono. Revisa los permisos de este sitio.')
    }
  }

  function detener() {
    clearInterval(timerRef.current)
    setGrabando(false)
    mediaRecorderRef.current?.stop()
  }

  async function enviar(blob) {
    setProcesando(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'captura.webm')
      const result = await api.audio(formData)
      setBorrador({
        apuntes: result.texto || result.text || '',
        transcripcion: result.transcripcion || ''
      })
    } catch (err) {
      setError('No pude procesar el audio. (' + err.message + ')')
    } finally {
      setProcesando(false)
    }
  }

  async function guardar() {
    const materia = MATERIAS.find((m) => m.kbCode === kbCode)
    if (!materia || !borrador?.apuntes.trim()) return
    setGuardando(true)
    setError(null)
    try {
      await api.apunteGuardar({
        kbCode: materia.kbCode,
        materia: materia.titulo,
        apuntes: borrador.apuntes,
        transcripcion: borrador.transcripcion
      })
      setGuardado(true)
      setBorrador(null)
      setKbCode('')
      setVerTranscripcion(false)
      onGuardado?.()
    } catch (err) {
      setError('No pude guardar los apuntes. (' + err.message + ')')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Captura rápida post-clase (máx. 2 min)</p>

      {!borrador && (
        <>
          {!grabando ? (
            <button
              onClick={iniciar}
              disabled={procesando}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-lavanda-700 text-2xl text-white shadow-soft disabled:opacity-50"
            >
              🎙️
            </button>
          ) : (
            <button
              onClick={detener}
              className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-soft"
            >
              ⏹️
            </button>
          )}
          {grabando && <p className="text-sm text-morado-900/60">{segundos}s / 120s</p>}
          {procesando && <p className="text-sm text-morado-900/60">Maite está estructurando tus apuntes…</p>}
          {guardado && (
            <p className="rounded-full bg-lavanda-50 px-3 py-1.5 text-xs font-semibold text-lavanda-800">
              ✓ Guardado en Mis apuntes
            </p>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {borrador && (
        <div className="flex w-full flex-col gap-3 text-left">
          <div className="rounded-2xl bg-crema-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">Revisa antes de guardar</p>
            <p className="mt-1 text-xs text-morado-900/60">
              Esto salió de una transcripción automática. Corrige lo que haya entendido mal —
              después estos apuntes son los que Maite usa para repasar contigo.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-morado-900">¿De qué materia?</span>
            <select
              value={kbCode}
              onChange={(e) => setKbCode(e.target.value)}
              className="rounded-xl border border-lavanda-200 bg-lavanda-50/50 px-3 py-2.5 text-morado-900"
            >
              <option value="">Selecciona una materia…</option>
              {MATERIAS.map((m) => (
                <option key={`${m.kbCode}-${m.titulo}`} value={m.kbCode}>
                  {m.titulo} ({m.curso}º)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-morado-900">Tus apuntes</span>
            <textarea
              value={borrador.apuntes}
              onChange={(e) => setBorrador((b) => ({ ...b, apuntes: e.target.value }))}
              rows={10}
              className="rounded-xl border border-lavanda-200 bg-white px-3 py-2.5 text-sm text-morado-900"
            />
          </label>

          {borrador.transcripcion && (
            <div className="rounded-2xl bg-lavanda-50/60 p-3">
              <button
                onClick={() => setVerTranscripcion((v) => !v)}
                className="text-xs font-semibold text-lavanda-800 underline decoration-dotted"
              >
                {verTranscripcion ? 'Ocultar' : 'Ver'} la transcripción completa
              </button>
              {verTranscripcion && (
                <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-morado-900/70">
                  {borrador.transcripcion}
                </p>
              )}
              <p className="mt-2 text-[11px] text-morado-900/45">
                La transcripción completa se guarda también, aunque no la edites: sirve cuando el resumen se
                dejó fuera un detalle.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setBorrador(null)
                setKbCode('')
                setVerTranscripcion(false)
              }}
              className="flex-1 rounded-full bg-lavanda-50 px-4 py-2.5 text-sm font-semibold text-lavanda-800"
            >
              Descartar
            </button>
            <button
              onClick={guardar}
              disabled={!kbCode || guardando || !borrador.apuntes.trim()}
              className="flex-[2] rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : 'Guardar apuntes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
