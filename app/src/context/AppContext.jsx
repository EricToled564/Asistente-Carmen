import { createContext, useContext, useMemo, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage.js'
import { CIUDAD_REFERENCIA_DEFAULT } from '../data/ciudadesReferencia.js'

const AppContext = createContext(null)

const DEFAULT_CHECKLIST = [
  { id: 'sos-nativo', label: 'Configura Emergencia SOS nativo del iPhone (contactos + info médica)', done: false },
  { id: 'empadronamiento', label: 'Agenda cita de empadronamiento', done: false },
  { id: 'tie', label: 'Agenda cita de TIE (no puede pasar de 1 mes desde llegada)', done: false },
  { id: 'banco', label: 'Abre cuenta bancaria', done: false },
  { id: 'sanidad', label: 'Trámite de tarjeta sanitaria', done: false },
  { id: 'movil', label: 'Línea de móvil española', done: false },
  { id: 'villavesa', label: 'Saca tu tarjeta de transporte (villavesa)', done: false }
  // El horario del 1er semestre ya está cargado en el KB (KB8-horario.md) — no hace falta
  // pedírselo en el checklist de los primeros 30 días. El de 2º semestre se pide vía push
  // reminder en diciembre (ver worker/src/cron/pushReminders.ts), no aquí.
]

export function AppProvider({ children }) {
  const [onboardingDone, setOnboardingDone] = useState(() => readJSON('onboardingDone', false))
  const [checklist, setChecklist] = useState(() => readJSON('checklist', DEFAULT_CHECKLIST))
  const [permissions, setPermissions] = useState(() =>
    readJSON('permissions', { location: 'unknown', notifications: 'unknown' })
  )
  // Ciudad del reloj secundario en Inicio — Ciudad de México por default (familia), cambiable si
  // Carmen viaja y quiere comparar la hora de otro lugar en vez de la de casa.
  const [ciudadReferencia, setCiudadReferenciaState] = useState(() => readJSON('ciudadReferencia', CIUDAD_REFERENCIA_DEFAULT))

  const config = useMemo(
    () => ({
      elevenLabsAgentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || '',
      whatsappNumero: import.meta.env.VITE_SOS_WHATSAPP_NUMERO || '',
      consuladoTel: import.meta.env.VITE_SOS_CONSULADO_TEL || '',
      residenciaDireccion: import.meta.env.VITE_RESIDENCIA_DIRECCION || 'CampusHome — Av. de Pío XII, 28, Iturrama, Pamplona',
      vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || '',
      // Vía 2 (fallback): la PWA le pasa fecha_actual/hora_mexico al widget como dynamic-variables.
      // Por defecto apagado — la Vía 1 ({{system__time}} configurado en la plataforma de ElevenLabs
      // con timezone Europe/Madrid) es la que se usa. Solo actívala si en pruebas reales el LLM
      // falla la aritmética de husos horarios con las reglas del system prompt.
      agenteViaDosHora: import.meta.env.VITE_AGENTE_VIA2_HORA === 'true'
    }),
    []
  )

  function completeOnboarding() {
    setOnboardingDone(true)
    writeJSON('onboardingDone', true)
  }

  function toggleChecklistItem(id) {
    setChecklist((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
      writeJSON('checklist', next)
      return next
    })
  }

  function updatePermission(kind, status) {
    setPermissions((prev) => {
      const next = { ...prev, [kind]: status }
      writeJSON('permissions', next)
      return next
    })
  }

  function setCiudadReferencia(ciudad) {
    setCiudadReferenciaState(ciudad)
    writeJSON('ciudadReferencia', ciudad)
  }

  const value = {
    onboardingDone,
    completeOnboarding,
    checklist,
    toggleChecklistItem,
    permissions,
    updatePermission,
    ciudadReferencia,
    setCiudadReferencia,
    config
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
