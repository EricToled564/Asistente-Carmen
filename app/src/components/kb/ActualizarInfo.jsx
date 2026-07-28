import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../context/AppContext.jsx'
import SubirDocumento from './SubirDocumento.jsx'

// "Actualizar mi info" era un formulario genérico de foto/texto con tres botones. Dos problemas:
//
// 1. No decía QUÉ se puede actualizar. Carmen abría la sección y veía un campo vacío; no hay forma
//    de adivinar desde ahí que también puede cambiar su dirección, su tarjeta de transporte o lo
//    que Maite sabe de su residencia.
// 2. El selector ofrecía 3 categorías (horario/trámite/otro) cuando el Worker acepta 8. Todo lo
//    demás caía en "otro" → KB7 ("cultura y vida diaria"). Un contrato de alquiler nuevo acababa
//    escrito en el documento equivocado y Maite no lo encontraba al buscar por el tema correcto.
//
// Ahora es un índice de TODO lo que es susceptible de cambiar, con el estado real de cada cosa
// (leído del Worker, no supuesto), y desde cada ficha se llega a donde se cambia.

// Las 8 categorías reales que acepta POST /kb-confirm (ver worker/src/routes/kbUpload.ts →
// TIPO_A_KB_CODE). El `ejemplo` no es decorativo: es lo que hace que Carmen sepa cuál elegir sin
// tener ni idea de qué es un "KB5".
const CATEGORIAS = [
  {
    value: 'horario',
    icono: '🗓️',
    label: 'Horario de clases',
    ejemplo: 'El horario del semestre nuevo, un aula que cambió, una asignatura que te movieron.'
  },
  {
    value: 'alojamiento',
    icono: '🏠',
    label: 'Dónde vives',
    ejemplo: 'Te mudas, cambia tu habitación, el contrato, las normas o los horarios de la residencia.'
  },
  {
    value: 'campus',
    icono: '🎓',
    label: 'Campus y edificios',
    ejemplo: 'Horarios de la biblioteca, un servicio nuevo, dónde está algo que te costó encontrar.'
  },
  {
    value: 'transporte',
    icono: '🚌',
    label: 'Transporte',
    ejemplo: 'Tu tarjeta de villavesa, una línea que cambió, precios, cómo ir al aeropuerto.'
  },
  {
    value: 'tramite',
    icono: '📋',
    label: 'Trámites',
    ejemplo: 'TIE, empadronamiento, banco, tarjeta sanitaria, seguro, NIE. Cita, papel o resguardo.'
  },
  {
    value: 'ocio',
    icono: '🎉',
    label: 'Ocio y planes',
    ejemplo: 'Sitios que descubriste, tu gimnasio, un club de la uni, dónde quedas con tus amigas.'
  },
  {
    value: 'seguridad',
    icono: '🛟',
    label: 'Seguridad y apoyo',
    ejemplo: 'Tu médico, un teléfono útil, el servicio de apoyo psicológico de la uni.'
  },
  {
    value: 'otro',
    icono: '📎',
    label: 'Otra cosa',
    ejemplo: 'Lo que no encaje arriba. Si dudas, elige esto: Maite te dice si necesita más contexto.'
  }
]

function fechaCorta(iso) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(iso)
    )
  } catch {
    return null
  }
}

