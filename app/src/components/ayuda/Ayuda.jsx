import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { estaInstalada, esIOS } from '../../lib/instalacion.js'
import { ATAJOS, HAY_ENLACES_DE_INSTALACION, urlEjecutar } from '../../data/atajos.js'

// La sección de Ayuda anterior tenía dos párrafos y los dos estaban mal:
//
// - Uno mandaba a leer `/docs/atajos-ios.md` "en el repo". Carmen no tiene el repo, no sabe qué es
//   un repo, y desde un iPhone no hay forma de abrir eso.
// - El otro proponía el bot de Telegram como respaldo. Telegram está descartado; no existe.
//
// O sea que la única pantalla a la que iría cuando algo falla no servía para nada. Esta versión
// solo contiene cosas que ella puede hacer desde el móvil que tiene en la mano, en el orden en que
// van a hacerle falta, y con botones que ejecutan de verdad en vez de describir.

function Bloque({ icono, titulo, children, abiertoPorDefecto = false }) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto)
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={abierto}
      >
        <span className="text-xl leading-none">{icono}</span>
        <span className="flex-1 text-sm font-semibold text-morado-900">{titulo}</span>
        <span className={`text-lavanda-500 transition-transform ${abierto ? 'rotate-90' : ''}`}>›</span>
      </button>
      {abierto && <div className="border-t border-lavanda-50 px-4 pb-4 pt-3 text-sm leading-relaxed text-morado-900/70">{children}</div>}
    </div>
  )
}

function Pasos({ children }) {
  return <ol className="ml-4 flex list-decimal flex-col gap-1.5 text-sm">{children}</ol>
}

