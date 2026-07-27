import { useState } from 'react'
import RadarFechas from '../components/academico/RadarFechas.jsx'
import CapturaRapida from '../components/academico/CapturaRapida.jsx'
import BotonesAtajos from '../components/academico/BotonesAtajos.jsx'
import IndiceAcademico from '../components/academico/IndiceAcademico.jsx'
import Horario from '../components/academico/Horario.jsx'
import MiProgreso from '../components/academico/MiProgreso.jsx'
import TipsAcademicos from '../components/academico/TipsAcademicos.jsx'
import MisApuntes from '../components/academico/MisApuntes.jsx'
import BotonMaite from '../components/agente/BotonMaite.jsx'

const SECCIONES = [
  { id: 'horario', label: '🗓️ Horario' },
  { id: 'progreso', label: '📈 Mi Progreso' },
  { id: 'tips', label: '💡 Tips' },
  { id: 'radar', label: '📅 Radar' },
  { id: 'indice', label: '📖 Índice' },
  { id: 'tutor', label: '🎓 Tutor' },
  { id: 'apuntes', label: '📝 Apuntes' },
  { id: 'captura', label: '🎙️ Captura' }
]

// Contexto que se le pasa a Maite según la pantalla. En modo tutor se le dice explícitamente que
// tire de `consultar_apuntes`: si no, se queda con el temario oficial del KB, que es correcto pero
// genérico — y lo que de verdad le sirve a Carmen para un examen es lo que su profesor dijo en
// clase, con los ejemplos y los énfasis de él.
const CONTEXTO_POR_SECCION = {
  tutor:
    'modo estudio: ayuda con quiz y explicación de las materias del Grado en Diseño. Antes de armar un quiz o explicar un tema, usa consultar_apuntes para ver si Carmen grabó esa clase — si tiene apuntes propios, el quiz sale de ahí (lo que dijo su profesor) y el temario oficial del KB solo complementa.',
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

        {seccion === 'indice' && <IndiceAcademico onNavigate={onNavigate} />}

        {seccion === 'tutor' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-soft">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavanda-100 text-3xl">🎓</span>
            <p className="font-display text-lg font-bold text-morado-900">Modo estudio activado</p>
            <p className="text-sm text-morado-900/60">
              Pídele un quiz o que te explique algo de tus materias. Llega sabiendo que estás
              estudiando, no tienes que explicárselo.
            </p>
            <p className="rounded-2xl bg-lavanda-50 p-3 text-xs text-morado-900/70">
              Si grabaste esa clase, el quiz sale de <span className="font-semibold">tus apuntes</span> — de lo
              que dijo tu profesor, no de un temario genérico.
            </p>
            <BotonMaite contexto={CONTEXTO_POR_SECCION.tutor} onNavigate={onNavigate} className="mt-1 w-full">
              🎓 Empezar a estudiar con Maite
            </BotonMaite>
          </div>
        )}

        {seccion === 'apuntes' && <MisApuntes recargarToken={apuntesToken} onNavigate={onNavigate} />}

        {seccion === 'captura' && (
          <div className="flex flex-col gap-4">
            <CapturaRapida onGuardado={() => setApuntesToken((t) => t + 1)} />
            <BotonesAtajos />
          </div>
        )}
      </div>
    </div>
  )
}
