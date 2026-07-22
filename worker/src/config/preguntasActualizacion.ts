export interface PreguntaActualizacion {
  id: string
  pregunta: string
  // Código de documento del KB que actualiza esta respuesta, o 'libre' si no tiene un destino
  // fijo — esas se guardan como memoria de Maite (mecanismo 12), no como PATCH a un documento.
  kbCode: string
  // Disparo original del prompt v2, informativo — no todos están automatizados con push (ver
  // docs/preguntas-actualizacion.md para el detalle de cuáles sí y cuáles quedan solo manuales).
  trigger: string
}

export const CATALOGO_PREGUNTAS: PreguntaActualizacion[] = [
  {
    id: 'residencia-check',
    pregunta: '¿Cambiaste de residencia o sigue siendo la misma (CampusHome)?',
    kbCode: 'KB3',
    trigger: 'push 25-ago/20-dic'
  },
  {
    id: 'mencion-check',
    pregunta: '¿Ya sabes en qué mención te quedaste (Producto/Moda/Servicios)?',
    kbCode: 'KB1',
    trigger: 'push solo-4to-curso'
  },
  {
    id: 'antropologia-grupo',
    pregunta: '¿Tu grupo de Antropología es en inglés o español?',
    kbCode: 'KB8',
    trigger: 'manual una vez'
  },
  {
    id: 'contacto-check',
    pregunta: '¿Sigue igual tu dirección de contacto?',
    kbCode: 'KB3',
    trigger: 'push trimestral'
  },
  {
    id: 'libre',
    pregunta: '¿Algo de tu situación que deba saber Maite?',
    kbCode: 'libre',
    trigger: 'botón siempre visible'
  }
]
