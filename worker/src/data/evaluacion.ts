// Cómo se evalúa cada materia: los componentes con su peso, transcritos de la sección
// "Evaluacion" de cada guía docente en /kb/KB9-*.md.
//
// Existe porque el tracker anterior solo aceptaba UNA nota final por asignatura. Eso sirve para el
// expediente ya cerrado, pero no para el semestre en curso: durante el curso Carmen no tiene una
// nota, tiene siete trozos de nota, y la pregunta que de verdad se hace en noviembre es "con lo
// que llevo, ¿cómo voy?" y "¿cuánto necesito en el final?". Sin el desglose no hay forma de
// contestarla.
//
// SOLO están las nueve de primero (KB9-1 a KB9-9), que son las suyas este curso, más UNA excepción
// puntual: KB9-18 (Design Studio IV, 2º curso). No es que se haya vuelto a transcribir todo de
// golpe — sigue sin tener sentido, son 40 guías para asignaturas que Carmen cursará dentro de años
// y que para entonces habrán cambiado. Esta se añadió porque Eric trajo los números exactos de la
// guía real para poder verificar (con este caso concreto) que el motor de cálculo soporta mínimos
// sobre GRUPOS de apartados, no solo sobre uno suelto — ver `subcomponentes` más abajo. Para
// cualquier otra materia sin desglose, la app la deja crear sus propios componentes a mano (ver
// componentesPersonalizados en lib/calificacionesStore.ts), o los extrae Claude al preparar el
// semestre (ver lib/extraerEvaluacion.ts), que ahora también soporta esta misma jerarquía.
//
// Los pesos suman 100 en todas — pero con matiz: si un apartado tiene `subcomponentes`, sus pesos
// suman 100 DENTRO de ese apartado (100% de SU espacio), no del total de la asignatura. Hay una
// prueba que lo comprueba en los dos niveles.

