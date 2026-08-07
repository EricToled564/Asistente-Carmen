import { useEffect, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { api } from '../../lib/api.js'
import { HORARIO_INFO, DIAS_ORDEN, clasesDe, semestreVigente } from '../../data/horario.js'
import { obtenerBloqueActual, bloqueSabido } from '../../lib/semestreActual.js'

// El horario de Carmen.
//
// Tres fuentes, por orden: lo que ella haya subido a mano ("Actualizar mi info"), el portal de la
// universidad —que trae el Worker— y, si nada de eso contesta, la copia guardada en la app. La suya
// manda sobre las otras dos: si subió un cambio es porque el profesor le dijo algo que el portal
// todavía no refleja.
//
// El selector de semestre no es un adorno. Antes esta pantalla enseñaba una sola parrilla, la del
// primer semestre, sin decir que lo era. En febrero le habría mandado a un aula donde no hay nadie.

export default function Horario({ onVerRadar }) {
  const now = useClock()
  const [subido, setSubido] = useState(null) // lo que ella subió a mano
  const [oficial, setOficial] = useState(null) // lo que publica la universidad
  // El ÚNICO semestre que se enseña: el de Carmen según el servidor (el fijado al preparar), con
  // lo último sabido como arranque. Del otro semestre no se ve nada — ni pestaña.
  const [semestre, setSemestre] = useState(() => bloqueSabido().semestre || semestreVigente())
  useEffect(() => {
    obtenerBloqueActual().then((b) => {
      if (b.semestre === 1 || b.semestre === 2) setSemestre(b.semestre)
    })
  }, [])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    Promise.allSettled([api.horarioObtener(), api.horarioOficial({ semestre })])
      .then(([manual, portal]) => {
        if (!vivo) return
        if (manual.status === 'fulfilled') setSubido(manual.value?.datos || null)
        setOficial(portal.status === 'fulfilled' ? portal.value || null : null)
      })
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [semestre])

  const hoy = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
    .format(now)
    .replace(/^./, (c) => c.toUpperCase())

  // Qué fuente se está usando, y que se vea en pantalla en vez de tener que adivinarlo.
  let clases
  let procedencia
  let actualizado
  if (subido?.clases?.length) {
    clases = subido.clases
    procedencia = 'Lo que tú subiste'
    actualizado = subido.actualizadoEn ? new Date(subido.actualizadoEn).toLocaleDateString('es-ES') : null
  } else if (oficial?.dias?.length) {
    clases = oficial.dias.flatMap((d) =>
      d.clases.map((c) => ({
        dia: d.diaNombre,
        hora: `${c.inicio}–${c.fin}`,
        materia: c.materia,
        aula: c.aula,
        profesor: c.profesor
      }))
    )
    procedencia = 'Portal de la Universidad'
    actualizado = oficial.actualizado ? new Date(oficial.actualizado).toLocaleDateString('es-ES') : null
  } else {
    clases = clasesDe(semestre)
    procedencia = 'Copia guardada en la app'
    actualizado = HORARIO_INFO.ultimaActualizacion
  }

  const porDia = DIAS_ORDEN.map((dia) => ({ dia, clases: clases.filter((h) => h.dia === dia) }))
  const notas = subido?.notas?.length ? subido.notas : HORARIO_INFO.notas

  return (
    <div className="flex flex-col gap-4">
      {/* Sin selector de semestres a propósito: el otro semestre NO existe para Carmen hasta que
          le toque. Solo se enseña el suyo (el que fija Preparar semestre en el servidor); cuando
          cambie de semestre, esta pantalla cambia sola. */}
      <div className="rounded-xl bg-lavanda-700 py-2 text-center text-sm font-semibold text-white">
        {semestre === 1 ? '1er' : '2º'} semestre
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-morado-900/50">
        <p>{oficial?.curso ? `${oficial.curso}º de Diseño` : `Grupo ${HORARIO_INFO.grupo}`}</p>
        <p className="text-right text-morado-900/45">
          {procedencia}
          {actualizado ? ` · ${actualizado}` : ''}
        </p>
      </div>

      {cargando && <p className="text-sm text-morado-900/40">Cargando…</p>}

      {/* Si el portal falló y se está sirviendo una copia vieja, se dice. Un horario desactualizado
          presentado como el de hoy es justo el fallo que esta pantalla existe para evitar. */}
      {oficial?.aviso && (
        <p className="rounded-xl bg-melocoton-300/60 p-3 text-xs leading-relaxed text-morado-900">⚠️ {oficial.aviso}</p>
      )}

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
            <div className="mt-2 flex flex-col gap-2.5">
              {clases.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.materia}</p>
                    <p className={`text-xs ${dia === hoy ? 'text-white/70' : 'text-morado-900/55'}`}>
                      {c.aula}
                      {c.profesor ? ` · ${c.profesor}` : ''}
                    </p>
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

      {/* Los exámenes, entregas y demás sesiones sueltas NO se listan aquí también: es la misma
          información que ya está en Radar, con más — ahí se pueden ocultar, marcar como hechas y
          mandar al calendario. Repetirla en dos pestañas de Académico no la hace más fiable, solo
          duplica lo que hay que leer para encontrarla. */}
      <button
        type="button"
        onClick={onVerRadar}
        className="rounded-2xl bg-white p-4 text-left shadow-soft"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-700">📅 Exámenes y entregas sueltos</p>
        <p className="mt-1 text-xs leading-relaxed text-morado-900/55">
          Las sesiones que la universidad publica fuera del horario semanal están en Radar de fechas,
          junto con lo que tú apuntes. Ver Radar →
        </p>
      </button>

      {notas?.length > 0 && (
        <div className="rounded-2xl bg-crema-100 p-4 text-xs leading-relaxed text-morado-900/70">
          <p className="font-semibold text-morado-900">Notas</p>
          <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
            {notas.map((nota, i) => (
              <li key={i}>{nota}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-morado-900/40">
        ¿Te dijeron un cambio que aquí no sale? Súbelo en Ajustes → Actualizar mi info.
      </p>
    </div>
  )
}
