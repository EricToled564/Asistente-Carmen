import { useState } from 'react'
import { useApp } from './context/AppContext.jsx'
import OnboardingFlow from './components/onboarding/OnboardingFlow.jsx'
import NavTabs from './components/NavTabs.jsx'
import Inicio from './pages/Inicio.jsx'
import Mapa from './pages/Mapa.jsx'
import Agente from './pages/Agente.jsx'
import Academico from './pages/Academico.jsx'
import SOS from './pages/SOS.jsx'
import Ajustes from './pages/Ajustes.jsx'
import FotoInfo from './pages/FotoInfo.jsx'

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

  if (overlay) {
    const Overlay = OVERLAYS[overlay]
    return (
      <div className="flex h-full flex-col bg-lavanda-50">
        <main className="flex-1 overflow-y-auto safe-top">
          <Overlay onNavigate={navigate} onClose={() => setOverlay(null)} />
        </main>
      </div>
    )
  }

  const { Component } = TABS[active]

  return (
    <div className="flex h-full flex-col bg-lavanda-50">
      <main className="flex-1 overflow-y-auto safe-top">
        <Component onNavigate={navigate} />
      </main>
      <NavTabs tabs={TABS} active={active} onChange={navigate} />
    </div>
  )
}
