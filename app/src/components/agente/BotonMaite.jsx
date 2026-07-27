import { useApp } from '../../context/AppContext.jsx'

/**
 * Botón para llamar a Maite desde cualquier pantalla.
 *
 * El widget ya no flota sobre toda la app: vive solo en su pantalla. Así que "hablar con Maite"
 * pasa a ser navegar hasta ahí, y este botón hace las dos cosas a la vez — deja el contexto
 * preparado y lleva a la pantalla.
 *
 * El contexto es lo que hace que la conversación arranque sabiendo de qué va: si Carmen viene de
 * unos apuntes de Geometrías, Maite ya sabe que el quiz es de eso y no tiene que preguntárselo.
 * Sin esto, cada botón sería lo mismo que tocar la pestaña de Maite a secas.
 */
export default function BotonMaite({ contexto, children, onNavigate, variante = 'principal', className = '' }) {
  const { setContextoAgente } = useApp()

  function ir() {
    setContextoAgente(contexto || null)
    onNavigate?.('agente')
  }

  const estilos = {
    principal:
      'rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-3 text-sm font-semibold text-white shadow-glow active:scale-[0.98]',
    suave: 'rounded-full bg-lavanda-50 px-4 py-2.5 text-sm font-semibold text-lavanda-800 active:scale-[0.98]',
    // Para fondos oscuros (la tarjeta morada de la ruta, el modo emergencia).
    claro: 'rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]'
  }

  return (
    <button onClick={ir} className={`${estilos[variante] || estilos.principal} ${className}`}>
      {children || '💬 Hablar con Maite'}
    </button>
  )
}
