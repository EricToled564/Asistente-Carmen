import { api } from './api.js'
import { estaInstalada } from './instalacion.js'

// Qué funciona y qué no, comprobado DESDE EL TELÉFONO DE CARMEN.
//
// Por qué existe esto. Se puede probar el código en un portátil hasta quedarse ciego y aun así
// entregar una app rota, porque la mitad de lo que tiene que funcionar no depende del código: un
// permiso que ella no dio, un Atajo de iOS que nadie instaló, un dominio de correo sin verificar,
// un servicio caído. Nada de eso falla en una prueba automática: falla el día que ella lo
// necesita, en mitad de un pasillo, y entonces ya da igual lo bien probado que estuviera el resto.
//
// Así que las comprobaciones se ejecutan donde ocurren los fallos: en su navegador, con sus
// permisos, contra el servidor de verdad.
//
// Tres estados y ninguno de ellos es "probablemente bien":
//   'bien'   — se probó y respondió.
//   'mal'    — se probó y falló. Se dice qué hacer.
//   'amano'  — NO se puede comprobar desde aquí. Hay que probarlo a mano.
//
// El tercero es el importante y el que no se puede maquillar. El navegador no tiene forma de saber
// si existe un Atajo llamado "GrabarClase" en el iPhone, ni si un correo llegó de verdad. Marcar
// eso como verde sería mentir; dejarlo fuera de la lista sería peor, porque desaparecería de la
// vista. Sale en la lista, en ámbar, con lo que hay que hacer para saberlo.

const TIEMPO_LIMITE = 12000

function conLimite(promesa, ms = TIEMPO_LIMITE) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('tardó demasiado')), ms))
  ])
}