export default function ActualizarInfo({ onIrASeccion, onNavigate }) {
  const { ciudadReferencia, modoViaje, ciudadViaje, permissions } = useApp()
  const [categoria, setCategoria] = useState(null) // null = índice; objeto = formulario de subida
  // Estado real de lo que ya sabe Maite. Se pide al Worker en vez de asumirlo: la pantalla existe
  // precisamente para responder "¿qué tiene guardado de mí?", y contestar eso de memoria sería
  // exactamente el fallo que hace inútil una sección de ajustes.
  const [estadoDatos, setEstadoDatos] = useState({ cargando: true, horario: null, emergencia: null, preguntas: null })

  useEffect(() => {
    let vivo = true
    Promise.allSettled([api.horarioObtener(), api.emergenciaObtener(), api.kbAnswerCatalogo()]).then(
      ([h, e, p]) => {
        if (!vivo) return
        setEstadoDatos({
          cargando: false,
          horario: h.status === 'fulfilled' ? h.value?.datos ?? null : null,
          emergencia: e.status === 'fulfilled' ? e.value ?? null : null,
          preguntas: p.status === 'fulfilled' ? p.value?.preguntas ?? null : null
        })
      }
    )
    return () => {
      vivo = false
    }
  }, [])

  if (categoria) {
    return <FormularioSubida categoria={categoria} onVolver={() => setCategoria(null)} />
  }

  const { cargando, horario, emergencia, preguntas } = estadoDatos

  return (
    <div className="flex flex-col gap-5 px-5 pb-4">
      <p className="text-sm text-morado-900/60">
        Todo lo que Maite sabe de ti y puedes cambiar. Nada se actualiza sin que lo revises antes.
      </p>

      {/* --- Lo que ya está guardado, con su estado de verdad --- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Lo que Maite sabe de ti</h2>

        <Ficha
          icono="🗓️"
          titulo="Tu horario de clases"
          estado={
            cargando
              ? 'Consultando…'
              : horario
                ? `${horario.clases?.length || 0} clases${horario.grupo ? ` · grupo ${horario.grupo}` : ''}${
                    fechaCorta(horario.actualizadoEn) ? ` · lo subiste el ${fechaCorta(horario.actualizadoEn)}` : ''
                  }`
                : 'Maite usa el horario del primer semestre que ya venía cargado.'
          }
          accion="Subir un horario nuevo"
          onAccion={() => setCategoria(CATEGORIAS[0])}
          secundaria={onNavigate ? { texto: 'Ver el horario', al: () => onNavigate('academico') } : null}
        />

        <Ficha
          icono="🩸"
          titulo="Tus datos de emergencia"
          estado={
            cargando
              ? 'Consultando…'
              : emergencia?.nombreLegal
                ? // El Worker guarda literalmente 'no proporcionado' cuando no se indicó, y
                  // "sangre no proporcionado" se lee fatal en una ficha.
                  `${emergencia.nombreLegal} · sangre ${
                    !emergencia.tipoSangre || emergencia.tipoSangre === 'no proporcionado'
                      ? 'sin indicar'
                      : emergencia.tipoSangre
                  }`
                : 'Sin rellenar. Es lo que se enseña si alguna vez pasa algo.'
          }
          nota="Esto nunca se le manda al agente ni sale del SOS."
          accion={emergencia?.nombreLegal ? 'Cambiar mis datos' : 'Rellenarlos ahora'}
          onAccion={() => onIrASeccion?.('emergencia')}
        />

        <Ficha
          icono="🗨️"
          titulo="Preguntas que te hace Maite"
          estado={
            cargando
              ? 'Consultando…'
              : preguntas?.length
                ? `${preguntas.length} preguntas cortas: residencia, mención, grupo de Antropología…`
                : 'Ahora mismo no hay ninguna pendiente.'
          }
          accion="Responderlas"
          onAccion={() => onIrASeccion?.('preguntas')}
        />

        <Ficha
          icono="🕐"
          titulo="Tu ciudad de referencia"
          estado={
            modoViaje
              ? `Modo viaje activo: estás en ${ciudadViaje?.nombre || 'otra ciudad'}. Esa es la hora que usa Maite.`
              : `Reloj secundario en ${ciudadReferencia?.nombre || 'Ciudad de México'}. Pamplona siempre manda para las clases.`
          }
          accion="Cambiarla en Inicio"
          onAccion={() => onNavigate?.('inicio')}
        />

        <Ficha
          icono="🔔"
          titulo="Avisos en tu móvil"
          estado={
            permissions.notifications === 'granted'
              ? 'Permiso concedido en este dispositivo.'
              : permissions.notifications === 'denied'
                ? 'Bloqueados. Hay que desbloquearlos desde los ajustes del navegador.'
                : 'Todavía sin activar en este dispositivo.'
          }
          accion="Ir a notificaciones"
          onAccion={() => onIrASeccion?.('notificaciones')}
        />
      </section>

      {/* --- Subir algo nuevo, con las 8 categorías reales --- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Cambió algo — cuéntaselo</h2>
        <p className="text-xs text-morado-900/50">
          Elige de qué es. Luego le haces una foto o pegas el texto, y ella lo ordena y te lo enseña antes de
          guardarlo.
        </p>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoria(cat)}
            className="flex items-start gap-3 rounded-2xl bg-white p-3.5 text-left shadow-soft transition active:scale-[0.99]"
          >
            <span className="text-xl leading-none">{cat.icono}</span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-morado-900">{cat.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-morado-900/55">{cat.ejemplo}</span>
            </span>
            <span className="text-lavanda-400">›</span>
          </button>
        ))}
      </section>

      {/* --- Subir un archivo entero (PDF, Word…) --- */}
      <SubirDocumento />

      {/* --- Lo que no hay que actualizar a mano --- */}
      <section className="rounded-2xl bg-lavanda-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Esto se guarda solo</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-morado-900/65">
          <li>
            <span className="font-semibold text-morado-900">Tus apuntes de clase.</span> Lo que grabas en
            Académico → Captura. El resumen se le añade solo a Maite, agrupado por asignatura, y la
            clase entera queda guardada para los quizzes.
          </li>
          <li>
            <span className="font-semibold text-morado-900">Tus calificaciones.</span> Las que metes en Mis
            calificaciones, apartado por apartado, o la foto de tu boletín.
          </li>
          <li>
            <span className="font-semibold text-morado-900">Lo que le cuentas hablando.</span> Maite se acuerda
            de las cosas importantes que le dices sin que tengas que apuntarlas aquí.
          </li>
        </ul>
        {onNavigate && (
          <button
            onClick={() => onNavigate('academico')}
            className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-lavanda-800 shadow-soft"
          >
            Ver mis apuntes
          </button>
        )}
      </section>
    </div>
  )
}

