// Índice de materias del Grado en Diseño, agrupado por curso/semestre según KB1-plan-grado-diseno.md.
// Esto es SOLO el índice de navegación (nombre + código de KB) — el contenido real de cada
// materia (temario, evaluación) se muestra en IndiceAcademico.jsx leyendo directo los archivos de
// /kb (ver data/materiasContenido.js), no una copia mantenida a mano aquí.
//
// 4º curso ya está completo (KB9-32 a KB9-49) desde la actualización del KB de julio 2026, que
// añadió las optativas de mención y las obligatorias de 2º semestre incluido el TFG.

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
          { kbCode: 'KB9-36', titulo: 'Calzado y Complementos (mención Moda)' },
          { kbCode: 'KB9-37', titulo: 'Textile Materials / Textile Design (mención Moda)' },
          { kbCode: 'KB9-38', titulo: 'Modelaje y Patronaje (mención Moda)' },
          { kbCode: 'KB9-39', titulo: '3D Printing + Digital Design (Moda y Producto)' },
          { kbCode: 'KB9-40', titulo: 'Análisis de la Experiencia y Comportamiento de los Usuarios (Producto y Servicios)' },
          { kbCode: 'KB9-41', titulo: 'Diseño de Mobiliario (mención Producto)' },
          { kbCode: 'KB9-42', titulo: 'Biomímesis y Pensamiento Sistémico (Producto y Servicios)' },
          { kbCode: 'KB9-43', titulo: 'Ciencia de los Datos y Big Data (mención Servicios)' },
          { kbCode: 'KB9-44', titulo: 'PPS Participatory Design (optativa)' }
        ]
      },
      {
        semestre: 2,
        materias: [
          { kbCode: 'KB9-45', titulo: 'Estrategias de Comunicación & Web' },
          { kbCode: 'KB9-46', titulo: 'Business Management / Gestión Empresarial' },
          { kbCode: 'KB9-47', titulo: 'Market Strategies' },
          { kbCode: 'KB9-48', titulo: 'Creative Leadership Workshop' },
          { kbCode: 'KB9-49', titulo: 'Trabajo Fin de Grado' }
        ]
      }
    ]
  }
]

// Lista plana de todas las materias del grado, sin agrupar por curso/semestre.
export const TODAS_LAS_MATERIAS = INDICE_ACADEMICO.flatMap((c) =>
  c.semestres.flatMap((s) => s.materias.map((m) => ({ ...m, curso: c.curso })))
)

// Las materias del semestre en curso — para el selector de "¿de qué clase es?" al grabar. Enseñar
// las ~45 del grado entero era ruido: Carmen cursa 5 a la vez, y las demás solo estorban (para lo
// raro está "Otras" en el propio selector).
//
// Si llega `bloque` ({curso, semestre}, normalmente del servidor vía lib/semestreActual.js), manda
// él. Sin bloque, cae al calendario: el curso académico empieza en septiembre de 2026 (su 1º);
// agosto-diciembre = 1er semestre, enero-julio = 2º.
export function materiasDelSemestre(fecha = new Date(), bloque = null) {
  let curso, semestre
  if (bloque?.curso) {
    curso = bloque.curso
    semestre = bloque.semestre
  } else {
    const anio = fecha.getFullYear()
    const mes = fecha.getMonth() + 1
    const enPrimeraMitad = mes >= 8 // agosto-diciembre
    curso = Math.min(4, Math.max(1, anio - 2026 + (enPrimeraMitad ? 1 : 0)))
    semestre = enPrimeraMitad ? 1 : 2
  }
  const b = INDICE_ACADEMICO.find((c) => c.curso === curso)?.semestres.find((s) => s.semestre === semestre)
  return (b?.materias || []).map((m) => ({ ...m, curso }))
}
