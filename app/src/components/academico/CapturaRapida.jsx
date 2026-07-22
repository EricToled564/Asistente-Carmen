import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'

const MAX_MS = 2 * 60 * 1000

export default function CapturaRapida() {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  async function iniciar() {
    setError(null)
    setResultado(null)
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
      setResultado(result.texto || result.text || JSON.stringify(result))
    } catch (err) {
      setError('No pude procesar el audio. (' + err.message + ')')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Captura rápida post-clase (máx. 2 min)</p>

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
      {error && <p className="text-sm text-red-700">{error}</p>}

      {resultado && (
        <div className="w-full rounded-xl bg-crema-100 p-3 text-left text-sm whitespace-pre-wrap">{resultado}</div>
      )}
    </div>
  )
}
