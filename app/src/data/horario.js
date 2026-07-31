// Horario de Carmen, copiado del portal de horarios de la Universidad de Navarra.
//
// De dónde sale: `unav-publish.bulletscheduling.com/ArquitecturayDiseno`, grupo `1-Gr.Diseño-16`,
// publicado por la UNAV el 28-jul-2026. No está transcrito a mano: se generó desde la respuesta del
// portal, así que las aulas y los profesores son literalmente los que publica la universidad.
//
// Esto es el RESPALDO. La app le pide el horario al Worker (`GET /horario/oficial`), que va al
// portal y lo trae al día. Este archivo es lo que se enseña mientras eso carga o si el Worker no
// contesta: mejor un horario correcto de julio que una pantalla en blanco. Cuando Carmen pase a
// segundo, el Worker traerá el suyo y este respaldo se quedará viejo — por eso lleva fecha visible.
//
// La versión que lee Maite es `kb/KB8-horario.md`. Los dos salen de la misma consulta, pero no se
// generan el uno del otro: si tocas uno, toca el otro.
export const HORARIO_INFO = {
  grupo: '1-Gr.Diseño-16',
  cursoAcademico: '2026-2027',
  ultimaActualizacion: '29-julio-2026',
  fuente: 'Portal de horarios de la Universidad de Navarra',
  semestres: {
    1: { desde: '2026-08-31', hasta: '2026-11-27' },
    2: { desde: '2027-01-11', hasta: '2027-04-23' }
  },
  notas: [
    'Antropología sale dos veces el lunes a la misma hora porque son DOS grupos del mismo curso CORE, no dos asignaturas: el de español (Antropología I, ARQ-P1-AULA5, Raquel Cascales) y el de inglés (Anthropology, AMI-P0-Aula005, Miguel García-Valdecasas). Vas a uno de los dos — si no sabes a cuál, confírmalo en Secretaría.',
    'Design Studio, Form and Image y Comprehensive Lab aparecen partidas en varias franjas: son la parte de teoría y la de taller de la misma asignatura, en aulas distintas.',
    'La conferencia de los viernes a las 12:00 en el Aula Magna va los dos semestres, de agosto a abril.'
  ]
}

