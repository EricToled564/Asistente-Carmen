// Cómo se evalúa cada materia: los componentes con su peso, transcritos de la sección
// "Evaluacion" de cada guía docente en /kb/KB9-*.md.
//
// Existe porque el tracker anterior solo aceptaba UNA nota final por asignatura. Eso sirve para el
// expediente ya cerrado, pero no para el semestre en curso: durante el curso Carmen no tiene una
// nota, tiene siete trozos de nota, y la pregunta que de verdad se hace en noviembre es "con lo
// que llevo, ¿cómo voy?" y "¿cuánto necesito en el final?". Sin el desglose no hay forma de
// contestarla.
//
// SOLO están las nueve de primero (KB9-1 a KB9-9), que son las suyas este curso. Las de 2º a 4º no
// se transcriben todavía a propósito: son 40 guías más, cada porcentaje es una oportunidad de
// equivocarse, y un peso mal copiado aquí produce un promedio falso que ella se va a creer. Para
// cualquier materia sin desglose, la app la deja crear sus propios componentes a mano (ver
// componentesPersonalizados en lib/calificacionesStore.ts).
//
// Los pesos suman 100 en todas. Hay una prueba que lo comprueba — si alguien añade una materia con
// pesos que no cuadran, salta ahí y no en el promedio de Carmen.

export interface ComponenteEvaluacion {
  id: string
  nombre: string
  peso: number // porcentaje sobre la nota final de la asignatura
  // Nota mínima en ESTE componente por debajo de la cual la asignatura está suspensa por mucho
  // que el promedio dé. Son las trampas de las guías docentes: se aprueba la media y se suspende
  // la asignatura igual. Si no se avisa, se entera en las notas finales.
  minimo?: number
  cuantos?: number // cuántas entregas/pruebas componen esta parte, si la guía lo dice
}

export interface EvaluacionMateria {
  kbCode: string
  materia: string
  componentes: ComponenteEvaluacion[]
  notaMinima: number // para aprobar la asignatura
  asistenciaMinima?: number // en porcentaje, si la guía la exige
  aviso?: string // condiciones que no se pueden expresar como número
}