// Cada comprobación devuelve {estado, detalle, arreglo?}.
// `arreglo` es lo que hay que HACER si sale mal. Un diagnóstico que solo dice "error" no sirve de
// nada a las once de la noche.
export const COMPROBACIONES = [
  {
    id: 'conexion',
    grupo: 'Lo básico',
    titulo: 'Hay internet',
    async correr() {
      if (navigator.onLine === false) {
        return { estado: 'mal', detalle: 'El teléfono dice que no hay conexión.', arreglo: 'Enciende los datos o conéctate a una wifi.' }
      }
      return { estado: 'bien', detalle: 'El teléfono ve red.' }
    }
  },
  {
    id: 'instalada',
    grupo: 'Lo básico',
    titulo: 'La app está instalada en la pantalla de inicio',
    async correr() {
      return estaInstalada()
        ? { estado: 'bien', detalle: 'Abierta como app, no como pestaña del navegador.' }
        : {
            estado: 'mal',
            detalle: 'Se está usando desde el navegador.',
            arreglo:
              'En Safari: botón de Compartir, y luego "Añadir a pantalla de inicio". Sin esto NO llegan las notificaciones — iOS no las manda a una pestaña.'
          }
    }
  },
  {
    id: 'servidor',
    grupo: 'Lo básico',
    titulo: 'El servidor contesta',
    async correr() {
      const t0 = Date.now()
      await conLimite(api.salud())
      return { estado: 'bien', detalle: `Contestó en ${Date.now() - t0} ms.` }
    }
  },
  {
    id: 'horario',
    grupo: 'Lo académico',
    titulo: 'Tu horario se puede traer',
    async correr() {
      const h = await conLimite(api.horarioOficial({}))
      const n = (h?.dias || []).reduce((t, d) => t + (d.clases?.length || 0), 0)
      if (!n) {
        return {
          estado: 'mal',
          detalle: 'El servidor contestó pero sin ninguna clase.',
          arreglo: 'La app enseñará la copia guardada. Mira Académico → Horario: si ahí sale algo, no es urgente.'
        }
      }
      return { estado: 'bien', detalle: `${n} clases de ${h.curso}º curso${h.aviso ? ' (con aviso: copia guardada)' : ''}.` }
    }
  },
  {
    id: 'calificaciones',
    grupo: 'Lo académico',
    titulo: 'Tus calificaciones se pueden guardar y leer',
    async correr() {
      const r = await conLimite(api.calificacionesListar())
      return { estado: 'bien', detalle: `${r.resumen?.total ?? 0} asignaturas con desglose, ${r.resumen?.empezadas ?? 0} empezadas.` }
    }
  },
  {
    id: 'fechas',
    grupo: 'Lo académico',
    titulo: 'El radar de fechas responde',
    async correr() {
      const r = await conLimite(api.fechasListar())
      return { estado: 'bien', detalle: `${(r.fechas || []).length} fechas en el radar.` }
    }
  },
  {
    id: 'apuntes',
    grupo: 'Lo académico',
    titulo: 'Tus apuntes se pueden consultar',
    async correr() {
      const r = await conLimite(api.apuntesListar())
      return { estado: 'bien', detalle: `${(r.apuntes || []).length} apuntes guardados.` }
    }
  },
  {
    id: 'ruta',
    grupo: 'Moverse',
    titulo: 'Las rutas dentro del edificio funcionan',
    async correr() {
      // El endpoint devuelve {plantas: [{planta, lugares: [...]}]}, NO una lista plana de lugares.
      // La primera versión leía `r.lugares`, que no existe, y sacaba un rojo en un servicio que
      // estaba perfectamente. Lo detectó Eric corriendo el diagnóstico en su teléfono.
      const r = await conLimite(api.rutaLugares())
      const plantas = r.plantas || []
      const n = plantas.reduce((t, p) => t + (p.lugares?.length || 0), 0)
      if (!n) return { estado: 'mal', detalle: 'No devolvió ningún sitio del edificio.', arreglo: 'Avísale a Eric: el plano no está cargando.' }
      return { estado: 'bien', detalle: `${n} sitios en ${plantas.length} plantas.` }
    }
  },
  {
    id: 'ubicacion',
    grupo: 'Moverse',
    titulo: 'La app puede saber dónde estás',
    async correr() {
      if (!('geolocation' in navigator)) {
        return { estado: 'mal', detalle: 'Este navegador no tiene ubicación.', arreglo: 'Usa Safari en el iPhone.' }
      }
      // Se pregunta el permiso sin pedir la posición: pedirla lanzaría el diálogo del sistema en
      // mitad del diagnóstico, y eso convierte una comprobación en una interrupción.
      if (navigator.permissions?.query) {
        try {
          const p = await navigator.permissions.query({ name: 'geolocation' })
          if (p.state === 'denied') {
            return {
              estado: 'mal',
              detalle: 'Le dijiste que no a la ubicación.',
              arreglo: 'Ajustes del iPhone → Safari → Ubicación → Preguntar o Permitir. Sin esto, el mapa no sabe de dónde salir.'
            }
          }
          if (p.state === 'prompt') {
            return { estado: 'amano', detalle: 'Todavía no se ha pedido.', arreglo: 'Abre Mapa y toca "Desde donde estoy": te lo va a preguntar. Dile que sí.' }
          }
          return { estado: 'bien', detalle: 'Permiso concedido.' }
        } catch {
          // Safari viejo no soporta permissions.query para geolocation
        }
      }
      return { estado: 'amano', detalle: 'Este navegador no deja consultar el permiso.', arreglo: 'Abre Mapa y toca "Desde donde estoy" para comprobarlo.' }
    }
  },
  {
    id: 'notificaciones',
    grupo: 'Avisos',
    titulo: 'Los avisos pueden llegarte',
    async correr() {
      if (!('Notification' in window)) {
        return { estado: 'mal', detalle: 'Este navegador no soporta notificaciones.', arreglo: 'Instálala en la pantalla de inicio desde Safari.' }
      }
      if (Notification.permission === 'denied') {
        return {
          estado: 'mal',
          detalle: 'Están bloqueadas.',
          arreglo: 'Ajustes del iPhone → Notificaciones → Maite → activar. Sin esto no te llega ningún recordatorio de trámites ni de entregas.'
        }
      }
      if (Notification.permission === 'default') {
        return { estado: 'mal', detalle: 'Nunca se han activado.', arreglo: 'Ajustes → Notificaciones, dentro de esta app, y dale a activar.' }
      }
      const reg = await navigator.serviceWorker?.getRegistration()
      const sub = await reg?.pushManager?.getSubscription()
      if (!sub) {
        return {
          estado: 'mal',
          detalle: 'El permiso está dado, pero este teléfono no está suscrito en el servidor.',
          arreglo: 'Ajustes → Notificaciones y vuelve a activarlas. Así se registra otra vez.'
        }
      }
      return { estado: 'amano', detalle: 'Permiso dado y teléfono suscrito. Que el aviso LLEGUE de verdad no se puede comprobar desde aquí.', arreglo: 'Pídele a Eric que te mande uno de prueba.' }
    }
  },
  {
    id: 'microfono',
    grupo: 'Grabar clase',
    titulo: 'La app puede grabar audio',
    async correr() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        return {
          estado: 'mal',
          detalle: 'Este navegador no puede grabar.',
          arreglo: 'Usa Safari en el iPhone, con la app instalada en la pantalla de inicio.'
        }
      }
      if (navigator.permissions?.query) {
        try {
          const p = await navigator.permissions.query({ name: 'microphone' })
          if (p.state === 'denied') {
            return { estado: 'mal', detalle: 'El micrófono está bloqueado.', arreglo: 'Ajustes del iPhone → Safari → Micrófono → Permitir.' }
          }
        } catch {
          // Safari no implementa la consulta de 'microphone'; se cae al caso de abajo
        }
      }
      return { estado: 'bien', detalle: 'El navegador puede grabar. Académico → Captura.' }
    }
  },
  {
    id: 'atajos',
    grupo: 'Grabar clase',
    titulo: 'Los botones de "Grabar clase con 2 taps"',
    // Este es el ejemplo de por qué existe el estado 'amano'. El navegador NO puede saber si en el
    // iPhone hay un Atajo llamado "GrabarClase": no hay API para eso. Al tocar el botón, iOS abre
    // la app Atajos y, si no existe, enseña él su propio error ("el archivo de atajo no existe")
    // que la app no ve ni puede prevenir.
    async correr() {
      const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      if (!esIOS) {
        return { estado: 'amano', detalle: 'Esto solo existe en iPhone.', arreglo: 'En otro aparato, graba desde Académico → Captura.' }
      }
      return {
        estado: 'amano',
        detalle:
          'No hay forma de comprobarlo desde la app: iOS no deja preguntar qué Atajos tienes. Si el botón te da "el archivo de atajo no existe", es que faltan por crear.',
        arreglo: 'Académico → Captura tiene las instrucciones, y grabar desde la propia app funciona igual sin ellos.'
      }
    }
  },
  {
    id: 'maite',
    grupo: 'Maite',
    titulo: 'El widget de voz carga',
    async correr() {
      if (customElements.get('elevenlabs-convai')) {
        return { estado: 'bien', detalle: 'Cargado y listo.' }
      }
      return {
        estado: 'amano',
        detalle: 'Todavía no se ha abierto en esta sesión. Solo se carga al entrar a la pestaña de Maite.',
        arreglo: 'Entra a Maite y vuelve aquí.'
      }
    }
  },
  {
    id: 'memoria',
    grupo: 'Maite',
    titulo: 'Maite se acuerda de lo que hablaron',
    async correr() {
      const r = await conLimite(api.memoriaRecuperar({ query: '', limite: 1 }))
      const n = (r?.recuerdos || []).length
      return { estado: 'bien', detalle: `El almacén de recuerdos responde (${n} recuerdo${n === 1 ? '' : 's'}).` }
    }
  },
  {
    id: 'sos',
    grupo: 'Emergencia',
    titulo: 'Tus datos de emergencia están puestos',
    async correr() {
      // Los únicos dos campos que existen. La primera versión pedía además `contactoPrincipal`, un
      // campo que NO se guarda en ninguna parte: ni el formulario lo pide ni el Worker lo devuelve.
      // Salía en rojo "falta contactoPrincipal" para siempre, hiciera Carmen lo que hiciera.
      const r = await conLimite(api.emergenciaObtener())
      const d = r?.datos || r || {}
      const faltan = [
        ['nombreLegal', 'tu nombre legal completo'],
        ['tipoSangre', 'tu tipo de sangre']
      ].filter(([k]) => !String(d[k] || '').trim() || d[k] === 'no proporcionado')
      if (faltan.length === 2) {
        return { estado: 'mal', detalle: 'No hay ningún dato de emergencia guardado.', arreglo: 'Ajustes → Emergencia. Son dos minutos y es lo que se enseña si te pasa algo.' }
      }
      if (faltan.length) {
        return { estado: 'mal', detalle: `Falta ${faltan.map(([, n]) => n).join(' y ')}.`, arreglo: 'Ajustes → Emergencia.' }
      }
      return { estado: 'bien', detalle: 'Nombre legal y tipo de sangre guardados.' }
    }
  },
  {
    id: 'sosCorreo',
    grupo: 'Emergencia',
    titulo: 'El aviso por correo del SOS',
    // El botón de SOS manda un correo. Que el Worker responda 200 NO significa que el correo se
    // entregue: puede quedarse en el proveedor por un dominio sin verificar, o en spam. Probarlo
    // de verdad significa mandar uno y mirar la bandeja, y eso no lo puede hacer la app sola.
    async correr() {
      return {
        estado: 'amano',
        detalle: 'Que el correo SALGA no se puede comprobar desde aquí, y que LLEGUE menos.',
        arreglo: 'Que Eric dispare un SOS de prueba y confirme que le llegó el correo, incluido spam.'
      }
    }
  }
]

