// Tips académicos, leídos de kb/KB10-tips-academicos.md — la MISMA fuente que consulta Maite,
// nunca una copia. Si el documento se edita, la pantalla se actualiza sola en el próximo build.
//
// Formato del documento: 8 secciones (4 cursos × 2 semestres), cada una con sus materias.
//   ## 1o curso - 1er semestre
//   ### Art Culture of the Last Century
//   tip...
const archivos = import.meta.glob('../../../kb/KB10-*.md', { query: '?raw', import: 'default', eager: true })

const MARKDOWN = Object.values(archivos)[0] || null

export const HAY_TIPS = Boolean(MARKDOWN)

// "1o curso - 2o semestre" -> { curso: 1, semestre: 2 }
function parsearEncabezado(titulo) {
  const curso = titulo.match(/([1-4])\s*[oº]?\s*curso/i)
  const semestre = titulo.match(/([12])\s*[oº]?\s*(?:er|do)?\s*semestre/i)
  if (!curso || !semestre) return null
  return { curso: Number(curso[1]), semestre: Number(semestre[1]) }
}

function parsear(markdown) {
  if (!markdown) return []
  const secciones = []
  let seccionActual = null
  let materiaActual = null

  for (const linea of markdown.split('\n')) {
    if (linea.startsWith('## ')) {
      const meta = parsearEncabezado(linea.slice(3).trim())
      // Secciones que no son "curso - semestre" (ej. "Notas de uso para el agente") se ignoran:
      // son instrucciones para Maite, no contenido para Carmen.
      seccionActual = meta ? { ...meta, materias: [] } : null
      if (seccionActual) secciones.push(seccionActual)
      materiaActual = null
    } else if (linea.startsWith('### ') && seccionActual) {
      materiaActual = { materia: linea.slice(4).trim(), tip: '' }
      seccionActual.materias.push(materiaActual)
    } else if (materiaActual && linea.trim()) {
      materiaActual.tip += (materiaActual.tip ? '\n' : '') + linea.trim()
    }
  }

  return secciones.sort((a, b) => a.curso - b.curso || a.semestre - b.semestre)
}

export const TIPS_POR_SEMESTRE = parsear(MARKDOWN)

// Semestre en curso, para abrirlo por defecto: en la UNAV el 1er semestre va de septiembre a
// diciembre y el 2º de enero a junio. Carmen entra a 1º en el curso 2026-2027.
export function semestreActual(fecha = new Date()) {
  const mes = fecha.getMonth() // 0 = enero
  return mes >= 6 ? 1 : 2 // jul-dic => 1er semestre; ene-jun => 2º
}
