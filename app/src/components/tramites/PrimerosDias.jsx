import { useState } from 'react'
import { useTramites, citaLegible, diasHasta } from '../../hooks/useTramites.js'
import BotonMaite from '../agente/BotonMaite.jsx'

// Los primeros 30 días, convertidos de lista de casillas en herramienta.
//
// La lista anterior decía "Agenda cita de TIE" y ya. No decía dónde, ni qué llevar, ni que el
// plazo son 30 días desde que aterrizó, ni avisaba la víspera. Marcar la casilla era lo único que
// se podía hacer, y marcarla no acerca nada.
//
// Aquí cada trámite trae sus pasos, se le pone fecha y hora, y el Worker manda el aviso el día
// antes y el mismo día. Al día siguiente pregunta cómo fue: sin esa última pregunta, una cita a la
// que no pudo ir se queda "agendada" para siempre y la app cree que va todo bien.
//
// Sobre los tamaños de letra: esta pantalla estaba entera a 11–12px con el texto al 45-55 % de
// opacidad. En una tarjeta de estado eso pasa; aquí no, porque lo que hay que leer son las
// instrucciones de un trámite con plazo legal, de pie y en la calle. El cuerpo va a 14px y los
// grises suben de contraste. Solo las etiquetas y las píldoras de estado se quedan en 12px.

function Estado({ tramite, hoy }) {
  if (tramite.estado === 'hecho') {
    return <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Hecho ✓</span>
  }
  if (tramite.estado === 'agendado') {
    const dias = diasHasta(tramite.cita?.fecha, hoy)
    const texto =
      dias === 0 ? 'Es hoy' : dias === 1 ? 'Es mañana' : dias > 1 ? `En ${dias} días` : 'Ya pasó'
    const color = dias !== null && dias <= 1 ? 'bg-melocoton-300 text-morado-900' : 'bg-lavanda-100 text-lavanda-800'
    return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{texto}</span>
  }
  return <span className="rounded-full bg-lavanda-50 px-2.5 py-1 text-xs font-semibold text-lavanda-700">Pendiente</span>
}

