import { cuandoSeGuardo } from '../../lib/cacheApi.js'

// "Esto es lo último que guardé."
//
// Va con cada pantalla que sobrevive sin red enseñando la copia guardada. La franja no es un
// adorno: enseñar unas notas o unas fechas de entrega viejas SIN decir que son viejas es peor que
// no enseñar nada — es la clase de error por el que se pierde una entrega creyendo que faltaban
// tres días. Se dice qué se está viendo y de cuándo es, siempre.
export default function AvisoSinConexion({ desde }) {
  if (!desde) return null
  return (
    <p className="rounded-xl bg-melocoton-300/60 p-2.5 text-xs leading-relaxed text-morado-900">
      Sin conexión ahora mismo. Esto es lo último que guardé, de{' '}
      <span className="font-semibold">{cuandoSeGuardo(desde)}</span> — puede haber cambiado.
    </p>
  )
}
