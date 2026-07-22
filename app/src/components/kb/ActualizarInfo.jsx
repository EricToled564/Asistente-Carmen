import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'

const TIPOS = [
  { value: 'horario', label: 'Horario' },
  { value: 'tramite', label: 'Trámite' },
  { value: 'otro', label: 'Otro' }
]

export default function ActualizarInfo() {
  const fileRef = useRef(null)
  const [tipo, setTipo] = useState('horario')
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('idle') // idle | procesando | preview | confirmando | listo | error | aclaracion
  const [preview, setPreview] = useState('')
  const [uploadId, setUploadId] = useState(null)
  const [mensaje, setMensaje] = useState('')

  async function procesar(e) {
    e.preventDefault()
    setEstado('procesando')
    setMensaje('')
    try {
      const formData = new FormData()
      formData.append('tipo', tipo)
      if (fileRef.current?.files?.[0]) formData.append('imagen', fileRef.current.files[0])
      if (texto.trim()) formData.append('texto', texto.trim())

      const result = await api.kbUpload(formData)

      if (result.necesitaAclaracion) {
        setEstado('aclaracion')
        setMensaje(result.mensaje || 'No reconozco esto como información estructurable. ¿Me lo describes con más detalle?')
        return
      }

      setPreview(result.markdown || '')
      setUploadId(result.uploadId)
      setEstado('preview')
    } catch (err) {
      setEstado('error')
      setMensaje('No pude procesar tu subida. Intenta de nuevo. (' + err.message + ')')
    }
  }

  async function confirmar() {
    setEstado('confirmando')
    try {
      await api.kbConfirm({ uploadId, markdown: preview, tipo })
      setEstado('listo')
      setMensaje('Listo, ya actualicé lo que sabe tu agente ✅')
    } catch (err) {
      setEstado('error')
      setMensaje('No pude confirmar la actualización. Reintenta. (' + err.message + ')')
    }
  }

  function reiniciar() {
    setEstado('idle')
    setPreview('')
    setTexto('')
    setUploadId(null)
    setMensaje('')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (estado === 'preview') {
    return (
      <div className="flex flex-col gap-3 p-5">
        <p className="text-sm font-semibold text-lavanda-800">Revisa antes de confirmar</p>
        <textarea
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-lavanda-100 p-3 font-mono text-xs"
        />
        <div className="flex gap-2">
          <button onClick={reiniciar} className="flex-1 rounded-xl bg-morado-900/10 py-2.5 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={confirmar} className="flex-1 rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white">
            Confirmar
          </button>
        </div>
      </div>
    )
  }

  if (estado === 'listo') {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-sm font-medium text-morado-900/80">{mensaje}</p>
        <button onClick={reiniciar} className="rounded-full bg-lavanda-700 px-6 py-2.5 text-sm font-semibold text-white">
          Subir otra cosa
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={procesar} className="flex flex-col gap-3 p-5">
      <p className="text-sm text-morado-900/60">
        Sube una foto/screenshot o pega texto — Maite lo formatea y actualiza lo que sabe tu agente. Nunca se
        actualiza sin que lo revises primero.
      </p>

      <div className="flex gap-2">
        {TIPOS.map((t) => (
          <button
            type="button"
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              tipo === t.value ? 'bg-lavanda-700 text-white' : 'bg-lavanda-50 text-lavanda-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="rounded-xl border border-dashed border-lavanda-200 bg-crema-100 text-sm text-morado-900/60 file:mr-3 file:rounded-full file:border-0 file:bg-lavanda-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
      />

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="…o pega el texto aquí"
        rows={5}
        className="w-full rounded-xl border border-lavanda-100 p-3 text-sm"
      />

      <button
        type="submit"
        disabled={estado === 'procesando'}
        className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {estado === 'procesando' ? 'Procesando…' : 'Procesar'}
      </button>

      {estado === 'aclaracion' && (
        <p className="rounded-xl bg-lavanda-50 p-3 text-sm text-lavanda-800">{mensaje}</p>
      )}
      {estado === 'error' && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
    </form>
  )
}
