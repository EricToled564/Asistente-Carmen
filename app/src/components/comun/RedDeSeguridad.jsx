import { Component } from 'react'

// La red debajo de cada pantalla.
//
// Hasta hoy no había ninguna, y eso significa una cosa concreta: **un solo error de render en
// cualquier componente dejaba la app entera en blanco.** No la pantalla — la app. Sin barra de
// pestañas, sin forma de volver, sin nada. Carmen, con el móvil en la mano en Pamplona, vería un
// rectángulo blanco y no tendría manera de saber si se rompió, si es su cobertura, o si tiene que
// borrarla y volver a instalarla.
//
// Y no es hipotético. Se encontró exactamente ese fallo probando el diagnóstico: si el servidor
// devolvía la lista de trámites SIN su resumen, `resumen.hechos` reventaba y se llevaba por
// delante toda la aplicación. Ese caso concreto ya está arreglado, pero el que importa es el
// siguiente, el que todavía no conocemos.
//
// Va por pantalla y no solo en la raíz: si revienta Académico, la barra de abajo sobrevive y ella
// puede irse a Maite o al SOS. Envolver únicamente la raíz habría cambiado un rectángulo blanco
// por un cartel de error igual de inútil, porque tampoco se podría salir de él.
//
// Se enseña el mensaje técnico a propósito. Ella no va a entenderlo, pero puede hacerle una foto y
// mandársela a Eric, y esa foto es la diferencia entre arreglarlo en diez minutos y pasarse una
// semana preguntándole "¿pero qué te salía exactamente?".
export default class RedDeSeguridad extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // A la consola además del estado: si alguien tiene el móvil conectado al Mac, aquí está la
    // pila entera, que es más de lo que cabe en pantalla.
    console.error('[Maite] se rompió una pantalla:', error, info?.componentStack)
  }

  // Cambiar de pestaña tiene que limpiar el error. Sin esto, una pantalla rota se queda rota para
  // siempre dentro de esa sesión aunque el problema fuera pasajero.
  componentDidUpdate(prevProps) {
    if (prevProps.clave !== this.props.clave && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex flex-col gap-3 p-5">
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <p className="font-display text-lg font-bold text-morado-900">Esta pantalla se rompió</p>
          <p className="mt-1.5 text-sm leading-relaxed text-morado-900/70">
            No es culpa tuya y no has perdido nada. Las demás pestañas siguen funcionando: puedes
            seguir usando el mapa, hablar con Maite o abrir el SOS con los botones de abajo.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 w-full rounded-xl bg-lavanda-700 py-3 text-sm font-semibold text-white"
          >
            Volver a intentarlo
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 w-full rounded-xl bg-crema-100 py-3 text-sm font-semibold text-morado-900"
          >
            Recargar la app entera
          </button>
        </div>

        <div className="rounded-2xl bg-crema-100 p-4">
          <p className="text-xs font-semibold text-morado-900">Para Eric</p>
          <p className="mt-1 text-xs leading-relaxed text-morado-900/70">
            Hazle una foto a esto y mándasela. Con este texto sabe exactamente qué mirar.
          </p>
          <p className="mt-2 break-words rounded-xl bg-white p-2.5 font-mono text-[11px] leading-relaxed text-red-800">
            {String(this.state.error?.message || this.state.error)}
          </p>
        </div>
      </div>
    )
  }
}
