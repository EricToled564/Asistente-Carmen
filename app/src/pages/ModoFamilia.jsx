import { useApp } from '../context/AppContext.jsx'
import { usePush } from '../hooks/usePush.js'

// Pantalla que ve un familiar cuando abre la app con "?familia=1".
//
// El mecanismo de suscripción ya existía, pero estaba enterrado en Ajustes → Notificaciones, con
// una nota en letra chica que decía "papá/familia: abran esta app con ?familia=1". O sea que la
// persona que tiene que recibir la alerta de emergencia tenía que: abrir la app de su sobrina,
// entender que no es para ella, encontrar Ajustes, encontrar la pestaña correcta y adivinar cuál
// de los dos botones le tocaba. Nadie hace eso, y el día del SOS no habría nadie suscrito.
//
// Aquí abre el link y lo único que hay en pantalla es el botón que le toca.
export default function ModoFamilia() {
  const { config } = useApp()
  const { estado, suscribir } = usePush(config.vapidPublicKey, 'familia')

  const listo = estado === 'suscrito'

  return (
    <div className="flex min-h-full flex-col justify-center gap-5 p-6 safe-top safe-bottom">
      <div className="rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-6 text-center shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-100">Alertas de emergencia</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white text-balance">
          Recibe las alertas de Carmen
        </h1>
        <p className="mt-2 text-sm text-lavanda-50/90">
          Carmen está estudiando en Pamplona. Si alguna vez aprieta el botón de emergencia de su app, te
          llegará un aviso a este teléfono con su ubicación.
        </p>
      </div>

      {listo ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft">
          <p className="text-4xl">✅</p>
          <p className="mt-2 font-display text-lg font-bold text-morado-900">Listo, ya estás activado</p>
          <p className="mt-1 text-sm text-morado-900/60">
            No tienes que hacer nada más. Puedes cerrar esta pantalla.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={suscribir}
            className="rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-6 py-4 text-base font-semibold text-white shadow-glow active:scale-[0.98]"
          >
            🔔 Activar las alertas
          </button>
          <p className="text-center text-xs text-morado-900/50">
            Tu teléfono te va a pedir permiso para mostrar notificaciones. Hay que aceptarlo — es lo que
            permite que el aviso llegue.
          </p>
        </>
      )}

      {estado === 'no-soportado' && (
        <p className="rounded-2xl bg-melocoton-300/40 p-4 text-sm text-morado-900">
          Para que funcione en iPhone hay que <strong>instalar la app primero</strong>: toca el botón de
          compartir de Safari y elige “Añadir a pantalla de inicio”. Después abre la app desde el icono y
          vuelve a intentarlo.
        </p>
      )}
      {estado === 'error' && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          No se pudo activar. Si rechazaste el permiso, hay que volver a darlo desde los ajustes del
          teléfono para este sitio.
        </p>
      )}

      <p className="text-center text-xs text-morado-900/40">
        Esto no es un servicio de emergencia. Ante peligro inmediato, el 112 siempre va primero.
      </p>
    </div>
  )
}
