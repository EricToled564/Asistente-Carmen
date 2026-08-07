// Enlaces de "añadir al calendario" para Google Calendar y Outlook — sin pedir permisos ni cuenta:
// son URLs que abren el formulario de "nuevo evento" ya rellenado, y quien lo toca decide si lo
// guarda. No hay integración con la cuenta de Carmen porque no hace falta una para esto.
//
// La hora se manda en HORA LOCAL, sin sufijo de zona (ni "Z" ni offset). Los dos calendarios la
// interpretan entonces en la zona horaria que el propio calendario de quien lo abre tenga
// configurada — que para Carmen es Pamplona, así que coincide. Convertir a UTC aquí obligaría a
// calcular el desfase de horario de verano a mano y sería más frágil que dejar que el calendario
// de destino resuelva su propia zona, que es exactamente para lo que existe esa opción.

function limpiar(s) {
  return String(s || '').trim()
}

// "09:00–14:00" -> ['09:00', '14:00']. Acepta guion normal también, por si acaso.
function partirHora(hora) {
  const m = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(limpiar(hora))
  return m ? [m[1], m[2]] : null
}

function aFechaHora(fechaISO, hhmm) {
  return `${fechaISO.replace(/-/g, '')}T${hhmm.replace(':', '')}00`
}

function diaSiguiente(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// {fecha, hora?, titulo, aula?} -> {inicio, fin, todoElDia}, el bloque de tiempo común a los dos
// enlaces. Sin hora (las "propias" de Carmen no la llevan), se trata como evento de día completo.
function bloqueDeTiempo(f) {
  const par = partirHora(f.hora)
  if (!par) {
    return { inicio: f.fecha.replace(/-/g, ''), fin: diaSiguiente(f.fecha), todoElDia: true }
  }
  return { inicio: aFechaHora(f.fecha, par[0]), fin: aFechaHora(f.fecha, par[1]), todoElDia: false }
}

export function urlGoogleCalendar(f) {
  const { inicio, fin } = bloqueDeTiempo(f)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: limpiar(f.titulo),
    dates: `${inicio}/${fin}`,
    ...(f.aula ? { location: limpiar(f.aula) } : {}),
    ...(f.nota ? { details: limpiar(f.nota) } : {})
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function urlOutlookCalendar(f) {
  const { inicio, fin, todoElDia } = bloqueDeTiempo(f)
  // Outlook quiere ISO con guiones/dos puntos, no el formato compacto de Google.
  const aIso = (s) =>
    todoElDia
      ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
      : `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00`
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: limpiar(f.titulo),
    startdt: aIso(inicio),
    enddt: aIso(fin),
    allday: todoElDia ? 'true' : 'false',
    ...(f.aula ? { location: limpiar(f.aula) } : {}),
    ...(f.nota ? { body: limpiar(f.nota) } : {})
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
