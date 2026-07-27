// Detección de "¿está la app instalada en la pantalla de inicio?".
//
// Vive aquí y no dentro del onboarding porque ahora la necesitan dos sitios: el paso de instalación
// del onboarding y la sección de Ayuda ("no me llegan las notificaciones"). Duplicarla llevaría a
// que una de las dos se quedara desfasada, y justo esta comprobación es la que decide si a Carmen
// se le explica cómo instalar o se le dice que ya está.

export function estaInstalada() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari en iOS no soporta display-mode: standalone; usa esta propiedad suya.
    window.navigator.standalone === true
  )
}

export function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '')
}
