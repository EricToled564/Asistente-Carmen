import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import TextoDeMaite from '../comun/TextoDeMaite.jsx'

export default function FotoCapture() {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [respuesta, setRespuesta] = useState(null)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setRespuesta(null)
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const result = await api.vision(formData)
      setRespuesta(result.texto || result.text || JSON.stringify(result))
    } catch (err) {
      setError('No pude leer la foto. Revisa tu conexión o intenta de nuevo. (' + err.message + ')')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      <button
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda-300 bg-lavanda-50 p-8 text-lavanda-800"
      >
        <span className="text-3xl">📷</span>
        <span className="font-medium">Tomar o subir foto</span>
        <span className="text-xs text-morado-900/50">Un letrero, un menú, un formulario, lo que sea</span>
      </button>

      {preview && (
        <img src={preview} alt="Foto seleccionada" className="max-h-64 w-full rounded-2xl object-cover shadow-soft" />
      )}

      {loading && <p className="text-center text-sm text-morado-900/60">Maite está viendo la foto…</p>}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {respuesta && (
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-lavanda-700">Maite dice</p>
          <TextoDeMaite texto={respuesta} className="text-sm text-morado-900/90" />
        </div>
      )}
    </div>
  )
}
