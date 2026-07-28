import { useState } from 'react'
import Calificaciones from './Calificaciones.jsx'
import MiProgreso from './MiProgreso.jsx'
import PrepararSemestre from './PrepararSemestre.jsx'

// Todo lo de calificaciones en un solo sitio.
//
// Estaba repartido en dos secciones del menú, "Mi Progreso" y "Mis notas", y las dos hablaban de
// notas. Desde fuera no había forma de saber cuál abrir: una llevaba el expediente cerrado y la
// otra el semestre en curso, pero el menú solo decía dos nombres parecidos. Ahora es una sección
// con tres vistas, y el nombre de cada una dice qué contesta:
//
//   Este semestre -> "con lo que llevo en esta asignatura, ¿cómo voy?"
//   Mi expediente -> "¿cómo llevo la carrera?"
//   Preparar      -> traer los pesos de las asignaturas que vienen
//
// No se fusiona el CONTENIDO de las dos primeras en una sola lista a propósito: son dos preguntas
// distintas, con dos escalas distintas (media del semestre sobre lo evaluado vs. promedio del
// expediente ponderado por ECTS). Mezclarlas en la misma pantalla produciría dos números parecidos
// uno al lado del otro que significan cosas diferentes, que es peor que tenerlos separados.

const VISTAS = [
  { id: 'semestre', label: 'Este semestre' },
  { id: 'expediente', label: 'Mi expediente' },
  { id: 'preparar', label: 'Preparar' }
]

export default function MisCalificaciones() {
  const [vista, setVista] = useState('semestre')
  // Se incrementa al preparar un semestre, para que la lista de asignaturas se recargue sin tener
  // que salir y volver a entrar.
  const [token, setToken] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-2xl bg-lavanda-50 p-1">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
              vista === v.id ? 'bg-white text-lavanda-800 shadow-soft' : 'text-morado-900/55'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === 'semestre' && <Calificaciones recargarToken={token} />}
      {vista === 'expediente' && <MiProgreso />}
      {vista === 'preparar' && (
        <PrepararSemestre
          onListo={() => {
            setToken((t) => t + 1)
            setVista('semestre')
          }}
        />
      )}
    </div>
  )
}
