// Tips académicos, leídos de kb/KB10-tips-academicos.md — la MISMA fuente que consulta Maite,
// nunca una copia. Si el documento se edita, la pantalla se actualiza sola en el próximo build.
//
// Formato real del documento (importante): agrupa por CURSO, y dentro por bloque de materias.
//   ## 1o CURSO
//   ### Art Culture of the Last Century
//   tip...
//   ### Comprehensive Lab I / Design Studio I     <- un bloque puede cubrir varias materias
//   tip...
//
// La especificación original pedía navegar curso → semestre → materia, pero KB10 no distingue
// semestres: sus bloques a veces cruzan ambos (ej. "Antropologia I y II", "Etica I y II"). Se
// respeta la estructura del documento en vez de inventar una división por semestre que la fuente
// no tiene — si algún día KB10 se reorganiza por semestre, este parser se ajusta.
const archivos = import.meta.glob('../../../kb/KB10-*.md', { query: '?raw', import: 'default', eager: true })

const MARKDOWN = Object.values(archivos)[0] || null

export const HAY_TIPS = Boolean(MARKDOWN)

function parsear(markdown) {
  if (!markdown) return []
  const cursos = []
  let cursoActual = null
  let bloqueActual = null

  for (const linea of markdown.split('\n')) {
    if (linea.startsWith('## ')) {
      const titulo = linea.slice(3).trim()
      const num = titulo.match(/([1-4])\s*[oº]?\s*CURSO/i)
      if (num) {
        cursoActual = { curso: Number(num[1]), titulo, bloques: [] }
        cursos.push(cursoActual)
      } else {
        cursoActual = null // "Notas de uso para el agente" y demás: no es contenido para Carmen
      }
      bloqueActual = null
    } else if (linea.startsWith('### ') && cursoActual) {
      bloqueActual = { materia: linea.slice(4).trim(), tip: '' }
      cursoActual.bloques.push(bloqueActual)
    } else if (bloqueActual && linea.trim()) {
      bloqueActual.tip += (bloqueActual.tip ? '\n' : '') + linea.trim()
    }
  }

  return cursos.sort((a, b) => a.curso - b.curso)
}

export const TIPS_POR_CURSO = parsear(MARKDOWN)
