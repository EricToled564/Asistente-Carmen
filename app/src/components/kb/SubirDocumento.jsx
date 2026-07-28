import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

// Subir un archivo completo al Knowledge Base de Maite: una guía docente en PDF, el reglamento de
// la residencia, unos apuntes en Word.
//
// Es distinto de "Cambió algo — cuéntaselo": ahí se le hace una foto a algo y el contenido se
// fusiona dentro de un documento temático que ya existe. Aquí el archivo ES el documento, y lo
// procesa ElevenLabs directamente.
//
// Se enseña siempre el peso total, y no por adorno: el agente tiene RAG desactivado, así que todo
// lo que hay en el KB entra en el contexto de cada conversación. Sin ese número a la vista, subir
// veinte PDFs parece gratis, y el síntoma llega mucho después y disfrazado de "Maite va lenta".

const EXTENSIONES = '.pdf,.txt,.md,.html,.htm,.docx,.epub'

function pesoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fechaCorta(iso) {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(iso))
  } catch {
    return ''
  }
}

export default function SubirDocumento() {
  const fileRef = useRef(null)
  const [lista, setLista] = useState(null)
  const [bytesTotales, setBytesTotales] = useState(0)
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('idle') // idle | subiendo | listo | error
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(() => {
    api
      .kbArchivos()
      // `|| []` a propósito: dejar `lista` en null ante una respuesta rara mantendría la pantalla
      // en "Cargando…" para siempre. Una lista vacía al menos dice la verdad.
      .then((d) => {
        setLista(d.archivos || [])
        setBytesTotales(d.bytesTotales || 0)
      })
      .catch(() => setLista([]))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function subir(e) {
    e.preventDefault()
    const archivo = fileRef.current?.files?.[0]
    if (!archivo) {
      setEstado('error')
      setMensaje('Elige un archivo primero.')
      return
    }
    setEstado('subiendo')
    setMensaje('')
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      if (nombre.trim()) formData.append('nombre', nombre.trim())
      const r = await api.kbArchivoSubir(formData)
      setEstado('listo')
      setMensaje(
        r.reemplazo
          ? 'Actualizado. Sustituyó a la versión anterior con ese mismo nombre, así que Maite no se queda con las dos.'
          : 'Subido. Maite ya lo puede leer ✅'
      )
      setNombre('')
      if (fileRef.current) fileRef.current.value = ''
      cargar()
    } catch (err) {
      setEstado('error')
      // El Worker manda mensajes pensados para leerse (PDF escaneado, tipo no admitido, demasiado
      // grande). Se enseñan tal cual en vez de un "algo salió mal" que no dice qué hacer.
      const texto = String(err.message || '')
      const json = texto.match(/\{.*\}/)
      let detalle = ''
      try {
        detalle = json ? JSON.parse(json[0]).error : ''
      } catch {
        detalle = ''
      }
      setMensaje(detalle || 'No se pudo subir el archivo. Inténtalo de nuevo.')
    }
  }

  async function borrar(a) {
    if (!window.confirm(`¿Quitar "${a.nombre}" de lo que sabe Maite?`)) return
    try {
      await api.kbArchivoBorrar(a.documentId)
      cargar()
    } catch {
      setEstado('error')
      setMensaje('No se pudo quitar ese documento.')
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Súbele un documento</h2>
      <p className="text-xs leading-relaxed text-morado-900/55">
        Una guía docente, un reglamento, unos apuntes. PDF, Word, texto o web. Maite lo lee entero y
        se lo queda.
      </p>

      <form onSubmit={subir} className="flex flex-col gap-2 rounded-2xl bg-white p-3.5 shadow-soft">
        <input
          ref={fileRef}
          type="file"
          accept={EXTENSIONES}
          onChange={(e) => {
            // Se propone el nombre del archivo sin la extensión: es lo que Maite dirá al citarlo, y
            // "guia-docente-2026.pdf" se lee peor que "Guía docente".
            const f = e.target.files?.[0]
            if (f && !nombre) setNombre(f.name.replace(/\.[^.]+$/, ''))
          }}
          className="rounded-xl border border-dashed border-lavanda-200 bg-crema-100 p-2 text-sm text-morado-900/60 file:mr-3 file:rounded-full file:border-0 file:bg-lavanda-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Cómo se llama (ej. Guía docente de Antropología)"
          className="rounded-xl border border-lavanda-100 p-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={estado === 'subiendo'}
          className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {estado === 'subiendo' ? 'Subiendo y procesando…' : 'Subir a Maite'}
        </button>
        {estado === 'listo' && (
          <p className="rounded-xl bg-lavanda-50 p-2.5 text-xs text-lavanda-800">{mensaje}</p>
        )}
        {estado === 'error' && <p className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700">{mensaje}</p>}
        <p className="text-[11px] leading-relaxed text-morado-900/45">
          Si subes uno con el mismo nombre, reemplaza al anterior — así Maite nunca tiene dos
          versiones de lo mismo.
        </p>
      </form>

      {lista === null ? (
        <p className="text-xs text-morado-900/50">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-xs text-morado-900/45">Todavía no le has subido ningún documento.</p>
      ) : (
        <>
          <p className="text-[11px] text-morado-900/45">
            {lista.length} {lista.length === 1 ? 'documento' : 'documentos'} · {pesoLegible(bytesTotales)}.
            Cuantos más tenga, más tarda en arrancar cada conversación.
          </p>
          {lista.map((a) => (
            <div key={a.documentId} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
              <span className="text-lg leading-none">📄</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-morado-900">{a.nombre}</p>
                <p className="text-[11px] text-morado-900/45">
                  {pesoLegible(a.bytes)} · {fechaCorta(a.subidoEn)}
                </p>
              </div>
              <button onClick={() => borrar(a)} className="shrink-0 text-xs font-semibold text-red-700">
                Quitar
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