function FormularioCita({ tramite, onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState(tramite.cita?.fecha || '')
  const [hora, setHora] = useState(tramite.cita?.hora || '')
  const [lugar, setLugar] = useState(tramite.cita?.lugar || '')
  const [notas, setNotas] = useState(tramite.cita?.notas || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(e) {
    e.preventDefault()
    if (!fecha || !hora) {
      setError('Pon el día y la hora, que es lo que hace falta para poder avisarte.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onGuardar({ fecha, hora, lugar, notas })
    } catch {
      setError('No se pudo guardar. Inténtalo otra vez.')
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mt-3 flex flex-col gap-2 rounded-2xl bg-lavanda-50 p-3">
      <p className="text-sm font-semibold text-lavanda-800">
        ¿Cuándo es la cita? {/* La hora es la de Pamplona siempre: lo dice aquí para que no haya
        dudas si la agenda estando de viaje. */}
        <span className="font-normal text-morado-900/65">(hora de Pamplona)</span>
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-lavanda-200 p-2 text-sm"
        />
        <input
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="w-28 rounded-xl border border-lavanda-200 p-2 text-sm"
        />
      </div>
      <input
        value={lugar}
        onChange={(e) => setLugar(e.target.value)}
        placeholder="¿Dónde? (opcional)"
        className="rounded-xl border border-lavanda-200 p-2 text-sm"
      />
      <input
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Algo que no se te olvide (opcional)"
        className="rounded-xl border border-lavanda-200 p-2 text-sm"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-morado-900/80"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-xl bg-lavanda-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar la cita'}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-morado-900/65">
        Te aviso el día antes y otra vez esa mañana.
      </p>
    </form>
  )
}

function Tarjeta({ tramite, hoy, acciones, onNavigate }) {
  const hecho = tramite.estado === 'hecho'
  // Los pasos se ven de entrada en todo lo que sigue pendiente, y solo se pliegan cuando ya está
  // hecho.
  //
  // Antes iban colapsados detrás de un botón que decía "Cómo se hace", puesto al mismo nivel que
  // "No, aún no" —que es un deshacer—. El resultado es que al abrir la pantalla se veía una lista
  // de títulos con una línea de resumen: otra vez la lista de casillas que esto vino a sustituir.
  // Las instrucciones existían pero había que adivinar que estaban ahí, y una instrucción que hay
  // que descubrir no sirve de nada.
  const [abierto, setAbierto] = useState(!hecho)
  const [agendando, setAgendando] = useState(false)

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-soft ${hecho ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{tramite.icono}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-base font-semibold text-morado-900 ${hecho ? 'line-through' : ''}`}>{tramite.titulo}</p>
            <Estado tramite={tramite} hoy={hoy} />
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-morado-900/70">{tramite.resumen}</p>

          {tramite.cita && !hecho && (
            <p className="mt-2 rounded-xl bg-lavanda-50 p-2.5 text-sm text-lavanda-900">
              📅 {citaLegible(tramite.cita)}
              {tramite.cita.lugar ? ` · ${tramite.cita.lugar}` : ''}
              {tramite.cita.notas ? <span className="block text-morado-900/60">{tramite.cita.notas}</span> : null}
            </p>
          )}

          {tramite.plazo && !hecho && (
            <p className="mt-1.5 text-xs font-medium text-lavanda-700">⏳ {tramite.plazo}</p>
          )}
        </div>
      </div>

      {/* La cita ya pasó y sigue sin marcarse: es la pregunta que cierra el ciclo. */}
      {tramite.citaPasada && (
        <div className="mt-3 rounded-2xl bg-melocoton-300 p-3">
          <p className="text-sm font-semibold text-morado-900">¿Cómo fue?</p>
          <p className="mt-0.5 text-sm text-morado-900/80">
            Tu cita era el {citaLegible(tramite.cita)}. Dime si ya está o si hay que volver a ir.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => acciones.completar(tramite.id)}
              className="flex-1 rounded-xl bg-morado-900 py-2 text-sm font-semibold text-white"
            >
              Ya lo hice
            </button>
            <button
              onClick={() => setAgendando(true)}
              className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-morado-900"
            >
              Agendar otra
            </button>
          </div>
        </div>
      )}

      {agendando ? (
        <FormularioCita
          tramite={tramite}
          onCancelar={() => setAgendando(false)}
          onGuardar={async (cita) => {
            await acciones.agendar(tramite.id, cita)
            setAgendando(false)
          }}
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="rounded-full px-2 py-1.5 text-sm font-semibold text-morado-900/60"
          >
            {abierto ? 'Ocultar los pasos' : 'Ver los pasos'}
          </button>

          {!hecho && tramite.tipo === 'cita' && (
            <button
              onClick={() => setAgendando(true)}
              className="rounded-full bg-lavanda-700 px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              {tramite.cita ? 'Cambiar la cita' : 'Agendar cita'}
            </button>
          )}

          {!hecho && !tramite.citaPasada && (
            <button
              onClick={() => acciones.completar(tramite.id)}
              className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-green-800 ring-1 ring-green-200"
            >
              Ya lo hice
            </button>
          )}

          {!hecho && tramite.cita && (
            <button
              onClick={() => acciones.quitarCita(tramite.id)}
              className="rounded-full px-2 py-1.5 text-sm font-semibold text-red-700"
            >
              Quitar cita
            </button>
          )}

          {hecho && (
            <button
              onClick={() => acciones.reabrir(tramite.id)}
              className="rounded-full px-2 py-1.5 text-sm font-semibold text-morado-900/65"
            >
              No, aún no
            </button>
          )}
        </div>
      )}

      {abierto && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-crema-100 p-3.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Por qué importa</p>
            <p className="mt-1 text-sm leading-relaxed text-morado-900/80">{tramite.porQue}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">
              Qué tienes que hacer
            </p>
            <ol className="mt-1 ml-4 flex list-decimal flex-col gap-1.5 text-sm leading-relaxed text-morado-900/85">
              {tramite.pasos.map((paso, i) => (
                <li key={i}>{paso}</li>
              ))}
            </ol>
          </div>

          {tramite.queLlevar?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">Qué llevar</p>
              <ul className="mt-1 ml-4 flex list-disc flex-col gap-1 text-sm leading-relaxed text-morado-900/85">
                {tramite.queLlevar.map((cosa, i) => (
                  <li key={i}>{cosa}</li>
                ))}
              </ul>
            </div>
          )}

          {tramite.aviso && (
            <p className="rounded-xl bg-melocoton-300/60 p-2.5 text-sm leading-relaxed text-morado-900">
              ⚠️ {tramite.aviso}
            </p>
          )}

          {/* Los requisitos exactos de extranjería cambian, y KB6 lo dice explícitamente. Antes de
              inventar aquí una dirección o una tasa que puede estar desfasada, se manda a
              preguntárselo a Maite, que sí consulta la documentación al día. */}
          <BotonMaite
            onNavigate={onNavigate}
            className="w-full"
            contexto={`Carmen está preparando el trámite "${tramite.titulo}" de su lista de los primeros 30 días en Pamplona. Ayúdala con lo concreto y actual: dónde se pide la cita, qué documentos piden exactamente ahora, cuánto es la tasa y cuánto suele tardar. Consulta tu base de conocimiento de trámites (KB6). Si algo puede haber cambiado, dilo claramente y mándala a confirmarlo en la oficina o con estudiantes internacionales de la UNAV en vez de arriesgarte a darle un dato viejo.`}
          >
            Preguntarle a Maite los detalles
          </BotonMaite>
        </div>
      )}
    </div>
  )
}

export default function PrimerosDias({ onNavigate }) {
  const { tramites, resumen, hoy, error, agendar, quitarCita, completar, reabrir } = useTramites()
  const acciones = { agendar, quitarCita, completar, reabrir }

  if (error) return <p className="px-5 text-sm text-red-700">{error}</p>
  if (!tramites) return <p className="px-5 text-sm text-morado-900/65">Cargando…</p>

  const pendientesDeCerrar = tramites.filter((t) => t.citaPasada)
  const proxima = tramites
    .filter((t) => t.estado === 'agendado' && !t.citaPasada)
    .sort((a, b) => `${a.cita.fecha}${a.cita.hora}`.localeCompare(`${b.cita.fecha}${b.cita.hora}`))[0]

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <div className="rounded-2xl bg-gradient-to-br from-lavanda-700 to-lavanda-500 p-4 text-white shadow-glow">
        <p className="text-sm font-medium text-lavanda-100">Primeros 30 días</p>
        <p className="font-display text-3xl font-bold tabular-nums">
          {resumen.hechos}
          <span className="text-lg font-semibold text-lavanda-100/70">/{resumen.total}</span>
        </p>
        {proxima ? (
          <p className="mt-1 text-sm text-lavanda-50">
            Lo siguiente: <span className="font-semibold">{proxima.titulo}</span>, {citaLegible(proxima.cita)}.
          </p>
        ) : resumen.hechos === resumen.total ? (
          <p className="mt-1 text-sm text-lavanda-50">Ya está todo. En serio, no queda nada 🎉</p>
        ) : (
          <p className="mt-1 text-sm text-lavanda-50">
            Ponle fecha a lo de abajo y te voy avisando. Van en el orden que conviene hacerlos.
          </p>
        )}
      </div>

      {pendientesDeCerrar.length > 0 && (
        <p className="rounded-2xl bg-melocoton-300 p-3 text-sm font-medium text-morado-900">
          Tienes {pendientesDeCerrar.length} {pendientesDeCerrar.length === 1 ? 'cita' : 'citas'} que ya
          {pendientesDeCerrar.length === 1 ? ' pasó' : ' pasaron'} sin cerrar. Dime abajo cómo {pendientesDeCerrar.length === 1 ? 'fue' : 'fueron'}.
        </p>
      )}

      {tramites.map((t) => (
        <Tarjeta key={t.id} tramite={t} hoy={hoy} acciones={acciones} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