export default function Ayuda({ onIrASeccion, onNavigate }) {
  const [instalada, setInstalada] = useState(estaInstalada)
  const [servidor, setServidor] = useState('idle') // idle | probando | ok | fallo
  const [actualizando, setActualizando] = useState(false)

  // Igual que en el onboarding: en iPhone hay que salir de la app para instalarla y volver a
  // entrar desde el icono, así que el valor de la primera carga se queda obsoleto justo cuando
  // importa. Se recomprueba al volver a primer plano.
  useEffect(() => {
    const revisar = () => setInstalada(estaInstalada())
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('focus', revisar)
    return () => {
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('focus', revisar)
    }
  }, [])

  async function probarServidor() {
    setServidor('probando')
    try {
      await api.salud()
      setServidor('ok')
    } catch {
      setServidor('fallo')
    }
  }

  // "Recarga la app" no es suficiente cuando el problema es un service worker que sirve una versión
  // vieja en caché: un reload normal vuelve a servir exactamente lo mismo. Hay que pedirle al SW que
  // busque versión nueva antes de recargar.
  async function actualizarApp() {
    setActualizando(true)
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
      await Promise.all(regs.map((r) => r.update()))
    } catch {
      // Da igual por qué falle: la recarga de abajo sigue siendo lo mejor que se puede hacer.
    }
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <p className="text-sm text-morado-900/60">
        Si algo no va, empieza por aquí. Está ordenado por lo que falla más.
      </p>

      <Bloque icono="🔔" titulo="No me llegan las notificaciones" abiertoPorDefecto={!instalada}>
        {!instalada ? (
          <>
            <p className="mb-2 rounded-xl bg-melocoton-300/40 p-3 text-sm font-medium text-morado-900">
              Estás abriendo la app desde el navegador. Así el móvil no deja que te lleguen avisos —
              hay que instalarla en la pantalla de inicio primero.
            </p>
            {esIOS() ? (
              <Pasos>
                <li>Abre esta página en <span className="font-semibold">Safari</span> (no en Chrome).</li>
                <li>Toca el botón de compartir, el cuadradito con la flecha hacia arriba.</li>
                <li>Baja y elige <span className="font-semibold">Añadir a pantalla de inicio</span>.</li>
                <li>Cierra Safari y abre la app desde el icono nuevo.</li>
                <li>Vuelve a Ajustes → Notificaciones y dale a activar.</li>
              </Pasos>
            ) : (
              <Pasos>
                <li>Abre esta página en <span className="font-semibold">Chrome</span>.</li>
                <li>Toca los tres puntitos de arriba a la derecha.</li>
                <li>Elige <span className="font-semibold">Instalar aplicación</span> o <span className="font-semibold">Añadir a pantalla de inicio</span>.</li>
                <li>Abre la app desde el icono nuevo.</li>
                <li>Vuelve a Ajustes → Notificaciones y dale a activar.</li>
              </Pasos>
            )}
          </>
        ) : (
          <>
            <p className="mb-2">La app ya está instalada ✅. Si aun así no te llegan:</p>
            <Pasos>
              <li>Ve a Ajustes → Notificaciones y comprueba que ponga «Suscrito».</li>
              <li>
                Si pone que están bloqueadas, hay que desbloquearlas desde los ajustes del móvil
                (Ajustes → la app → Notificaciones). Desde aquí no se puede volver a preguntar.
              </li>
              <li>Comprueba que el móvil no esté en «No molestar» o en modo ahorro de batería.</li>
            </Pasos>
          </>
        )}
        {onIrASeccion && (
          <button
            onClick={() => onIrASeccion('notificaciones')}
            className="mt-3 rounded-full bg-lavanda-700 px-4 py-2 text-xs font-semibold text-white"
          >
            Ir a Notificaciones
          </button>
        )}
      </Bloque>

      <Bloque icono="💬" titulo="Maite no me oye o no contesta">
        <Pasos>
          <li>Dale permiso al micrófono cuando te lo pida. Sin eso no puede oírte.</li>
          <li>Sube el volumen del móvil y quítale el silencio.</li>
          <li>Sal de la pestaña de Maite y vuelve a entrar: eso la reinicia entera.</li>
          <li>Si sigue muda, necesita internet. Prueba con datos en vez de wifi.</li>
        </Pasos>
        {onNavigate && (
          <button
            onClick={() => onNavigate('agente')}
            className="mt-3 rounded-full bg-lavanda-700 px-4 py-2 text-xs font-semibold text-white"
          >
            Abrir a Maite
          </button>
        )}
      </Bloque>

      <Bloque icono="🗺️" titulo="El mapa no me localiza">
        <Pasos>
          <li>Hace falta permiso de ubicación. Si lo rechazaste, se cambia en los ajustes del móvil.</li>
          <li>Dentro de un edificio el GPS falla mucho: sal a la calle o usa el mapa interior.</li>
          <li>
            Para moverte por dentro de un edificio usa <span className="font-semibold">Mapa → ¿Cómo llego?</span>,
            que va por plantas y no depende del GPS.
          </li>
        </Pasos>
      </Bloque>

      <Bloque icono="🧠" titulo="Maite me dijo algo que ya no es verdad">
        <p className="mb-2">
          Normal: ella sabe lo que se le ha contado. Si cambió tu horario, tu dirección o cualquier cosa,
          díselo y lo aprende al momento.
        </p>
        <div className="flex flex-wrap gap-2">
          {onIrASeccion && (
            <>
              <button
                onClick={() => onIrASeccion('kb')}
                className="rounded-full bg-lavanda-700 px-4 py-2 text-xs font-semibold text-white"
              >
                Actualizar mi info
              </button>
              <button
                onClick={() => onIrASeccion('preguntas')}
                className="rounded-full bg-lavanda-50 px-4 py-2 text-xs font-semibold text-lavanda-800"
              >
                Responder sus preguntas
              </button>
            </>
          )}
        </div>
      </Bloque>

      <Bloque icono="🔄" titulo="Se ve raro, se quedó cargando o sale información vieja">
        <p className="mb-3">
          Casi siempre es que el móvil se guardó una versión antigua de la app. Este botón la obliga a
          buscar la última y volver a arrancar.
        </p>
        <button
          onClick={actualizarApp}
          disabled={actualizando}
          className="rounded-full bg-lavanda-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {actualizando ? 'Actualizando…' : 'Actualizar la app y reiniciar'}
        </button>

        <p className="mb-2 mt-4">Si después de eso sigue igual, comprueba si el problema es el servidor:</p>
        <button
          onClick={probarServidor}
          disabled={servidor === 'probando'}
          className="rounded-full bg-lavanda-50 px-4 py-2 text-xs font-semibold text-lavanda-800 disabled:opacity-50"
        >
          {servidor === 'probando' ? 'Comprobando…' : 'Comprobar conexión'}
        </button>
        {servidor === 'ok' && (
          <p className="mt-2 text-xs font-medium text-green-700">
            El servidor responde bien ✅. Si algo falla, es de la app o de tu conexión.
          </p>
        )}
        {servidor === 'fallo' && (
          <p className="mt-2 text-xs font-medium text-red-700">
            No hay respuesta. O te quedaste sin internet, o el servidor está caído. Inténtalo en un rato —
            lo que no dependa de internet (mapa interior, tus notas ya cargadas) sigue funcionando.
          </p>
        )}
      </Bloque>

      <Bloque icono="🎙️" titulo="¿Cómo grabo una clase?">
        <Pasos>
          <li>Ve a <span className="font-semibold">Académico → 🎙️ Captura</span>.</li>
          <li>Dale a grabar al empezar la clase y a parar al terminar.</li>
          <li>Se transcribe y se ordena sola. Aparece en <span className="font-semibold">📝 Apuntes</span>.</li>
          <li>Desde ahí puedes pedirle a Maite un quiz de esa clase concreta.</li>
        </Pasos>
        {onNavigate && (
          <button
            onClick={() => onNavigate('academico')}
            className="mt-3 rounded-full bg-lavanda-700 px-4 py-2 text-xs font-semibold text-white"
          >
            Ir a Académico
          </button>
        )}
      </Bloque>

      <Bloque icono="⚡" titulo="El botón de grabar clase con 2 taps">
        <p className="mb-2">
          Sin él, grabar es tres toques: Académico → Captura → micrófono. Con él, dos: el botón
          <span className="font-semibold"> Grabar clase</span> está también ahí arriba, en la propia
          pantalla de Captura, junto a un menú para elegir de qué materia es antes de grabar. Pero hay un
          paso a mano antes de que sirva de algo.
        </p>

        <p className="mb-2 rounded-xl bg-melocoton-300/50 p-2.5 text-xs leading-relaxed text-morado-900">
          <span className="font-semibold">La app NO puede crearlo sola.</span> iOS no deja que una página
          web cree Atajos, ni siquiera que pregunte cuáles tienes — no existe esa función, a propósito: si
          existiera, cualquier web podría meterte automatizaciones en el teléfono sin que lo supieras. Lo
          único que la app puede hacer es pedirle a iOS que EJECUTE un Atajo por su nombre. Si ese Atajo no
          existe todavía, iOS contesta con su propio aviso —
          <span className="italic">"el archivo de atajo no existe"</span>— y eso lo pinta iOS, no esta app:
          por fuera parece que algo se rompió, pero es solo que falta el paso de abajo.
        </p>

        <p className="mb-1 text-sm font-semibold text-morado-900">Cómo crearlo (una vez, ~5 minutos):</p>
        <Pasos>
          <li>Abre la app <span className="font-semibold">Atajos</span> del iPhone (icono azul).</li>
          <li>
            Toca <span className="font-semibold">+</span> arriba a la derecha y llama al atajo exactamente{' '}
            <span className="rounded bg-crema-100 px-1 font-mono font-semibold">{ATAJOS.grabar.nombre}</span> — junto, con
            las mayúsculas donde están, sin acentos ni espacios. Si cambia una letra, el botón no lo encuentra.
          </li>
          <li>
            Añádele la acción <span className="font-semibold">Grabar audio</span>. Al ejecutarse, esta
            acción se queda en pantalla grabando — no hace falta un segundo Atajo para "terminar": se
            para tocando "Listo" ahí mismo, y el propio Atajo sigue solo al paso siguiente.
          </li>
          <li>
            Justo después, añade <span className="font-semibold">Obtener contenido de URL</span> hacia{' '}
            <span className="break-all font-mono text-[11px]">asistentecarmen.erictoled564.workers.dev/audio</span>, método{' '}
            <span className="font-semibold">POST</span>, cuerpo <span className="font-semibold">Formulario</span>, con dos
            campos: <span className="font-mono">audio</span> (tipo Archivo) = la salida de "Grabar audio", y{' '}
            <span className="font-mono">materia</span> (tipo Texto) = la variable{' '}
            <span className="italic">"Entrada de acceso directo"</span> — no un texto fijo. Es lo que hace que la
            clase se guarde ya con la materia que Carmen eligió en la app, en vez de sin clasificar.
          </li>
          <li>
            Tócale a <span className="font-semibold">Compartir</span> y guarda el enlace de iCloud:
            pegándolo en la app, este botón pasa a ser un simple "Instalar" y nadie más tiene que repetir
            estos pasos.
          </li>
        </Pasos>

        {HAY_ENLACES_DE_INSTALACION && (
          <a
            href={ATAJOS.grabar.instalarUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-xl border border-lavanda-300 bg-lavanda-50 py-2 text-center text-xs font-semibold text-lavanda-800"
          >
            ⬇️ Instalar “Grabar clase”
          </a>
        )}

        <p className="mt-3 text-xs text-morado-900/60">
          Si algo de esto se atasca, no pasa nada: en <span className="font-semibold">Académico → Captura</span>{' '}
          el botón del micrófono graba y sube el audio igual, sin ningún Atajo.
        </p>

        <a
          href={urlEjecutar(ATAJOS.grabar.nombre)}
          className="mt-2 block rounded-xl bg-lavanda-700 py-2 text-center text-xs font-semibold text-white"
        >
          ▶️ Probar Grabar clase (sin materia — solo para comprobar que el Atajo existe)
        </a>
      </Bloque>

      <Bloque icono="🔒" titulo="¿Qué sabe Maite de mí?">
        <p className="mb-2">Sin rodeos, esto es lo que se guarda:</p>
        <ul className="ml-4 flex list-disc flex-col gap-1.5">
          <li>Lo que tú subes en «Actualizar mi info» y lo que respondes a sus preguntas.</li>
          <li>Tus apuntes de clase, tus notas y las cosas importantes que le cuentas hablando.</li>
          <li>Información de tu universidad, tu residencia, Pamplona y trámites.</li>
        </ul>
        <p className="mt-2">
          Tus <span className="font-semibold">datos de emergencia</span> (nombre legal, tipo de sangre) son la
          excepción: viven aparte y nunca se le mandan al agente. Solo salen si activas el SOS.
        </p>
        <p className="mt-2">Todo lo que hay guardado lo puedes borrar tú: los apuntes y las notas, uno a uno.</p>
      </Bloque>

      <Bloque icono="🆘" titulo="Es una emergencia de verdad">
        <p className="mb-3">
          En España el número de emergencias es el <span className="font-semibold">112</span>, gratis y desde
          cualquier móvil aunque no tengas saldo ni cobertura de tu compañía. Llama primero, avisa después.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="tel:112"
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Llamar al 112
          </a>
          {onNavigate && (
            <button
              onClick={() => onNavigate('sos')}
              className="rounded-full bg-lavanda-50 px-4 py-2 text-xs font-semibold text-lavanda-800"
            >
              Abrir SOS
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-morado-900/50">
          El botón SOS avisa a tu familia y les manda dónde estás. No sustituye a llamar al 112.
        </p>
      </Bloque>
    </div>
  )
}
