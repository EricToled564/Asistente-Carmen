// Mismo contenido que kb/KB8-horario.md, pero estructurado para poder RENDERIZARLO en la app
// (el .md solo lo usa Maite en conversación — nadie lo ve como tabla si no existe esto). Si el
// horario cambia de semestre, hay que actualizar los dos: este archivo (para la vista en la app)
// y kb/KB8-horario.md (para que Maite lo sepa en voz) — no se generan el uno del otro.
export const HORARIO_INFO = {
  grupo: '1-Gr.Diseño-16',
  cursoAcademico: '2026-2027',
  ultimaActualizacion: '21-julio-2026',
  notas: [
    'Antropología aparece dos veces el lunes a la misma hora — probablemente el mismo curso CORE en paralelo (inglés/español), no dos materias simultáneas. Sin confirmar con la Escuela.',
    'Design Studio I, Form and Image y Comprehensive Lab I están partidas en franjas separadas: son teoría y taller de la misma materia.',
    'No incluye 2º semestre (Antropología II, Creative Traditions, Form and Matter, Comprehensive Lab II, Design Studio II) — inician enero 2027.'
  ]
}

export const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export const HORARIO = [
  { dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Anthropology (grupo inglés)', aula: 'AMI-P0-Aula005' },
  { dia: 'Lunes', hora: '10:00–12:00', materia: 'CORE - Antropología I (grupo español, 1er sem.)', aula: 'ARQ-P1-AULA5' },
  { dia: 'Martes', hora: '09:00–12:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P1-AULA6' },
  { dia: 'Martes', hora: '12:00–13:00', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { dia: 'Martes', hora: '15:30–17:30', materia: 'Design Studio I (Design Thinking)', aula: 'ARQ-P2-TALLER4A' },
  { dia: 'Miércoles', hora: '09:30–12:00', materia: 'Form and Image (Geometries)', aula: 'ARQ-P1-AULA5' },
  { dia: 'Miércoles', hora: '12:00–13:00', materia: 'Form and Image (Geometries)', aula: 'ARQ-P2-TALLER4A' },
  { dia: 'Jueves', hora: '10:00–14:00', materia: 'Art Culture of the Last Century', aula: 'ARQ-P0-MAGNA' },
  { dia: 'Viernes', hora: '09:00–12:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P1-AULA5' },
  { dia: 'Viernes', hora: '12:00–13:00', materia: 'Comprehensive Lab I (Graphics 2D)', aula: 'ARQ-P2-TALLER4A' },
  { dia: 'Viernes', hora: '12:00–14:00', materia: 'Conferencia (sesión programada)', aula: 'ARQ-P0-MAGNA' }
]
