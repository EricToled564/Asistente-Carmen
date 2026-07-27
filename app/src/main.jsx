import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './index.css'

// Un service worker nuevo (con skipWaiting+clients.claim en sw.js) toma control en segundo
// plano en cuanto se instala — pero sin esto, la pestaña ya abierta se queda viendo el HTML/JS
// con el que cargó originalmente hasta que alguien la recarga a mano. Con este listener, en
// cuanto el nuevo SW toma control se recarga la página sola: así el próximo build desplegado
// siempre se ve reflejado, no solo "la siguiente vez que abras la app desde cero".
if ('serviceWorker' in navigator) {
  let recargando = false
  // ¿Había YA un service worker controlando esta página al cargar?
  //
  // Esto decide si la recarga automática es correcta o destructiva, y la diferencia importa:
  //
  // - Si SÍ lo había, un `controllerchange` significa que se desplegó una versión nueva y tomó el
  //   control. Recargar es lo que queremos: la pestaña pasa a ver el código nuevo.
  //
  // - Si NO lo había (primera visita de este navegador), el service worker se instala, hace
  //   clients.claim() y dispara `controllerchange` a los pocos segundos de abrir. Recargar ahí no
  //   aporta nada —el código ya es el último, acaba de descargarse— y en cambio TUMBA lo que la
  //   persona estuviera haciendo en esos segundos.
  //
  // Ese segundo caso es el que rompió las notificaciones del hermano de Eric: abrió el link por
  // primera vez, tocó "Activar las alertas", aceptó el permiso, y a mitad del registro la página
  // se recargó sola. La suscripción quedó abortada y la pantalla mostró un error genérico que
  // culpaba al permiso — cuando el permiso lo había dado bien.
  const habiaControlador = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControlador) return // primera instalación: no hay nada viejo que refrescar
    if (recargando) return
    recargando = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registro) => {
        // Revisa si hay una versión nueva del SW cada vez que la app vuelve a primer plano
        // (abrir el ícono de nuevo, cambiar de app y regresar) — sin esto, el navegador solo
        // revisa por su cuenta cada tanto, no cuando de verdad importa (justo al reabrir).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registro.update()
        })
      })
      .catch((err) => {
        console.warn('SW registration failed', err)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
