// Índice de materias del Grado en Diseño, agrupado por curso/semestre según KB1-plan-grado-diseno.md.
// Esto es SOLO el índice de navegación (nombre + código de KB) — el contenido real de cada
// materia (temario, evaluación) se muestra en IndiceAcademico.jsx leyendo directo los archivos de
// /kb (ver data/materiasContenido.js), no una copia mantenida a mano aquí.
//
// 4º curso, 2º semestre no tiene materias listadas: Estrategias de Comunicación & Web, Business
// management, Market strategies, Creative leadership workshop y el TFG no tienen guía docente
// (KB9-x) todavía — no se inventan aquí sin esa fuente.

export const INDICE_ACADEMICO = [
  {
    curso: 1,
    semestres: [
      {
        semestre: 1,
        materias: [
          { kbCode: 'KB9-1', titulo: 'Art Culture of the Last Century' },
          { kbCode: 'KB9-2', titulo: 'Form and Image (Geometries)' },
          { kbCode: 'KB9-3', titulo: 'Comprehensive Lab I (Graphics 2D)' },
          { kbCode: 'KB9-4', titulo: 'Design Studio I (Design Thinking)' },
          { kbCode: 'KB9-5', titulo: 'Antropología I' }
        ]
      },
      {
        semestre: 2,
        materias: [
          { kbCode: 'KB9-6', titulo: 'Creative Traditions in History' },
          { kbCode: 'KB9-7', titulo: 'Form and Matter (Properties)' },
          { kbCode: 'KB9-8', titulo: 'Comprehensive Lab II (Materials 3D)' },
          { kbCode: 'KB9-9', titulo: 'Design Studio II' },
          { kbCode: 'KB9-5', titulo: 'Antropología II' }
        ]
      }
    ]
  },
  {
    curso: 2,
    semestres: [
      {
        semestre: 1,
        materias: [
          { kbCode: 'KB9-10', titulo: 'Tradiciones Creativas en la Cultura Hispana' },
          { kbCode: 'KB9-11', titulo: 'Form and Technique' },
          { kbCode: 'KB9-12', titulo: 'Laboratorio de Integración III' },
          { kbCode: 'KB9-13', titulo: 'Taller de Diseño III' },
          { kbCode: 'KB9-14', titulo: 'Ética I' }
        ]
      },
      {
        semestre: 2,
        materias: [
          { kbCode: 'KB9-15', titulo: 'Hechos Creativos Contemporáneos' },
          { kbCode: 'KB9-16', titulo: 'Forma e Industria' },
          { kbCode: 'KB9-17', titulo: 'Comprehensive Lab IV' },
          { kbCode: 'KB9-18', titulo: 'Design Studio IV' },
          { kbCode: 'KB9-19', titulo: 'Ética II' }
        ]
      }
    ]
  },
  {
    curso: 3,
    semestres: [
      {
        semestre: 1,
        materias: [
          { kbCode: 'KB9-20', titulo: 'Design Trends in Contemporary World' },
          { kbCode: 'KB9-21', titulo: 'Applied Technologies I' },
          { kbCode: 'KB9-22', titulo: 'Project Management' },
          { kbCode: 'KB9-31', titulo: 'Claves Culturales I (optativa)' },
          { kbCode: 'KB9-23', titulo: 'Creative Lab I (por mención)' },
          { kbCode: 'KB9-24', titulo: 'Design Studio V (por mención)' }
        ]
      },
      {
        semestre: 2,
        materias: [
          { kbCode: 'KB9-25', titulo: 'The Legacy of the Craftsmanship' },
          { kbCode: 'KB9-26', titulo: 'Técnicas Aplicadas II' },
          { kbCode: 'KB9-27', titulo: 'Gestión de la Innovación' },
          { kbCode: 'KB9-31', titulo: 'Claves Culturales II (optativa)' },
          { kbCode: 'KB9-28', titulo: 'Laboratorio de Creación II (por mención)' },
          { kbCode: 'KB9-29', titulo: 'Taller de Diseño VI (por mención)' },
          { kbCode: 'KB9-30', titulo: 'Prácticas Profesionales I y II' }
        ]
      }
    ]
  },
  {
    curso: 4,
    semestres: [
      {
        semestre: 1,
        materias: [
          { kbCode: 'KB9-32', titulo: 'Photography and Visual Storytelling (optativa)' },
          { kbCode: 'KB9-33', titulo: 'Circular Design (optativa)' },
          { kbCode: 'KB9-34', titulo: 'Inclusive Design (optativa)' },
          { kbCode: 'KB9-35', titulo: 'Scenography (optativa)' },
          { kbCode: 'KB9-36', titulo: 'Footwear Design (mención Moda)' },
          { kbCode: 'KB9-37', titulo: 'Diseño de Complementos (mención Moda)' }
        ]
      },
      {
        semestre: 2,
        materias: [] // sin guía docente todavía — ver comentario arriba
      }
    ]
  }
]
