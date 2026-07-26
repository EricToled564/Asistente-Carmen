import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import RadarFechas from '../components/academico/RadarFechas.jsx'
import CapturaRapida from '../components/academico/CapturaRapida.jsx'
import BotonesAtajos from '../components/academico/BotonesAtajos.jsx'
import IndiceAcademico from '../components/academico/IndiceAcademico.jsx'
import Horario from '../components/academico/Horario.jsx'
import MiProgreso from '../components/academico/MiProgreso.jsx'
import TipsAcademicos from '../components/academico/TipsAcademicos.jsx'

const SECCIONES = [
  { id: 'horario', label: '🗓️ Horario' },
  { id: 'progreso', label: '📈 Mi Progreso' },
  { id: 'tips', label: '💡 Tips' },
  { id: 'radar', label: '📅 Radar' },
  { id: 'indice', label: '📖 Índice' },
  { id: 'tutor', label: '🎓 Tutor' },
  { id: 'captura', label: '🎙️ Captura' }
]

export default function Academico() {
  const [seccion, setSeccion] = useState('horario')
  const { setContextoAgente } = useApp()

  useEffect(() => {
    setContextoAgente(
      seccion === 'tutor' ? 'modo estudio: ayuda con quiz y explicación de materias del Grado en Diseño (KB1/KB8)' : null
    )
    return () => setContextoAgente(null)
  }, [seccion, setContextoAgente])

  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Académico</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              seccion === s.id ? 'bg-lavanda-700 text-white' : 'bg-lavanda-50 text-lavanda-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {seccion === 'horario' && <Horario />}

        {seccion === 'progreso' && <MiProgreso />}

        {seccion === 'tips' && <TipsAcademicos />}

        {seccion === 'radar' && <RadarFechas />}

        {seccion === 'indice' && <IndiceAcademico />}

        {seccion === 'tutor' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">🎓</span>
            <p className="font-display text-lg font-bold text-morado-900">Modo estudio activado</p>
            <p className="text-sm text-morado-900/60">
              Toca el botón de Maite (flotando arriba a la derecha) y pídele un quiz o que te explique algo de
              tus materias — ya sabe que estás en modo tutor.
            </p>
          </div>
        )}

        {seccion === 'captura' && (
          <div className="flex flex-col gap-4">
            <CapturaRapida />
            <BotonesAtajos />
          </div>
        )}
      </div>
    </div>
  )
}
