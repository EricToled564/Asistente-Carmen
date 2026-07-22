import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { api } from '../../lib/api.js'

const STEPS = ['bienvenida', 'permisos', 'emergencia', 'checklist']

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function OnboardingFlow({ onGoTo }) {
  const { completeOnboarding, updatePermission, permissions, checklist, toggleChecklistItem } = useApp()
  const [step, setStep] = useState(0)
  const [nombreLegal, setNombreLegal] = useState('Carmen Toledano Peláez')
  const [tipoSangre, setTipoSangre] = useState('')
  const [guardandoEmergencia, setGuardandoEmergencia] = useState(false)

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

  async function askNotifications() {
    if (!('Notification' in window)) {
      updatePermission('notifications', 'unsupported')
      return
    }
    try {
      const result = await Notification.requestPermission()
      updatePermission('notifications', result)
    } catch {
      updatePermission('notifications', 'denied')
    }
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

  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-lavanda-400 via-lavanda-600 to-morado-900 p-6 text-crema-50 safe-top safe-bottom">
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
              className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-lavanda-800"
            >
              {permissions.notifications === 'granted' ? 'Concedido ✓' : 'Permitir notificaciones'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
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

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <h2 className="font-display text-2xl font-bold">Tus primeros 30 días</h2>
          <p className="text-sm text-crema-100/80">
            La tarea #1 es la más importante: configura la Emergencia SOS nativa del iPhone. Todo lo demás
            lo puedes ir marcando desde Ajustes cuando quieras.
          </p>
          <ul className="flex flex-col gap-2">
            {checklist.map((item, i) => (
              <li key={item.id}>
                <button
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`flex w-full items-start gap-3 rounded-xl p-3 text-left text-sm ${
                    i === 0 ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/10'
                  }`}
                >
                  <span>{item.done ? '✅' : i === 0 ? '⭐' : '⬜️'}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i === step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
        {step === 2 ? (
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
          <button onClick={finish} className="rounded-full bg-white px-6 py-2.5 font-semibold text-lavanda-800">
            Empezar
          </button>
        )}
      </div>
    </div>
  )
}
