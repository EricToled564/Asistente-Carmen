import { useEffect, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { api } from '../../lib/api.js'
import { HORARIO, HORARIO_INFO, DIAS_ORDEN } from '../../data/horario.js'

// Default estático = semestre 1 precargado desde el arranque (mismo contenido que KB8). Si
// Carmen ya subió un horario nuevo vía "Actualizar mi info" (ej. 2º semestre), el Worker lo tiene
// guardado y lo preferimos sobre este default — así la vista nunca se queda desactualizada.
const INFO_DEFAULT = { ...HORARIO_INFO, actualizadoEn: HORARIO_INFO.ultimaActualizacion }

export default function Horario() {
  const now = useClock()
  const [datos, setDatos] = useState(null) // null = todavía cargando o nada subido -> usa default
  const [intentado, setIntentado] = useState(false)

  useEffect(() => {
    api
      .horarioObtener()
      .then((res) => setDatos(res.datos))
      .catch(() => {})
      .finally(() => setIntentado(true))
  }, [])

  const info = datos || INFO_DEFAULT
  const clases = datos ? datos.clases : HORARIO

  const hoy = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
    .format(now)
    .replace(/^./, (c) => c.toUpperCase())

  const porDia = DIAS_ORDEN.map((dia) => ({
    dia,
    clases: clases.filter((h) => h.dia === dia)
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-morado-900/50">
          Grupo {info.grupo} · {info.cursoAcademico}
        </p>
        <p className="text-xs text-morado-900/40">Actualizado {datos ? new Date(datos.actualizadoEn).toLocaleDateString('es-ES') : info.actualizadoEn}</p>
      </div>

      {!intentado && <p className="text-sm text-morado-900/40">Cargando…</p>}

      {porDia.map(({ dia, clases }) => (
        <div
          key={dia}
          className={`rounded-2xl p-4 shadow-soft ${dia === hoy ? 'bg-lavanda-700 text-white' : 'bg-white text-morado-900'}`}
        >
          <p className={`text-xs font-semibold uppercase tracking-wide ${dia === hoy ? 'text-lavanda-100' : 'text-lavanda-700'}`}>
            {dia}
            {dia === hoy ? ' · hoy' : ''}
          </p>
          {clases.length === 0 ? (
            <p className={`mt-2 text-sm ${dia === hoy ? 'text-white/70' : 'text-morado-900/40'}`}>Sin clases</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {clases.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.materia}</p>
                    <p className={`text-xs ${dia === hoy ? 'text-white/70' : 'text-morado-900/50'}`}>{c.aula}</p>
                  </div>
                  <p className={`shrink-0 text-xs font-semibold tabular-nums ${dia === hoy ? 'text-white' : 'text-lavanda-800'}`}>
                    {c.hora}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {info.notas?.length > 0 && (
        <div className="rounded-2xl bg-crema-100 p-4 text-xs text-morado-900/70">
          <p className="font-semibold text-morado-900">Notas</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {info.notas.map((nota, i) => (
              <li key={i}>{nota}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-morado-900/40">
        ¿Cambió tu horario? Súbelo en Ajustes → Actualizar mi info.
      </p>
    </div>
  )
}
