import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { usePush } from '../hooks/usePush.js'
import ActualizarInfo from '../components/kb/ActualizarInfo.jsx'

const SECCIONES = [
  { id: 'checklist', label: '✅ Primeros 30 días' },
  { id: 'kb', label: '🔄 Actualizar mi info' },
  { id: 'notificaciones', label: '🔔 Notificaciones' },
  { id: 'ayuda', label: 'ℹ️ Ayuda' }
]

export default function Ajustes() {
  const [seccion, setSeccion] = useState('checklist')
  const { checklist, toggleChecklistItem, permissions, config } = useApp()
  // Un familiar que abre la PWA con ?familia=1 se suscribe como destinatario de alertas SOS
  // en vez de como "ella" — es el mecanismo v1 para distinguir destinatarios sin cuentas/login.
  const esFamilia = new URLSearchParams(window.location.search).get('familia') === '1'
  const { estado: estadoPush, suscribir } = usePush(config.vapidPublicKey, esFamilia ? 'familia' : 'ella')

  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-semibold text-terracota-700">Ajustes</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              seccion === s.id ? 'bg-terracota-600 text-white' : 'bg-terracota-50 text-terracota-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {seccion === 'checklist' && (
          <ul className="flex flex-col gap-2 px-5">
            {checklist.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => toggleChecklistItem(item.id)}
                  className="flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left text-sm shadow-soft"
                >
                  <span>{item.done ? '✅' : '⬜️'}</span>
                  <span className={item.done ? 'text-noche-900/40 line-through' : ''}>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {seccion === 'kb' && <ActualizarInfo />}

        {seccion === 'notificaciones' && (
          <div className="flex flex-col gap-3 px-5">
            <p className="text-sm text-noche-900/60">
              Permiso actual: <span className="font-medium">{permissions.notifications}</span>
            </p>
            <button
              onClick={suscribir}
              className="rounded-xl bg-terracota-600 py-2.5 text-sm font-semibold text-white"
            >
              {estadoPush === 'suscrito' ? 'Suscrito ✓' : 'Activar notificaciones push'}
            </button>
            {estadoPush === 'no-soportado' && (
              <p className="text-xs text-red-700">
                Tu navegador no soporta push, o la app no está instalada como PWA (Add to Home Screen) todavía.
              </p>
            )}
            {estadoPush === 'error' && (
              <p className="text-xs text-red-700">No se pudo activar. Revisa permisos del sitio en Ajustes de iOS.</p>
            )}
            <p className="text-xs text-noche-900/40">
              {esFamilia
                ? 'Activando como dispositivo de familia — recibirás las alertas SOS.'
                : 'Papá/familia: abran esta misma app con "?familia=1" al final del link para activarse como destinatarios de SOS.'}
            </p>
          </div>
        )}

        {seccion === 'ayuda' && (
          <div className="flex flex-col gap-3 px-5 text-sm text-noche-900/70">
            <p>
              Los botones "Grabar clase" / "Terminar clase" del tab Académico dependen de dos Atajos de iOS
              que se crean una sola vez. Ve <code>/docs/atajos-ios.md</code> en el repo para la guía completa.
            </p>
            <p>
              Si algo no funciona, primero prueba recargar la app. Si sigue fallando, usa el bot de Telegram
              como respaldo — tiene el mismo cerebro.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