export const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// `semestre: null` = va todo el curso, los dos semestres.
export const HORARIO = [
  // --- Primer semestre (31-ago-2026 → 27-nov-2026) ---
  { semestre: 1, dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Anthropology (grupo inglés)', aula: 'AMI-P0-Aula005', profesor: 'Miguel García-Valdecasas Merino' },
  { semestre: 1, dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Antropología I (grupo español)', aula: 'ARQ-P1-AULA5', profesor: 'Raquel Cascales Tornel' },
  { semestre: 1, dia: 'Martes', hora: '09:00–12:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P1-AULA6', profesor: 'Javier Antón Sancho' },
  { semestre: 1, dia: 'Martes', hora: '12:00–13:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A', profesor: 'Javier Antón Sancho' },
  { semestre: 1, dia: 'Martes', hora: '15:30–17:30', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A', profesor: 'Javier Antón Sancho' },
  { semestre: 1, dia: 'Miércoles', hora: '09:30–12:00', materia: 'Form and Image (Geometries)', aula: 'ARQ-P1-AULA5', profesor: 'Juan Luis Roquette Rodríguez-Villamil' },
  { semestre: 1, dia: 'Miércoles', hora: '12:00–13:00', materia: 'Form and Image (Geometries)', aula: 'ARQ-P2-TALLER4A', profesor: 'Juan Luis Roquette Rodríguez-Villamil' },
  { semestre: 1, dia: 'Jueves', hora: '10:00–14:00', materia: 'Art Culture of the Last Century', aula: 'ARQ-P0-MAGNA', profesor: 'Diego Javier Caro Serrano' },
  { semestre: 1, dia: 'Viernes', hora: '09:00–12:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P1-AULA5', profesor: 'Cristina María Sanz Larrea' },
  { semestre: 1, dia: 'Viernes', hora: '12:00–13:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P2-TALLER4A', profesor: 'Cristina María Sanz Larrea' },

  // --- Segundo semestre (11-ene-2027 → 23-abr-2027) ---
  { semestre: 2, dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Anthropology (grupo inglés)', aula: 'AMI-P1-Aula111', profesor: 'Miguel García-Valdecasas Merino' },
  { semestre: 2, dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Antropología II (grupo español)', aula: 'ARQ-P1-AULA5', profesor: 'Raquel Cascales Tornel' },
  { semestre: 2, dia: 'Lunes', hora: '12:00–14:00', materia: 'Form and Matter (Properties)', aula: 'ARQ-P1-AULA6', profesor: 'Raúl Cruz Hidalgo' },
  { semestre: 2, dia: 'Martes', hora: '09:00–13:00', materia: 'Creative Traditions in History', aula: 'ARQ-P1-AULA3', profesor: 'María Angélica Martínez Rodríguez' },
  { semestre: 2, dia: 'Miércoles', hora: '09:00–12:00', materia: 'Comprehensive Lab II (Materials 3D)', aula: 'ARQ-P1-AULA1', profesor: 'Cristina María Sanz Larrea' },
  { semestre: 2, dia: 'Miércoles', hora: '12:00–13:00', materia: 'Comprehensive Lab II (Materials 3D)', aula: 'ARQ-P2-TALLER4A', profesor: 'Cristina María Sanz Larrea' },
  { semestre: 2, dia: 'Jueves', hora: '09:00–12:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P1-AULA1', profesor: 'Diego Javier Caro Serrano' },
  { semestre: 2, dia: 'Jueves', hora: '12:00–13:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A', profesor: 'Diego Javier Caro Serrano' },
  { semestre: 2, dia: 'Jueves', hora: '15:30–17:30', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A', profesor: 'Diego Javier Caro Serrano' },
  { semestre: 2, dia: 'Viernes', hora: '09:00–11:00', materia: 'Form and Matter (Properties)', aula: 'ARQ-P1-AULA1', profesor: 'Raúl Cruz Hidalgo' },

  // --- Todo el curso ---
  { semestre: null, dia: 'Viernes', hora: '12:00–14:00', materia: 'Conferencia (sesión programada)', aula: 'ARQ-P0-MAGNA', profesor: 'Javier Bernardino Sáez Gastearena' }
]

// Sesiones de un solo día que el portal publica aparte de la parrilla semanal. Las de diciembre
// caen DESPUÉS de que acaben las clases del primer semestre; las de mayo y junio, del segundo.
//
// El portal las publica como "Evento_Docencia" y no dice cuál es examen y cuál es entrega. Por eso
// aquí no llevan etiqueta: se dan tal cual —día, hora y aula— y Carmen las clasifica si quiere.
// Decirle que un bloque de cinco horas es "el examen final" sería un dato falso dicho con
// seguridad, que es la clase de error que más daño hace.
//
// Design Studio I y II caen el MISMO dia, a la MISMA hora y en el MISMO taller cuatro veces en
// junio. No es un duplicado ni un error de copia: en el portal son dos eventos distintos, cada uno
// con su asignatura, y las dos son suyas. Faltaban aqui hasta el 31-jul-2026 —el portal publica 16
// sesiones para el segundo semestre y este archivo traia 12— asi que sin cobertura veia cuatro
// fechas menos de las que tiene.
//
// `semestre: null` en las de mayo y junio no es un descuido: el portal deja ese campo en blanco en
// esas y **no se adivina**. Antes se deducía del mes, y salía mal de una forma que engañaba —
// "Design Studio I", que es del PRIMER semestre, quedaba archivada dentro del segundo solo porque
// su sesión cae en junio. El dato del portal estaba bien; la regla mía estaba mal.
export const SESIONES_ESPECIALES = [
  { semestre: 1, fecha: '2026-11-30', hora: '16:00–18:00', materia: 'CORE - Antropología I', aula: 'ARQ-P1-AULA4' },
  { semestre: 1, fecha: '2026-12-01', hora: '09:00–14:00', materia: 'Form and Image (Geometries)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: 1, fecha: '2026-12-02', hora: '09:00–13:00', materia: 'Art Culture of the Last Century', aula: 'ARQ-P1-AULA1' },
  { semestre: 1, fecha: '2026-12-10', hora: '09:00–18:00', materia: 'Sesión programada (jornada)', aula: 'ARQ-P0-MAGNA' },
  { semestre: 1, fecha: '2026-12-14', hora: '09:00–14:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P1-AULA3' },
  { semestre: 1, fecha: '2026-12-18', hora: '09:00–14:00', materia: '¿Es razonable creer hoy? (MCCC)', aula: 'ARQ-P0-MAGNA' },
  { semestre: null, fecha: '2027-05-03', hora: '09:00–14:00', materia: 'Creative Traditions in History', aula: 'ARQ-P1-AULA4' },
  { semestre: null, fecha: '2027-05-06', hora: '09:00–14:00', materia: 'Comprehensive Lab II (Materials 3D)', aula: 'ARQ-P1-AULA1' },
  { semestre: null, fecha: '2027-05-10', hora: '09:00–14:00', materia: 'Form and Matter (Properties)', aula: 'ARQ-P2-TALLER4A / 4B' },
  { semestre: null, fecha: '2027-06-08', hora: '09:00–14:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-08', hora: '09:00–14:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-09', hora: '09:00–14:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-09', hora: '09:00–14:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-10', hora: '12:00–14:00', materia: 'Art Culture of the Last Century', aula: 'ARQ-P2-TALLER1' },
  { semestre: null, fecha: '2027-06-11', hora: '09:00–14:00', materia: 'Comprehensive Lab II (Materials 3D)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-14', hora: '09:00–12:00', materia: 'Form and Matter (Properties)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-15', hora: '09:00–14:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-15', hora: '09:00–14:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-16', hora: '09:00–12:00', materia: 'Creative Traditions in History', aula: 'ARQ-P1-AULA3' },
  { semestre: null, fecha: '2027-06-18', hora: '09:00–13:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-22', hora: '09:00–14:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { semestre: null, fecha: '2027-06-22', hora: '09:00–14:00', materia: 'Design Studio II (Creative Examples)', aula: 'ARQ-P2-TALLER4A' }
]

// Qué semestre toca hoy. Sin esto, en febrero se le enseñaría la parrilla de septiembre.
export function semestreVigente(hoy = new Date()) {
  const iso = hoy.toISOString().slice(0, 10)
  const { 1: uno, 2: dos } = HORARIO_INFO.semestres
  if (iso >= uno.desde && iso <= uno.hasta) return 1
  if (iso >= dos.desde && iso <= dos.hasta) return 2
  // Entre semestres (Navidad) toca el que viene, no el que acabó. En verano, el 1 del curso nuevo.
  return iso > uno.hasta && iso < dos.desde ? 2 : 1
}

export function clasesDe(semestre) {
  return HORARIO.filter((c) => c.semestre === semestre || c.semestre === null)
}
