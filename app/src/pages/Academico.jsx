import { useState } from 'react'
import RadarFechas from '../components/academico/RadarFechas.jsx'
import CapturaRapida from '../components/academico/CapturaRapida.jsx'
import BotonesAtajos from '../components/academico/BotonesAtajos.jsx'
import ElevenLabsWidget from '../components/agente/ElevenLabsWidget.jsx'

const SECCIONES = [
  { id: 'radar', label: '📅 Radar' },
  { id: 'tutor', label: '🎓 Tutor' },
  { id: 'captura', label: '🎙️ Captura' }
]

export default function Academico() {
  const [seccion, setSeccion] = useState('radar')

  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Académico</h1>
      </header>

      <div className="flex gap-2 px-5 pb-3">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              seccion === s.id ? 'bg-lavanda-700 text-white' : 'bg-lavanda-50 text-lavanda-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {seccion === 'radar' && <RadarFechas />}

        {seccion === 'tutor' && (
          <div className="flex h-full flex-col gap-3">
            <p className="text-sm text-morado-900/60">
              El tutor vive dentro de tu agente — le doy contexto de "modo estudio" para que te ayude con
              quizzes y explicaciones de tus materias.
            </p>
            <div className="min-h-[420px] flex-1 rounded-2xl bg-white shadow-soft">
              <ElevenLabsWidget contextHint="modo estudio: ayuda con quiz y explicación de materias del Grado en Diseño (KB1/KB8)" />
            </div>
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
