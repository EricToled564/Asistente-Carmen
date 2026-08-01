import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { usePush } from '../../hooks/usePush.js'
import { api } from '../../lib/api.js'
import { estaInstalada, esIOS } from '../../lib/instalacion.js'
import PrimerosDias from '../tramites/PrimerosDias.jsx'

const STEPS = ['bienvenida', 'instalar', 'permisos', 'emergencia', 'checklist']

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// La lista de trámites YA NO se duplica aquí. El último paso monta el componente real
// (components/tramites/PrimerosDias.jsx), con sus pasos, su qué llevar y su botón de agendar.
//
// Antes esta pantalla era una vista previa: ocho títulos y un "están en Ajustes". Eso tenía dos
// problemas. Se confunde con la sección de verdad —parece la herramienta y no lo es—, y sobre todo
// deja lo único urgente de sus primeras semanas a un viaje que hay que acordarse de hacer. El
// trámite con plazo legal es el T-I-E, un mes desde que aterriza: si hay un momento para poder
// agendarlo, es este.
//
// Se pierde a cambio que esta pantalla ya no se pinta sin red. Es un intercambio asumido: sin red
// el componente lo dice y ella puede seguir igual con el botón de abajo.

// ¿Se está viendo desde el icono instalado, o desde el navegador?
//
// Esto no es un detalle cosmético en iPhone: Safari NO permite notificaciones web a un sitio
// abierto en el navegador. Punto. Solo funcionan si la web está añadida a la pantalla de inicio y
// se abre desde ahí. Sin instalar, Carmen no recibiría NINGUNA notificación: ni los recordatorios
// de trámites, ni el check-in diario, ni —lo que de verdad importa— el aviso si alguien de su
// familia necesita localizarla.
//
// El onboarding le pedía permiso de notificaciones sin decirle nada de esto, así que en su iPhone
// habría fallado siempre y ella habría creído que las tenía activadas.
// (estaInstalada/esIOS viven en lib/instalacion.js — los usa también la sección de Ayuda.)

