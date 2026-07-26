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
  // Modo viaje: cuando Carmen está fuera de Pamplona, la ciudad del reloj secundario pasa a ser
  // "donde está", no "donde está su casa" — y esa es la hora que Maite usa como ahora.
  //
  // Pamplona NO desaparece del cálculo: su horario de clases y todo lo del campus siguen en hora
  // de Pamplona. Si el modo viaje simplemente sustituyera una zona por otra, la pregunta que más
  // le hace ("¿qué clase tengo mañana?") empezaría a contestarse mal en cuanto cruzara un huso.
  // Por eso el widget le manda las dos horas a la vez (ver ElevenLabsWidget.jsx).
  //
  // Es un segundo valor y no reutilizar `ciudadReferencia` porque las dos ciudades significan
  // cosas distintas y se necesitan a la vez: si al activar el viaje se pisara la ciudad de casa,
  // el aviso de "buena ventana para llamar" pasaría a calcularse contra el sitio donde ella está,
  // que es justo cuando más falta hace acertarlo.
  const [modoViaje, setModoViajeState] = useState(() => readJSON('modoViaje', false))
  const [ciudadViaje, setCiudadViajeState] = useState(() => readJSON('ciudadViaje', CIUDAD_REFERENCIA_DEFAULT))
  // Contexto para el widget flotante de Maite (único, global — ver components/agente/MaiteFlotante.jsx).
  // Cada pantalla que quiera darle contexto especial (modo estudio, una materia puntual, una ruta
  // interior activa) llama setContextoAgente(...) al entrar y setContextoAgente(null) al salir —
  // NO se monta un widget nuevo por pantalla, solo se actualiza el contexto del que ya existe.
  const [contextoAgente, setContextoAgente] = useState(null)

  const config = useMemo(
    () => ({
      // Default real: el agente Maite ya está creado en ElevenLabs. Se puede pisar con
      // VITE_ELEVENLABS_AGENT_ID si en algún momento se recrea el agente con otro id.
      elevenLabsAgentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_8701kyeepa7tffmr5475esyq7rtq',
      whatsappNumero: import.meta.env.VITE_SOS_WHATSAPP_NUMERO || '',
      consuladoTel: import.meta.env.VITE_SOS_CONSULADO_TEL || '',
      residenciaDireccion: import.meta.env.VITE_RESIDENCIA_DIRECCION || 'CampusHome — Av. de Pío XII, 28, Iturrama, Pamplona',
      vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
      // La fecha/hora que se le pasa al agente ya no es opcional: se manda siempre desde
      // ElevenLabsWidget.jsx (ver el comentario de calcularVariablesDeHora sobre por qué no basta
      // con {{system__time}} de ElevenLabs para este caso).
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

  function setModoViaje(activo) {
    setModoViajeState(activo)
    writeJSON('modoViaje', activo)
  }

  function setCiudadViaje(ciudad) {
    setCiudadViajeState(ciudad)
    writeJSON('ciudadViaje', ciudad)
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
    modoViaje,
    setModoViaje,
    ciudadViaje,
    setCiudadViaje,
    contextoAgente,
    setContextoAgente,
    config
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
