import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { usePush } from '../hooks/usePush.js'
import ActualizarInfo from '../components/kb/ActualizarInfo.jsx'
import DatosEmergenciaForm from '../components/emergencia/DatosEmergenciaForm.jsx'
import PreguntasActualizacion from '../components/kb/PreguntasActualizacion.jsx'
import Ayuda from '../components/ayuda/Ayuda.jsx'
import PrimerosDias from '../components/tramites/PrimerosDias.jsx'
import MenuColapsable from '../components/comun/MenuColapsable.jsx'

const SECCIONES = [
  { id: 'checklist', label: '✅ Primeros 30 días' },
  { id: 'kb', label: '🔄 Actualizar mi info' },
  { id: 'preguntas', label: '🗨️ Preguntas' },
  { id: 'emergencia', label: '🩸 Emergencia' },
  { id: 'notificaciones', label: '🔔 Notificaciones' },
  { id: 'ayuda', label: 'ℹ️ Ayuda' }
]

export default function Ajustes({ onNavigate }) {
  const [seccion, setSeccion] = useState('checklist')
  const { permissions, config } = useApp()
  // Un familiar que abre la PWA con ?familia=1 se suscribe como destinatario de alertas SOS
  // en vez de como "ella" — es el mecanismo v1 para distinguir destinatarios sin cuentas/login.
  const esFamilia = new URLSearchParams(window.location.search).get('familia') === '1'
  const {
    estado: estadoPush,
    detalle: detallePush,
    suscribir
  } = usePush(config.vapidPublicKey, esFamilia ? 'familia' : 'ella')

  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Ajustes</h1>
      </header>

      <MenuColapsable secciones={SECCIONES} activa={seccion} onCambiar={setSeccion} etiqueta="Secciones de Ajustes" />

      <div className="flex-1 overflow-y-auto pb-8">
        {seccion === 'checklist' && <PrimerosDias onNavigate={onNavigate} />}

        {/* `setSeccion` se pasa como onIrASeccion para que las fichas de "Actualizar mi info" y los
            botones de Ayuda salten a la sección correspondiente de Ajustes. Sin esto, cada ficha
            terminaría en "ve tú a la pestaña X", que es exactamente la clase de instrucción que no
            se sigue desde un móvil. */}
        {seccion === 'kb' && <ActualizarInfo onIrASeccion={setSeccion} onNavigate={onNavigate} />}

        {seccion === 'preguntas' && <PreguntasActualizacion />}

        {seccion === 'emergencia' && <DatosEmergenciaForm />}

        {seccion === 'notificaciones' && (
          <div className="flex flex-col gap-3 px-5">
            <p className="text-sm text-morado-900/60">
              Permiso actual: <span className="font-medium">{permissions.notifications}</span>
            </p>
            <button
              onClick={suscribir}
              className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white"
            >
              {estadoPush === 'suscrito' ? 'Suscrito ✓' : 'Activar notificaciones push'}
            </button>
            {estadoPush === 'no-soportado' && (
              <p className="text-xs text-red-700">
                Tu navegador no soporta push, o la app no está instalada como PWA (Add to Home Screen) todavía.
              </p>
            )}
            {['sin-permiso', 'fallo-suscripcion', 'fallo-servidor', 'sin-clave'].includes(estadoPush) && (
              <p className="text-xs text-red-700">
                {estadoPush === 'sin-permiso' && 'Falta el permiso de notificaciones. Actívalo para este sitio en los ajustes del navegador.'}
                {estadoPush === 'fallo-suscripcion' && 'El navegador no pudo registrarse. Cierra y vuelve a abrir la app.'}
                {estadoPush === 'fallo-servidor' && 'Tu teléfono está bien; no se pudo guardar el registro. Inténtalo en un rato.'}
                {estadoPush === 'sin-clave' && 'Falta la clave de notificaciones en la configuración de la app.'}
                {detallePush ? ` (${detallePush})` : ''}
              </p>
            )}
            <p className="text-xs text-morado-900/40">
              {esFamilia
                ? 'Activando como dispositivo de familia — recibirás las alertas SOS.'
                : 'Papá/familia: abran esta misma app con "?familia=1" al final del link para activarse como destinatarios de SOS.'}
            </p>
          </div>
        )}

        {seccion === 'ayuda' && <Ayuda onIrASeccion={setSeccion} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}
