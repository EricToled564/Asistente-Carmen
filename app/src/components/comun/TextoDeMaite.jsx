// Lo que escribe Maite, pintado como se debe leer.
//
// Claude contesta en markdown aunque no se le pida — negritas, viñetas, encabezados. Hasta hoy
// esto se metía en un `<p className="whitespace-pre-wrap">` y salía LITERAL: Carmen veía
// "**Cuándo:** Lunes 14 de septiembre" con los asteriscos puestos, en cada foto que subiera.
//
// Se podría haber intentado prohibirle el markdown en el prompt. No es fiable: los modelos lo
// vuelven a usar en cuanto la respuesta tiene estructura, y una lista de pasos de un trámite
// SIEMPRE tiene estructura. Es más sólido aceptar que va a venir y pintarlo bien.
//
// No se usa una librería de markdown por dos razones: pesa más que toda esta pantalla, y meter
// HTML de un modelo en la página abre la puerta a inyectar cosas. Aquí solo se reconocen cuatro
// formas —negrita, viñeta, numeración y encabezado— y todo lo demás se pinta como texto plano.
// Lo que no se entiende se enseña tal cual; nunca se borra contenido.

// **negrita** partiendo la línea en trozos. Se hace así y no con innerHTML a propósito: el texto
// viene de un modelo y nunca debe interpretarse como HTML.
function conNegritas(linea, clave) {
  const trozos = String(linea).split(/(\*\*[^*]+\*\*)/g)
  return trozos.map((t, i) =>
    /^\*\*[^*]+\*\*$/.test(t) ? (
      <strong key={`${clave}-${i}`} className="font-semibold text-morado-900">
        {t.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${clave}-${i}`}>{t}</span>
    )
  )
}

export default function TextoDeMaite({ texto, className = '' }) {
  if (!texto) return null
  const lineas = String(texto).split('\n')
  const bloques = []
  let lista = null

  const cerrarLista = () => {
    if (lista?.length) {
      bloques.push(
        <ul key={`l${bloques.length}`} className="ml-1 flex list-none flex-col gap-1.5">
          {lista.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lavanda-400" />
              <span>{conNegritas(item, `li${bloques.length}-${i}`)}</span>
            </li>
          ))}
        </ul>
      )
    }
    lista = null
  }

  lineas.forEach((cruda, i) => {
    const linea = cruda.trimEnd()
    const viñeta = linea.match(/^\s*[-*•]\s+(.*)$/)
    const numerada = linea.match(/^\s*\d+[.)]\s+(.*)$/)
    const encabezado = linea.match(/^\s*#{1,6}\s+(.*)$/)

    if (viñeta || numerada) {
      lista = lista || []
      lista.push((viñeta || numerada)[1])
      return
    }
    cerrarLista()

    if (!linea.trim()) return
    if (encabezado) {
      bloques.push(
        <p key={i} className="mt-1 font-semibold text-morado-900">
          {conNegritas(encabezado[1], `h${i}`)}
        </p>
      )
      return
    }
    // Una línea que es SOLO una negrita funciona como título de sección: así la escribe el modelo
    // ("**Lo que necesitas hacer:**") y así se lee mejor.
    if (/^\*\*[^*]+\*\*:?$/.test(linea.trim())) {
      bloques.push(
        <p key={i} className="mt-1 font-semibold text-morado-900">
          {linea.trim().replace(/\*\*/g, '')}
        </p>
      )
      return
    }
    bloques.push(<p key={i}>{conNegritas(linea, `p${i}`)}</p>)
  })
  cerrarLista()

  return <div className={`flex flex-col gap-2 leading-relaxed ${className}`}>{bloques}</div>
}
