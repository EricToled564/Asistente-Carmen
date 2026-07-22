import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'

const STEPS = ['bienvenida', 'permisos', 'checklist']

export default function OnboardingFlow({ onGoTo }) {
  const { completeOnboarding, updatePermission, permissions, checklist, toggleChecklistItem } = useApp()
  const [step, setStep] = useState(0)

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
        {step < STEPS.length - 1 ? (
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
