// Contenido real de cada guía docente (temario, evaluación, etc.), leído directo de los
// documentos del KB (misma fuente que usa Maite) — NO es una copia mantenida a mano: es un
// import de los archivos reales de /kb, así que si se actualiza un KB9-x.md, este contenido se
// actualiza solo en el próximo build, sin tocar código.
//
// Por qué esto vive aquí y no solo en la conversación con Maite: la información de una guía
// docente (temario, evaluación) es FIJA — ya está determinada, no cambia según la pregunta. El
// papel de Maite como tutora es ayudar con explicaciones y quizzes sobre ese contenido, no
// recitar de memoria algo que ya se puede leer directo en la pantalla.
const modulos = import.meta.glob('../../../kb/KB9-*.md', { query: '?raw', import: 'default', eager: true })

// Extrae "KB9-12" de una ruta tipo ".../kb/KB9-12-lab-integracion-iii.md"
function kbCodeDeRuta(ruta) {
  const m = ruta.match(/KB9-(\d+)-/)
  return m ? `KB9-${m[1]}` : null
}

const CONTENIDO_POR_CODIGO = {}
for (const [ruta, texto] of Object.entries(modulos)) {
  const codigo = kbCodeDeRuta(ruta)
  if (codigo) CONTENIDO_POR_CODIGO[codigo] = texto
}

// Parseo simple de markdown a secciones {titulo, cuerpo} — el formato de los KB9 es consistente
// (encabezados ## seguidos de párrafo). "Notas de uso para el agente" se omite: es una nota
// dirigida a Maite, no información para que Carmen lea.
function parsearSecciones(markdown) {
  const lineas = markdown.split('\n')
  const secciones = []
  let actual = null
  let metaLinea = ''

  for (const linea of lineas) {
    if (linea.startsWith('## ')) {
      const titulo = linea.slice(3).trim()
      if (titulo.toLowerCase().includes('notas de uso')) {
        actual = null // deja de acumular contenido de aquí en adelante en esta sección
        continue
      }
      actual = { titulo, cuerpo: '' }
      secciones.push(actual)
    } else if (linea.startsWith('# ')) {
      continue // título principal, ya lo mostramos aparte
    } else if (!actual && !secciones.length && linea.trim() && !metaLinea) {
      metaLinea = linea.trim() // línea "Curso/semestre: ... - ECTS: ..."
    } else if (actual) {
      actual.cuerpo += (actual.cuerpo ? ' ' : '') + linea.trim()
    }
  }

  return { metaLinea, secciones: secciones.filter((s) => s.cuerpo.trim()) }
}

export function obtenerContenidoMateria(kbCode) {
  const markdown = CONTENIDO_POR_CODIGO[kbCode]
  if (!markdown) return null
  return parsearSecciones(markdown)
}
