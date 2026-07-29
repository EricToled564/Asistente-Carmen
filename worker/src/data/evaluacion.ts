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
    // Antropología I y II van SEPARADAS, y no por pulcritud: sus guías reparten la nota de forma
    // distinta. Estuvieron fusionadas en una sola entrada de 70 % exámenes y 30 % clase, con un
    // aviso que decía que la guía no publicaba porcentajes. Las dos cosas eran falsas: la guía sí
    // los publica —comprobado contra asignatura.unav.edu/antropologia--gr-diseno el 29-jul-2026— y
    // ninguno de los dos repartos se parece al que había. Con aquellos números, un examen bien la
    // habría hecho creerse aprobada teniendo el 70 % de la nota en otra cosa.
    kbCode: 'KB9-5',
    materia: 'Antropología I',
    notaMinima: 5,
    componentes: [
      { id: 'asistencia', nombre: 'Asistencia y participación', peso: 30 },
      { id: 'ensayos', nombre: 'Ensayos y exposición voluntaria', peso: 40 },
      { id: 'final', nombre: 'Examen final', peso: 30 }
    ],
    aviso: 'En la convocatoria extraordinaria la nota es el examen final entero (en algún caso lo pueden sustituir por un trabajo).'
  },
  {
    kbCode: 'KB9-5B',
    materia: 'Antropología II',
    notaMinima: 5,
    componentes: [
      { id: 'final', nombre: 'Examen final', peso: 40, minimo: 5 },
      { id: 'participacion', nombre: 'Participación en clases magistrales', peso: 20 },
      { id: 'proyectos', nombre: 'Entregas de proyectos', peso: 15 },
      { id: 'cuaderno', nombre: 'Cuaderno de trabajo', peso: 25 }
    ],
    aviso: 'Hay que aprobar el examen para que haga media con el resto: sin eso, la asignatura suspende aunque los demás apartados vayan bien. Si no aprueba en mayo, en junio entra toda la materia y la nota es solo el examen.'
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
      { id: 'pruebas', nombre: 'Pruebas escritas', peso: 10, cuantos: 3, minimo: 4.5 },
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
