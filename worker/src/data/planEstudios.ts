// El plan de estudios del Grado en Diseño, por curso y semestre.
//
// Es el mismo índice que ya usa la app (app/src/data/indiceAcademico.js), traído al Worker porque
// aquí hace falta para otra cosa: saber QUÉ asignaturas tocan en un semestre concreto cuando
// Carmen pide preparar el siguiente.
//
// Sí, está duplicado, y es a propósito. La alternativa era que el Worker se lo pidiera a la app,
// lo cual invierte la dependencia (el servidor dependiendo del cliente para saber algo del plan de
// estudios) y deja la preparación de un semestre rota si la app no está delante. El plan de
// estudios cambia como mucho una vez al año; una copia que se revisa en un diff es más barata que
// esa inversión.
//
// Antropología ocupa los dos semestres de primero, pero con DOS códigos: KB9-5 para la I y
// KB9-5B para la II. Comparten guía docente y profesora, pero reparten la nota de forma distinta,
// así que fusionarlas daba un promedio equivocado en una de las dos. Es anual y se cursa
// como Antropología I y II con la misma guía docente.

export interface MateriaPlan {
  kbCode: string
  titulo: string
}

export interface BloquePlan {
  curso: number
  semestre: number
  materias: MateriaPlan[]
}

export const PLAN_ESTUDIOS: BloquePlan[] = [
  { curso: 1, semestre: 1, materias: [
    { kbCode: 'KB9-1', titulo: 'Art Culture of the Last Century' },
    { kbCode: 'KB9-2', titulo: 'Form and Image (Geometries)' },
    { kbCode: 'KB9-3', titulo: 'Comprehensive Lab I (Graphics 2D)' },
    { kbCode: 'KB9-4', titulo: 'Design Studio I (Design Thinking)' },
    { kbCode: 'KB9-5', titulo: 'Antropología I' }
  ] },
  { curso: 1, semestre: 2, materias: [
    { kbCode: 'KB9-6', titulo: 'Creative Traditions in History' },
    { kbCode: 'KB9-7', titulo: 'Form and Matter (Properties)' },
    { kbCode: 'KB9-8', titulo: 'Comprehensive Lab II (Materials 3D)' },
    { kbCode: 'KB9-9', titulo: 'Design Studio II' },
    { kbCode: 'KB9-5B', titulo: 'Antropología II' }
  ] },
  { curso: 2, semestre: 1, materias: [
    { kbCode: 'KB9-10', titulo: 'Tradiciones Creativas en la Cultura Hispana' },
    { kbCode: 'KB9-11', titulo: 'Form and Technique' },
    { kbCode: 'KB9-12', titulo: 'Laboratorio de Integración III' },
    { kbCode: 'KB9-13', titulo: 'Taller de Diseño III' },
    { kbCode: 'KB9-14', titulo: 'Ética I' }
  ] },
  { curso: 2, semestre: 2, materias: [
    { kbCode: 'KB9-15', titulo: 'Hechos Creativos Contemporáneos' },
    { kbCode: 'KB9-16', titulo: 'Forma e Industria' },
    { kbCode: 'KB9-17', titulo: 'Comprehensive Lab IV' },
    { kbCode: 'KB9-18', titulo: 'Design Studio IV' },
    { kbCode: 'KB9-19', titulo: 'Ética II' }
  ] },
  { curso: 3, semestre: 1, materias: [
    { kbCode: 'KB9-20', titulo: 'Design Trends in Contemporary World' },
    { kbCode: 'KB9-21', titulo: 'Applied Technologies I' },
    { kbCode: 'KB9-22', titulo: 'Project Management' },
    { kbCode: 'KB9-31', titulo: 'Claves Culturales I (optativa)' },
    { kbCode: 'KB9-23', titulo: 'Creative Lab I (por mención)' },
    { kbCode: 'KB9-24', titulo: 'Design Studio V (por mención)' }
  ] },
  { curso: 3, semestre: 2, materias: [
    { kbCode: 'KB9-25', titulo: 'The Legacy of the Craftsmanship' },
    { kbCode: 'KB9-26', titulo: 'Técnicas Aplicadas II' },
    { kbCode: 'KB9-27', titulo: 'Gestión de la Innovación' },
    { kbCode: 'KB9-31', titulo: 'Claves Culturales II (optativa)' },
    { kbCode: 'KB9-28', titulo: 'Laboratorio de Creación II (por mención)' },
    { kbCode: 'KB9-29', titulo: 'Taller de Diseño VI (por mención)' },
    { kbCode: 'KB9-30', titulo: 'Prácticas Profesionales I y II' }
  ] },
  { curso: 4, semestre: 1, materias: [
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
  ] },
  { curso: 4, semestre: 2, materias: [
    { kbCode: 'KB9-45', titulo: 'Estrategias de Comunicación & Web' },
    { kbCode: 'KB9-46', titulo: 'Business Management / Gestión Empresarial' },
    { kbCode: 'KB9-47', titulo: 'Market Strategies' },
    { kbCode: 'KB9-48', titulo: 'Creative Leadership Workshop' },
    { kbCode: 'KB9-49', titulo: 'Trabajo Fin de Grado' }
  ] }
]

export function bloqueDe(curso: number, semestre: number): BloquePlan | undefined {
  return PLAN_ESTUDIOS.find((b) => b.curso === curso && b.semestre === semestre)
}
