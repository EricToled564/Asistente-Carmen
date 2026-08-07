import { useState } from 'react'
import { useApp } from './context/AppContext.jsx'
import Splash from './components/onboarding/Splash.jsx'
import OnboardingFlow from './components/onboarding/OnboardingFlow.jsx'
import NavTabs from './components/NavTabs.jsx'
import Inicio from './pages/Inicio.jsx'
import Mapa from './pages/Mapa.jsx'
import Agente from './pages/Agente.jsx'
import Academico from './pages/Academico.jsx'
import SOS from './pages/SOS.jsx'
import Ajustes from './pages/Ajustes.jsx'
import FotoInfo from './pages/FotoInfo.jsx'
import ModoFamilia from './pages/ModoFamilia.jsx'
import RedDeSeguridad from './components/comun/RedDeSeguridad.jsx'

const TABS = {
  inicio: { label: 'Inicio', icon: '🏠', Component: Inicio },
  mapa: { label: 'Mapa', icon: '🗺️', Component: Mapa },
  agente: { label: 'Maite', icon: '💬', Component: Agente },
  academico: { label: 'Académico', icon: '📚', Component: Academico },
  sos: { label: 'SOS', icon: '🆘', Component: SOS },
  ajustes: { label: 'Ajustes', icon: '⚙️', Component: Ajustes }
}

// Pantallas alcanzables desde botones rápidos pero que no son tabs de la barra inferior.
const OVERLAYS = {
  foto: FotoInfo
}

export default function App() {
  const { onboardingDone } = useApp()
  const [active, setActive] = useState('inicio')
  const [overlay, setOverlay] = useState(null)
  // Sin persistir: se ve cada vez que la app arranca de cero, no solo la primera vez en la vida.
  const [splashVisto, setSplashVisto] = useState(false)

  // "?familia=1" no es la app de Carmen: es la pantalla de un familiar que solo viene a activar
  // las alertas. Se comprueba ANTES que nada — hacerle pasar por el escudo y el onboarding de una
  // estudiante recién mudada a Pamplona sería absurdo, y es justo donde abandonaría.
  const esFamilia = new URLSearchParams(window.location.search).get('familia') === '1'
  if (esFamilia) return <ModoFamilia />

  if (!splashVisto) {
    return <Splash onEntrar={() => setSplashVisto(true)} />
  }

  if (!onboardingDone) {
    return <OnboardingFlow onGoTo={setActive} />
  }

  function navigate(key) {
    if (OVERLAYS[key]) setOverlay(key)
    else {
      setOverlay(null)
      setActive(key)
    }
  }

  // El widget de Maite ya NO se monta aquí. Vive solo en su pantalla (pages/Agente.jsx), y el
  // resto de la app la invoca con BotonMaite, que deja el contexto listo y navega hasta ahí.
  const Contenido = overlay ? OVERLAYS[overlay] : TABS[active].Component
  const propsContenido = overlay ? { onNavigate: navigate, onClose: () => setOverlay(null) } : { onNavigate: navigate }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-lavanda-50">
      <FondoDecorativo />
      <main className="relative z-10 flex-1 overflow-y-auto safe-top">
        {/* Envuelve el CONTENIDO, no la app entera: si una pantalla revienta, la barra de abajo
            sobrevive y Carmen puede irse al SOS o a Maite. `clave` hace que al cambiar de pestaña
            se limpie el error, para que una rotura pasajera no deje la pestaña muerta toda la
            sesión. */}
        <RedDeSeguridad clave={overlay || active}>
          <Contenido {...propsContenido} />
        </RedDeSeguridad>
      </main>
      {!overlay && <NavTabs tabs={TABS} active={active} onChange={navigate} />}
    </div>
  )
}

// Un par de manchas de color difuminadas y fijas detrás del contenido — le dan profundidad al
// fondo lavanda plano sin competir con la legibilidad (van detrás de todo, muy tenues).
function FondoDecorativo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-lavanda-400/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-melocoton-400/20 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-lavanda-300/20 blur-3xl" />
    </div>
  )
}