function Ficha({ icono, titulo, estado, nota, accion, onAccion, secundaria }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{icono}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-morado-900">{titulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-morado-900/55">{estado}</p>
          {nota && <p className="mt-1 text-[11px] leading-relaxed text-lavanda-700">{nota}</p>}
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={onAccion}
          className="rounded-full bg-lavanda-700 px-3.5 py-1.5 text-xs font-semibold text-white"
        >
          {accion}
        </button>
        {secundaria && (
          <button
            onClick={secundaria.al}
            className="rounded-full bg-lavanda-50 px-3.5 py-1.5 text-xs font-semibold text-lavanda-800"
          >
            {secundaria.texto}
          </button>
        )}
      </div>
    </div>
  )
}

// El flujo de subida de siempre (foto/texto → previsualización → confirmar), pero ya con la
// categoría elegida desde el índice, así que no hay que volver a preguntársela.
function FormularioSubida({ categoria, onVolver }) {
  const fileRef = useRef(null)
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
      formData.append('tipo', categoria.value)
      if (fileRef.current?.files?.[0]) formData.append('imagen', fileRef.current.files[0])
      if (texto.trim()) formData.append('texto', texto.trim())

      const result = await api.kbUpload(formData)

      if (result.necesitaAclaracion) {
        setEstado('aclaracion')
        setMensaje(
          result.mensaje || 'No reconozco esto como información estructurable. ¿Me lo describes con más detalle?'
        )
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
      await api.kbConfirm({ uploadId, markdown: preview, tipo: categoria.value })
      setEstado('listo')
      setMensaje('Listo, Maite ya lo sabe ✅')
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

  const Volver = (
    <button onClick={onVolver} className="self-start text-sm text-lavanda-700">
      ← Todo lo que puedo actualizar
    </button>
  )

  if (estado === 'preview' || estado === 'confirmando') {
    return (
      <div className="flex flex-col gap-3 px-5">
        {Volver}
        <p className="text-sm font-semibold text-lavanda-800">Revisa antes de confirmar</p>
        <p className="text-xs text-morado-900/55">
          Esto se añade a lo que Maite ya sabe de {categoria.label.toLowerCase()} — no borra lo anterior. Puedes
          corregirlo aquí mismo.
        </p>
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
          <button
            onClick={confirmar}
            disabled={estado === 'confirmando'}
            className="flex-1 rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {estado === 'confirmando' ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  if (estado === 'listo') {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-sm font-medium text-morado-900/80">{mensaje}</p>
        <div className="flex gap-2">
          <button onClick={onVolver} className="rounded-full bg-lavanda-50 px-5 py-2.5 text-sm font-semibold text-lavanda-800">
            Volver
          </button>
          <button onClick={reiniciar} className="rounded-full bg-lavanda-700 px-5 py-2.5 text-sm font-semibold text-white">
            Subir otra cosa
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={procesar} className="flex flex-col gap-3 px-5">
      {Volver}

      <div className="rounded-2xl bg-lavanda-50 p-4">
        <p className="text-sm font-semibold text-morado-900">
          {categoria.icono} {categoria.label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/60">{categoria.ejemplo}</p>
      </div>

      <label className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Hazle una foto</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="rounded-xl border border-dashed border-lavanda-200 bg-crema-100 text-sm text-morado-900/60 file:mr-3 file:rounded-full file:border-0 file:bg-lavanda-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
      />

      <label className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">…o escríbelo</label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cuéntaselo con tus palabras, no hace falta que quede bonito."
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