export interface ComponenteEvaluacion {
  id: string
  nombre: string
  // Porcentaje sobre el nivel que lo contiene: si está en la raíz, sobre la nota final de la
  // asignatura; si está dentro de `subcomponentes` de otro apartado, sobre el 100% de ESE apartado.
  peso: number
  // Nota mínima que hace falta en ESTE apartado (o, si tiene `subcomponentes`, en el PROMEDIO
  // PONDERADO de ese grupo) por debajo de la cual la asignatura está suspensa por mucho que el
  // promedio global dé. Son las trampas de las guías docentes: se aprueba la media y se suspende
  // la asignatura igual. Si no se avisa, se entera en las notas finales.
  minimo?: number
  cuantos?: number // cuántas entregas/pruebas componen esta parte, si la guía lo dice — solo hojas
  // Si esto tiene algo, este apartado es un GRUPO: no se le mete una nota directamente a él, se
  // calcula como el promedio ponderado de sus hijos. El caso real que obligó a esto: "Proyectos 80%
  // (P1 30%, P2 50%, PE 20%; cada uno con su propio desglose interno), mínimo 4/10 en Proyectos,
  // P2 aprobado >=5/10 por su cuenta" (Design Studio IV) — dos mínimos sobre un promedio de varias
  // notas, no sobre una nota suelta. El modelo plano anterior no podía representar eso: lo único que
  // podía hacer era describirlo en `aviso` (texto), sin que la app lo calculara ni lo verificara de
  // verdad. Con `subcomponentes`, la jerarquía puede ser tan profunda como haga falta.
  subcomponentes?: ComponenteEvaluacion[]
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
    // Reestructurado de un aviso de texto ("el ÚLTIMO proyecto necesita un 5 por su cuenta") a un
    // mínimo de verdad, computable, sobre el grupo "Proyecto 3" — ver kb/KB9-4-design-studio-i.md:
    // "Global: promedio 3 proyectos 60%... Aprobar: promedio >=50, ultimo proyecto >=50". "Promedio"
    // de 3 = partes iguales, 20% del total cada uno; por dentro, cada proyecto se puntúa igual:
    // exploración 20, concepto 20, desarrollo 20, resultado 30, presentación 10 (de SU 20%).
    kbCode: 'KB9-4',
    materia: 'Design Studio I (Design Thinking)',
    notaMinima: 5,
    asistenciaMinima: 80,
    componentes: [
      {
        id: 'proyectos',
        nombre: 'Proyectos (promedio de 3)',
        peso: 60,
        subcomponentes: [
          {
            id: 'ds1_p1',
            nombre: 'Proyecto 1',
            peso: 33.33,
            subcomponentes: [
              { id: 'ds1_p1_exploracion', nombre: 'Exploración', peso: 20 },
              { id: 'ds1_p1_concepto', nombre: 'Concepto', peso: 20 },
              { id: 'ds1_p1_desarrollo', nombre: 'Desarrollo', peso: 20 },
              { id: 'ds1_p1_resultado', nombre: 'Resultado', peso: 30 },
              { id: 'ds1_p1_presentacion', nombre: 'Presentación', peso: 10 }
            ]
          },
          {
            id: 'ds1_p2',
            nombre: 'Proyecto 2',
            peso: 33.33,
            subcomponentes: [
              { id: 'ds1_p2_exploracion', nombre: 'Exploración', peso: 20 },
              { id: 'ds1_p2_concepto', nombre: 'Concepto', peso: 20 },
              { id: 'ds1_p2_desarrollo', nombre: 'Desarrollo', peso: 20 },
              { id: 'ds1_p2_resultado', nombre: 'Resultado', peso: 30 },
              { id: 'ds1_p2_presentacion', nombre: 'Presentación', peso: 10 }
            ]
          },
          {
            // El ÚLTIMO proyecto necesita un 5 por su cuenta — ahora se calcula, no solo se avisa.
            id: 'ds1_p3',
            nombre: 'Proyecto 3',
            peso: 33.34,
            minimo: 5,
            subcomponentes: [
              { id: 'ds1_p3_exploracion', nombre: 'Exploración', peso: 20 },
              { id: 'ds1_p3_concepto', nombre: 'Concepto', peso: 20 },
              { id: 'ds1_p3_desarrollo', nombre: 'Desarrollo', peso: 20 },
              { id: 'ds1_p3_resultado', nombre: 'Resultado', peso: 30 },
              { id: 'ds1_p3_presentacion', nombre: 'Presentación', peso: 10 }
            ]
          }
        ]
      },
      { id: 'casos', nombre: 'Casos de estudio', peso: 15 },
      { id: 'revision', nombre: 'Revisión final (portfolio + oral)', peso: 20 },
      { id: 'esfuerzo', nombre: 'Esfuerzo', peso: 5 }
    ]
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
    // Igual que Design Studio I: el desglose interno de cada proyecto (kb/KB9-9-design-studio-ii.md:
    // "Por proyecto: exploracion 20%, ideacion 20%, desarrollo 20%, resultado final 30%,
    // presentacion 10%") pasa de vivir solo en `aviso` a ser computable de verdad. La guía no da
    // ningún mínimo de grupo aparte de "Aprobar: >=5/10 global + condiciones especificas" —
    // "condiciones específicas" es demasiado vago para convertirlo en un número sin inventarlo, así
    // que no se le pone `minimo` a ningún proyecto (a diferencia de Design Studio I, que sí dice
    // explícitamente cuál).
    kbCode: 'KB9-9',
    materia: 'Design Studio II',
    notaMinima: 5,
    componentes: [
      {
        id: 'ds2_p1',
        nombre: 'Proyecto 1',
        peso: 27.5,
        subcomponentes: [
          { id: 'ds2_p1_exploracion', nombre: 'Exploración', peso: 20 },
          { id: 'ds2_p1_ideacion', nombre: 'Ideación', peso: 20 },
          { id: 'ds2_p1_desarrollo', nombre: 'Desarrollo', peso: 20 },
          { id: 'ds2_p1_resultado', nombre: 'Resultado final', peso: 30 },
          { id: 'ds2_p1_presentacion', nombre: 'Presentación', peso: 10 }
        ]
      },
      {
        id: 'ds2_p2',
        nombre: 'Proyecto 2',
        peso: 27.5,
        subcomponentes: [
          { id: 'ds2_p2_exploracion', nombre: 'Exploración', peso: 20 },
          { id: 'ds2_p2_ideacion', nombre: 'Ideación', peso: 20 },
          { id: 'ds2_p2_desarrollo', nombre: 'Desarrollo', peso: 20 },
          { id: 'ds2_p2_resultado', nombre: 'Resultado final', peso: 30 },
          { id: 'ds2_p2_presentacion', nombre: 'Presentación', peso: 10 }
        ]
      },
      {
        id: 'ds2_p3',
        nombre: 'Proyecto 3',
        peso: 30,
        subcomponentes: [
          { id: 'ds2_p3_exploracion', nombre: 'Exploración', peso: 20 },
          { id: 'ds2_p3_ideacion', nombre: 'Ideación', peso: 20 },
          { id: 'ds2_p3_desarrollo', nombre: 'Desarrollo', peso: 20 },
          { id: 'ds2_p3_resultado', nombre: 'Resultado final', peso: 30 },
          { id: 'ds2_p3_presentacion', nombre: 'Presentación', peso: 10 }
        ]
      },
      { id: 'revision', nombre: 'Revisión final', peso: 10 },
      { id: 'actitud', nombre: 'Actitud', peso: 5 }
    ]
  },
  {
    // Añadida como excepción puntual — ver el comentario grande al principio del archivo sobre por
    // qué esta y no las otras 39 de 2º a 4º. Números tal cual kb/KB9-18-design-studio-iv.md:
    // "Proyectos 80% (P1 30%, P2 50%, PE 20%; cada uno: analisis 20%, desarrollo/ideacion 30%,
    // resultado 40%, exposicion 10%) - revision final 20%. Requisitos: minimo 4/10 en proyectos,
    // asistencia 80%, P2 aprobado >=5/10. Extraordinaria: proyecto individual 70% + ejercicio del
    // dia 30%." — el primer caso real que necesita DOS mínimos de grupo a la vez: el bloque
    // "Proyectos" completo (4/10) Y, dentro de él, P2 por su cuenta (5/10).
    kbCode: 'KB9-18',
    materia: 'Design Studio IV',
    notaMinima: 5,
    asistenciaMinima: 80,
    componentes: [
      {
        id: 'ds4_proyectos',
        nombre: 'Proyectos',
        peso: 80,
        minimo: 4,
        subcomponentes: [
          {
            id: 'ds4_p1',
            nombre: 'P1 — Transformation',
            peso: 30,
            subcomponentes: [
              { id: 'ds4_p1_analisis', nombre: 'Análisis', peso: 20 },
              { id: 'ds4_p1_desarrollo', nombre: 'Desarrollo/ideación', peso: 30 },
              { id: 'ds4_p1_resultado', nombre: 'Resultado', peso: 40 },
              { id: 'ds4_p1_exposicion', nombre: 'Exposición', peso: 10 }
            ]
          },
          {
            id: 'ds4_p2',
            nombre: 'P2 — Speculative Everything',
            peso: 50,
            minimo: 5,
            subcomponentes: [
              { id: 'ds4_p2_analisis', nombre: 'Análisis', peso: 20 },
              { id: 'ds4_p2_desarrollo', nombre: 'Desarrollo/ideación', peso: 30 },
              { id: 'ds4_p2_resultado', nombre: 'Resultado', peso: 40 },
              { id: 'ds4_p2_exposicion', nombre: 'Exposición', peso: 10 }
            ]
          },
          {
            id: 'ds4_pe',
            nombre: 'PE — Proyecto especial (estrategias de juego)',
            peso: 20,
            subcomponentes: [
              { id: 'ds4_pe_analisis', nombre: 'Análisis', peso: 20 },
              { id: 'ds4_pe_desarrollo', nombre: 'Desarrollo/ideación', peso: 30 },
              { id: 'ds4_pe_resultado', nombre: 'Resultado', peso: 40 },
              { id: 'ds4_pe_exposicion', nombre: 'Exposición', peso: 10 }
            ]
          }
        ]
      },
      { id: 'ds4_revision', nombre: 'Revisión final', peso: 20 }
    ],
    aviso: 'Convocatoria extraordinaria: proyecto individual 70% + ejercicio del día 30% — no hereda nada de la ordinaria.'
  }
]

export function evaluacionDe(kbCode: string): EvaluacionMateria | undefined {
  return EVALUACION.find((e) => e.kbCode === kbCode)
}
