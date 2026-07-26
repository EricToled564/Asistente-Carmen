import { useRef, useState } from 'react'

// Componente ÚNICO de subida para toda la app. Cualquier módulo que necesite que Carmen aporte
// un dato (horario, trámite, una nota, lo que venga después) usa este mismo componente — mismo
// look y mismo flujo en todos lados, en vez de una pantalla distinta por caso.
//
// Las dos rutas de entrada son siempre las mismas:
//   1. Foto (cámara o galería) → se manda al backend, que la interpreta con visión
//   2. A mano → ella escribe el dato directo, sin foto
// y ambas convergen SIEMPRE en el mismo paso: vista previa editable antes de confirmar. Nada se
// guarda sin que ella lo revise, venga de donde venga.
//
// Props:
//   titulo, descripcion — texto de encabezado según el módulo
//   camposManual        — qué formulario mostrar en la pestaña "A mano" (render prop)
//   onProcesar(payload) — manda lo capturado al backend; devuelve { preview } o { necesitaAclaracion, mensaje }
//   onConfirmar(preview)— guarda lo que quedó en la vista previa
//   renderPreview       — cómo se edita la vista previa (por defecto, un textarea)
export default function SubidaDocumento({
  titulo,
  descripcion,
  camposManual,
  onProcesar,
  onConfirmar,
  renderPreview,
  textoExito = 'Listo, ya quedó guardado ✅'
}) {
  const fileRef = useRef(null)
  const [modo, setModo] = useState('foto') // foto | manual
  const [estado, setEstado] = useState('idle') // idle | procesando | preview | confirmando | listo | error | aclaracion
  const [preview, setPreview] = useState(null)
  const [mensaje, setMensaje] = useState('')

  async function procesar(e) {
    e.preventDefault()
    setEstado('procesando')
    setMensaje('')
    try {
      const resultado = await onProcesar({
        modo,
        archivo: modo === 'foto' ? fileRef.current?.files?.[0] || null : null
      })
      if (resultado?.necesitaAclaracion) {
        setEstado('aclaracion')
        setMensaje(resultado.mensaje || 'No reconozco esto. ¿Me lo describes con más detalle?')
        return
      }
      setPreview(resultado.preview)
      setEstado('preview')
    } catch (err) {
      setEstado('error')
      setMensaje('No pude procesar la subida. Intenta de nuevo. (' + err.message + ')')
    }
  }

  async function confirmar() {
    setEstado('confirmando')
    try {
      await onConfirmar(preview)
      setEstado('listo')
      setMensaje(textoExito)
    } catch (err) {
      setEstado('error')
      setMensaje('No pude confirmar. Reintenta. (' + err.message + ')')
    }
  }

  function reiniciar() {
    setEstado('idle')
    setPreview(null)
    setMensaje('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // Paso común a ambas rutas: revisar y corregir antes de guardar
  if (estado === 'preview' || estado === 'confirmando') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-lavanda-800">Revisa antes de confirmar</p>
        <p className="text-xs text-morado-900/55">
          Corrige lo que haga falta — nada se guarda hasta que confirmes.
        </p>
        {renderPreview ? (
          renderPreview(preview, setPreview)
        ) : (
          <textarea
            value={preview || ''}
            onChange={(e) => setPreview(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-lavanda-100 p-3 font-mono text-xs"
          />
        )}
        <div className="flex gap-2">
          <button onClick={reiniciar} className="flex-1 rounded-xl bg-morado-900/10 py-2.5 text-sm font-semibold">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={estado === 'confirmando'}
            className="flex-1 rounded-xl bg-gradient-to-r from-lavanda-700 to-lavanda-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {estado === 'confirmando' ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  if (estado === 'listo') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-sm font-medium text-morado-900/80">{mensaje}</p>
        <button onClick={reiniciar} className="rounded-full bg-lavanda-700 px-6 py-2.5 text-sm font-semibold text-white">
          Subir otra cosa
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={procesar} className="flex flex-col gap-3">
      {titulo && <p className="font-display text-lg font-bold text-morado-900">{titulo}</p>}
      {descripcion && <p className="text-sm text-morado-900/60">{descripcion}</p>}

      <div className="flex gap-2 rounded-2xl bg-lavanda-50 p-1">
        {[
          { id: 'foto', label: '📷 Foto' },
          { id: 'manual', label: '✍️ A mano' }
        ].map((op) => (
          <button
            type="button"
            key={op.id}
            onClick={() => setModo(op.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              modo === op.id ? 'bg-white text-lavanda-800 shadow-soft' : 'text-morado-900/50'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {modo === 'foto' ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="rounded-xl border border-dashed border-lavanda-200 bg-crema-100 p-2 text-sm text-morado-900/60 file:mr-3 file:rounded-full file:border-0 file:bg-lavanda-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      ) : (
        camposManual
      )}

      <button
        type="submit"
        disabled={estado === 'procesando'}
        className="rounded-xl bg-gradient-to-r from-lavanda-700 to-lavanda-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {estado === 'procesando' ? 'Procesando…' : 'Continuar'}
      </button>

      {estado === 'aclaracion' && <p className="rounded-xl bg-lavanda-50 p-3 text-sm text-lavanda-800">{mensaje}</p>}
      {estado === 'error' && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
    </form>
  )
}