export const EVALUACION: EvaluacionMateria[] = [
  {
    kbCode: 'KB9-1',
    materia: 'Art Culture of the Last Century',
    notaMinima: 5,
    componentes: [
      { id: 'asistencia', nombre: 'Asistencia y participación', peso: 20 },
      { id: 'talleres', nombre: 'Trabajos prácticos (3 talleres)', peso: 30, cuantos: 3 },
      { id: 'proyecto', nombre: 'Proyecto colaborativo con presentación oral', peso: 25 },
      { id: 'cuestionarios', nombre: 'Cuestionarios en clase', peso: 25 }
    ]
  },
  {
    kbCode: 'KB9-2',
    materia: 'Form and Image (Geometries)',
    notaMinima: 5,
    asistenciaMinima: 80,
    // La guía da los mínimos sobre 100; aquí todo va sobre 10 para que ella meta siempre el mismo
    // tipo de número y no tenga que traducir escalas mentalmente.
    componentes: [
      { id: 'ejercicios', nombre: 'Ejercicios y prácticas semanales', peso: 50 },
      { id: 'tests', nombre: 'Tests del semestre', peso: 10, minimo: 5 },
      { id: 'final', nombre: 'Examen final', peso: 40, minimo: 5 }
    ],
    aviso: 'Los tests y el examen final necesitan un 5 cada uno por separado. Con menos, la asignatura está suspensa aunque la media dé.'
  },
  {
    kbCode: 'KB9-3',
    materia: 'Comprehensive Lab I (Graphics 2D)',
    notaMinima: 5,
    asistenciaMinima: 75,
    componentes: [
      { id: 'asistencia', nombre: 'Asistencia', peso: 5 },
      { id: 'tests', nombre: 'Tests conceptuales', peso: 10, cuantos: 3 },
      { id: 'individuales', nombre: 'Ejercicios individuales', peso: 40 },
      { id: 'grupales', nombre: 'Ejercicios grupales', peso: 25 },
      { id: 'presentacion', nombre: 'Presentación', peso: 20 }
    ]
  },
  {
    kbCode: 'KB9-4',
    materia: 'Design Studio I (Design Thinking)',
    notaMinima: 5,
    asistenciaMinima: 80,
    componentes: [
      { id: 'proyectos', nombre: 'Promedio de los 3 proyectos', peso: 60, cuantos: 3 },
      { id: 'casos', nombre: 'Casos de estudio', peso: 15 },
      { id: 'revision', nombre: 'Revisión final (portfolio + oral)', peso: 20 },
      { id: 'esfuerzo', nombre: 'Esfuerzo', peso: 5 }
    ],
    aviso: 'El ÚLTIMO proyecto necesita un 5 por su cuenta. Cada proyecto se puntúa por dentro: exploración 20, concepto 20, desarrollo 20, resultado 30, presentación 10.'
  },
  {
    kbCode: 'KB9-5',
    materia: 'Antropología I y II',
    notaMinima: 5,
    componentes: [
      { id: 'examenes', nombre: 'Exámenes escritos de desarrollo', peso: 70 },
      { id: 'continua', nombre: 'Actividades y comentarios en clase', peso: 30 }
    ],
    // Esta es la única de primero cuya guía NO publica porcentajes. Se pone un reparto plausible
    // para que el tracker funcione, pero mentiría si lo presentara como oficial: por eso el aviso
    // sale siempre en pantalla y le pide confirmarlo con su profesor.
    aviso: 'ATENCIÓN: la guía docente de Antropología no publica porcentajes. Este reparto es una estimación, no el oficial — confírmalo con tu profesor y corrígelo si no coincide.'
  },
  {
    kbCode: 'KB9-6',
    materia: 'Creative Traditions in History',
    notaMinima: 5,
    componentes: [
      { id: 'bocetos', nombre: 'Trabajo continuo (cuaderno de bocetos)', peso: 20 },
      { id: 'investigacion', nombre: 'Dos trabajos de investigación con oral', peso: 35, cuantos: 2 },
      { id: 'pruebas', nombre: 'Pruebas del semestre', peso: 30, cuantos: 3 },
      { id: 'coordinados', nombre: 'Proyectos coordinados con Design Studio', peso: 15 }
    ]
  },
  {
    kbCode: 'KB9-7',
    materia: 'Form and Matter (Properties)',
    notaMinima: 5,
    asistenciaMinima: 80,
    componentes: [
      { id: 'asistencia', nombre: 'Asistencia', peso: 10 },
      { id: 'trabajos', nombre: 'Trabajos individuales y grupales', peso: 30 },
      { id: 'orales', nombre: 'Presentaciones orales', peso: 20 },
      { id: 'examenes', nombre: 'Exámenes (2 tests)', peso: 40, minimo: 5, cuantos: 2 }
    ],
    aviso: 'Cada uno de los dos tests necesita un 5 por separado.'
  },
  {
    kbCode: 'KB9-8',
    materia: 'Comprehensive Lab II (Materials 3D)',
    notaMinima: 5,
    asistenciaMinima: 75,
    componentes: [
      { id: 'asistencia', nombre: 'Asistencia', peso: 10 },
      { id: 'pruebas', nombre: 'Pruebas escritas', peso: 10, cuantos: 3 },
      { id: 'ejercicios', nombre: 'Ejercicios individuales y grupales', peso: 40 },
      { id: 'portfolio', nombre: 'Portfolio y presentaciones', peso: 40 }
    ]
  },
  {
    kbCode: 'KB9-9',
    materia: 'Design Studio II',
    notaMinima: 5,
    componentes: [
      { id: 'proyecto1', nombre: 'Proyecto 1', peso: 27.5 },
      { id: 'proyecto2', nombre: 'Proyecto 2', peso: 27.5 },
      { id: 'proyecto3', nombre: 'Proyecto 3', peso: 30 },
      { id: 'revision', nombre: 'Revisión final', peso: 10 },
      { id: 'actitud', nombre: 'Actitud', peso: 5 }
    ],
    aviso: 'Cada proyecto se puntúa por dentro: exploración 20, ideación 20, desarrollo 20, resultado final 30, presentación 10.'
  }
]

export function evaluacionDe(kbCode: string): EvaluacionMateria | undefined {
  return EVALUACION.find((e) => e.kbCode === kbCode)
}
