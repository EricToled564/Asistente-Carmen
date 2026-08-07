import { useState } from 'react'
import RadarFechas from '../components/academico/RadarFechas.jsx'
import CapturaRapida from '../components/academico/CapturaRapida.jsx'
import IndiceAcademico from '../components/academico/IndiceAcademico.jsx'
import Horario from '../components/academico/Horario.jsx'
import TipsAcademicos from '../components/academico/TipsAcademicos.jsx'
import MisApuntes from '../components/academico/MisApuntes.jsx'
import MisCalificaciones from '../components/academico/MisCalificaciones.jsx'
import ModoEstudio from '../components/academico/ModoEstudio.jsx'
import MenuColapsable from '../components/comun/MenuColapsable.jsx'

const SECCIONES = [
  { id: 'horario', label: '🗓️ Horario' },
  { id: 'calificaciones', label: '📊 Mis calificaciones' },
  { id: 'tips', label: '💡 Tips' },
  { id: 'radar', label: '📅 Radar' },
  { id: 'indice', label: '📖 Índice' },
  { id: 'tutor', label: '🎓 Tutor' },
  { id: 'apuntes', label: '📝 Apuntes' },
  { id: 'captura', label: '🎙️ Captura' }
]

// Contexto que se le pasa a Maite según la pantalla. El de "tutor" ya no está aquí — ModoEstudio.jsx
// lo arma él mismo, porque ahora depende de qué materia elija Carmen (y de si tiene libro apuntado).
const CONTEXTO_POR_SECCION = {
  apuntes:
    'Carmen está viendo sus apuntes de clase guardados. Si te pide repasar o un quiz, usa consultar_apuntes para trabajar sobre lo que ella grabó, no sobre el temario genérico.'
}

export default function Academico({ onNavigate }) {
  const [seccion, setSeccion] = useState('horario')
  // Se incrementa al guardar una captura, para que la lista de apuntes se recargue sin tener que
  // salir y volver a entrar a la pestaña.
  const [apuntesToken, setApuntesToken] = useState(0)
  // Ya no se empuja contexto al entrar a cada sección: ahora lo lleva el propio botón cuando
  // Carmen decide hablar con Maite (ver components/agente/BotonMaite.jsx). Antes se ponía a
  // ciegas por si acaso, aunque ella nunca abriera al agente.

  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Académico</h1>
      </header>

      <MenuColapsable secciones={SECCIONES} activa={seccion} onCambiar={setSeccion} etiqueta="Secciones de Académico" />

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {seccion === 'horario' && <Horario onVerRadar={() => setSeccion('radar')} />}

        {seccion === 'calificaciones' && <MisCalificaciones />}

        {seccion === 'tips' && <TipsAcademicos />}

        {seccion === 'radar' && <RadarFechas />}

        {seccion === 'indice' && <IndiceAcademico onNavigate={onNavigate} />}

        {seccion === 'tutor' && <ModoEstudio onNavigate={onNavigate} />}

        {seccion === 'apuntes' && <MisApuntes recargarToken={apuntesToken} onNavigate={onNavigate} />}

        {/* Solo el grabador de la app. La tarjeta de los Atajos de iOS se quitó a propósito:
            tenía su propio botón "Grabar clase" más vistoso que el micrófono, y con dos formas de
            grabar en la misma pantalla se tocaba la equivocada. El grabador de la app hace lo
            mismo con los mismos toques y es depurable de punta a punta. */}
        {seccion === 'captura' && <CapturaRapida onGuardado={() => setApuntesToken((t) => t + 1)} />}
      </div>
    </div>
  )
}