export const TOTAL_COMPROBACIONES = COMPROBACIONES.length

/**
 * Corre todas las comprobaciones y va avisando de cada una en cuanto termina.
 *
 * En serie y no en paralelo: quince peticiones a la vez desde un móvil con mala cobertura hacen
 * que se caigan varias por saturación y salgan en rojo cosas que funcionan. Un diagnóstico que da
 * falsos negativos es peor que no tenerlo, porque manda a buscar averías que no existen.
 */
export async function correrComprobaciones(alTerminarUna) {
  const resultados = []
  for (const c of COMPROBACIONES) {
    const base = { id: c.id, grupo: c.grupo, titulo: c.titulo }
    let r
    try {
      r = { ...base, ...(await c.correr()) }
    } catch (e) {
      r = {
        ...base,
        estado: 'mal',
        detalle: e?.message === 'tardó demasiado' ? 'No contestó en 12 segundos.' : `Falló: ${e?.message || 'error desconocido'}`,
        arreglo: 'Si hay cobertura y sigue fallando, avísale a Eric.'
      }
    }
    resultados.push(r)
    alTerminarUna?.(r, resultados.length, COMPROBACIONES.length)
  }
  return resultados
}

export function resumir(resultados) {
  return {
    bien: resultados.filter((r) => r.estado === 'bien').length,
    mal: resultados.filter((r) => r.estado === 'mal').length,
    amano: resultados.filter((r) => r.estado === 'amano').length,
    total: resultados.length
  }
}