export default function OnboardingFlow({ onGoTo }) {
  const { completeOnboarding, updatePermission, permissions, config } = useApp()
  // Pedir el permiso NO es suscribirse. Ver askNotifications.
  const { estado: estadoPush, detalle: detallePush, suscribir } = usePush(config.vapidPublicKey)
  const [step, setStep] = useState(0)
  const [nombreLegal, setNombreLegal] = useState('Carmen Toledano Peláez')
  const [tipoSangre, setTipoSangre] = useState('')
  const [guardandoEmergencia, setGuardandoEmergencia] = useState(false)
  // Se vuelve a comprobar cada vez que la app vuelve a primer plano: en iPhone hay que SALIR para
  // instalar y volver a entrar desde el icono, así que el valor de la primera carga se queda
  // obsoleto justo cuando importa.
  const [instalada, setInstalada] = useState(estaInstalada)
  useEffect(() => {
    const revisar = () => setInstalada(estaInstalada())
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('focus', revisar)
    return () => {
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('focus', revisar)
    }
  }, [])

  async function askLocation() {
    if (!('geolocation' in navigator)) {
      updatePermission('location', 'unsupported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => updatePermission('location', 'granted'),
      () => updatePermission('location', 'denied'),
      { timeout: 8000 }
    )
  }

  // Pedir el permiso NO es suscribirse, y confundir las dos cosas rompía las notificaciones
  // enteras sin que nadie se enterara.
  //
  // Antes esto llamaba a `Notification.requestPermission()` y guardaba el resultado. Nada más.
  // Carmen tocaba "Permitir notificaciones", decía que sí, el botón pasaba a "Concedido ✓"... y su
  // teléfono NUNCA quedaba registrado en el servidor. Sin registro no hay a dónde mandar nada: los
  // recordatorios de trámites, los avisos de entregas y los cinco crons no le llegaban jamás. Y no
  // fallaba nada visible — la app enseñaba el permiso concedido, que es lo que hace que este tipo
  // de fallo sobreviva meses.
  //
  // Lo cazó el autodiagnóstico en el teléfono de Eric: "el permiso está dado, pero este teléfono no
  // está suscrito en el servidor".
  //
  // `suscribir()` hace las dos cosas: pide el permiso Y registra la suscripción. Se usa el mismo
  // hook que Ajustes para que no haya dos caminos que puedan divergir otra vez.
  async function askNotifications() {
    if (!('Notification' in window)) {
      updatePermission('notifications', 'unsupported')
      return
    }
    await suscribir()
    updatePermission('notifications', Notification.permission)
  }

  async function siguienteDesdeEmergencia() {
    setGuardandoEmergencia(true)
    try {
      await api.emergenciaGuardar({ nombreLegal, tipoSangre })
    } catch (err) {
      // Nunca bloqueante: si el Worker no está listo todavía, seguimos el onboarding igual.
      // Ella puede volver a intentarlo desde Ajustes más adelante.
      console.error('No se pudo guardar datos de emergencia', err)
    } finally {
      setGuardandoEmergencia(false)
      setStep((s) => s + 1)
    }
  }

  function finish() {
    completeOnboarding()
    onGoTo?.('inicio')
  }

  const esUltimo = step === STEPS.length - 1

  return (
    <div
      className={`flex h-full flex-col justify-between safe-top safe-bottom ${
        // El último paso monta la herramienta real, cuyas tarjetas son blancas sobre fondo claro.
        // Sobre el degradado morado del onboarding no se leerían.
        esUltimo ? 'bg-lavanda-50 p-0 text-morado-900' : 'bg-gradient-to-br from-lavanda-400 via-lavanda-600 to-morado-900 p-6 text-crema-50'
      }`}
    >
      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="font-display text-5xl font-bold tracking-tight text-balance">Hola 👋</h1>
          <p className="mt-4 max-w-xs text-crema-100/90">
            Soy Maite, tu companion en Pamplona. Te ayudo con el día a día, tus trámites y tu carrera —
            y estoy aquí si algo se pone difícil. Vamos a configurar un par de cosas antes de empezar.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          {instalada ? (
            <>
              <h2 className="font-display text-2xl font-bold">Ya me tienes instalada ✓</h2>
              <p className="text-sm text-crema-100/85">
                Perfecto. Así puedo avisarte de tus trámites y entregas, y estar disponible cuando me
                necesites.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">Primero, guárdame en tu pantalla</h2>
              <p className="text-sm text-crema-100/85">
                {esIOS()
                  ? 'En iPhone es obligatorio: si me abres desde el navegador, no puedo mandarte ni un solo aviso. Ni recordatorios de trámites, ni entregas, ni nada.'
                  : 'Así me abres de un toque y los avisos te llegan aunque tengas el navegador cerrado.'}
              </p>

              <div className="rounded-2xl bg-white/10 p-4">
                {esIOS() ? (
                  <ol className="flex flex-col gap-2 text-sm text-crema-100/90">
                    <li>
                      <strong>1.</strong> Toca el botón de compartir de Safari, abajo — el cuadrito con la
                      flecha hacia arriba.
                    </li>
                    <li>
                      <strong>2.</strong> Baja y elige <strong>“Añadir a pantalla de inicio”</strong>.
                    </li>
                    <li>
                      <strong>3.</strong> Confirma con <strong>Añadir</strong>.
                    </li>
                    <li>
                      <strong>4.</strong> Cierra esto y ábreme desde el icono nuevo. Sigo justo aquí.
                    </li>
                  </ol>
                ) : (
                  <ol className="flex flex-col gap-2 text-sm text-crema-100/90">
                    <li>
                      <strong>1.</strong> Abre el menú <strong>⋮</strong> de Chrome, arriba a la derecha.
                    </li>
                    <li>
                      <strong>2.</strong> Elige <strong>“Instalar aplicación”</strong> o{' '}
                      <strong>“Añadir a pantalla de inicio”</strong>.
                    </li>
                    <li>
                      <strong>3.</strong> Ábreme desde el icono nuevo.
                    </li>
                  </ol>
                )}
              </div>

              <p className="text-xs text-crema-100/60">
                Puedes saltarte este paso, pero entonces no te van a llegar los avisos. Se puede hacer
                después desde Ajustes.
              </p>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col justify-center gap-6">
          <h2 className="font-display text-2xl font-bold">Necesito dos permisos</h2>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="font-medium">📍 Ubicación</p>
            <p className="mt-1 text-sm text-crema-100/80">
              Para el mapa y para que SOS pueda mandar tu ubicación si la necesitas.
            </p>
            <button
              onClick={askLocation}
              className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lavanda-800"
            >
              {permissions.location === 'granted' ? 'Concedido ✓' : 'Permitir ubicación'}
            </button>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="font-medium">🔔 Notificaciones</p>
            <p className="mt-1 text-sm text-crema-100/80">
              Para recordatorios de trámites, entregas y check-ins.
            </p>
            <button
              onClick={askNotifications}
              disabled={estadoPush === 'pidiendo'}
              className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lavanda-800 disabled:opacity-60"
            >
              {estadoPush === 'pidiendo'
                ? 'Activando…'
                : estadoPush === 'suscrito'
                  ? 'Activadas ✓'
                  : 'Permitir notificaciones'}
            </button>
            {/* El estado real, no solo el del permiso. "Concedido ✓" con el teléfono sin registrar
                es la mentira que dejó las notificaciones muertas sin que nadie lo notara. */}
            {estadoPush !== 'idle' && estadoPush !== 'suscrito' && estadoPush !== 'pidiendo' && (
              <p className="mt-2 text-xs leading-relaxed text-melocoton-300">
                No se pudieron activar
                {estadoPush === 'sin-permiso'
                  ? ': hace falta que digas que sí.'
                  : estadoPush === 'fallo-servidor'
                    ? ': el permiso está dado pero no se pudo registrar tu teléfono. Vuelve a intentarlo desde Ajustes.'
                    : '.'}{' '}
                Puedes seguir y activarlas luego en Ajustes → Notificaciones.
                {detallePush ? ` (${detallePush})` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div>
            <h2 className="font-display text-2xl font-bold">Por si alguna vez pasa algo</h2>
            <p className="mt-2 text-sm text-crema-100/80">
              Esto NUNCA lo ve Maite ni se sube a su Knowledge Base — solo lo usa la pantalla de
              emergencia si algún día activas el SOS. Es opcional, no tienes que llenarlo ahorita.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nombre legal completo</span>
            <input
              value={nombreLegal}
              onChange={(e) => setNombreLegal(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-crema-50 placeholder:text-crema-100/50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Tipo de sangre (opcional)</span>
            <p className="text-xs text-crema-100/70">Por si alguna vez necesitas atención médica de urgencia.</p>
            <select
              value={tipoSangre}
              onChange={(e) => setTipoSangre(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-crema-50"
            >
              <option value="" className="text-morado-900">
                Prefiero no decir / no lo sé
              </option>
              {TIPOS_SANGRE.map((t) => (
                <option key={t} value={t} className="text-morado-900">
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="px-5 pt-5">
            <h2 className="font-display text-2xl font-bold text-lavanda-800">Tus primeros 30 días</h2>
            <p className="mt-2 text-sm leading-relaxed text-morado-900/70">
              Ocho cosas que hay que dejar hechas al llegar. Cada una trae su paso a paso y qué papeles
              llevar. Si ya sabes cuándo es alguna cita, ponle fecha aquí mismo y te aviso el día antes
              y esa misma mañana.
            </p>
            <p className="mt-2 text-xs text-morado-900/50">
              No hace falta que hagas nada ahora — esto se queda en Ajustes y puedes volver cuando
              quieras.
            </p>
          </div>
          <div className="mt-4">
            <PrimerosDias />
          </div>
        </div>
      )}

      {/* En el último paso el fondo es claro y la barra va sobre él: los puntos blancos y el botón
          blanco desaparecerían. Además se fija abajo, porque encima hay una lista larga que se
          desplaza y "Empezar" tiene que seguir alcanzable sin llegar al final. */}
      <div
        className={`flex items-center justify-between ${
          esUltimo
            ? 'sticky bottom-0 border-t border-lavanda-100 bg-crema-50/95 px-5 py-3 backdrop-blur'
            : 'mt-6'
        }`}
      >
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                esUltimo
                  ? i === step
                    ? 'bg-lavanda-700'
                    : 'bg-lavanda-200'
                  : i === step
                    ? 'bg-white'
                    : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        {step === 3 ? (
          <button
            onClick={siguienteDesdeEmergencia}
            disabled={guardandoEmergencia}
            className="rounded-full bg-white px-6 py-2.5 font-semibold text-lavanda-800 disabled:opacity-60"
          >
            {guardandoEmergencia ? 'Guardando…' : 'Siguiente'}
          </button>
        ) : step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-full bg-white px-6 py-2.5 font-semibold text-lavanda-800"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={finish}
            className="rounded-full bg-lavanda-700 px-6 py-2.5 font-semibold text-white active:scale-95"
          >
            Empezar
          </button>
        )}
      </div>
    </div>
  )
}
