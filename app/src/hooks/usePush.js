import { useState } from 'react'
import { api } from '../lib/api.js'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// Activar notificaciones puede fallar por cuatro razones muy distintas, y antes las cuatro
// devolvían el mismo 'error' con el mismo mensaje ("si rechazaste el permiso…"). Eso manda a la
// persona a revisar los permisos del teléfono aunque el problema fuera del servidor, y deja sin
// forma de saber qué pasó de verdad — el detalle solo quedaba en la consola del navegador, que
// nadie va a abrir en un móvil.
//
// Cada causa necesita una acción distinta, así que cada una tiene su estado:
//   sin-permiso        el usuario denegó, o Chrome bloqueó el aviso sin enseñarlo
//   fallo-suscripcion  el navegador no pudo registrarse contra el servicio de push
//   fallo-servidor     todo bien en el móvil, pero no se pudo guardar la suscripción
//   sin-clave          falta la clave VAPID (problema nuestro, no suyo)
export function usePush(vapidPublicKey, grupo = 'ella') {
  const [estado, setEstado] = useState('idle')
  const [detalle, setDetalle] = useState('')

  async function suscribir() {
    setDetalle('')
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('no-soportado')
      return
    }
    if (!vapidPublicKey) {
      setEstado('sin-clave')
      return
    }

    setEstado('pidiendo')

    let permission
    try {
      permission = await Notification.requestPermission()
    } catch (err) {
      setEstado('sin-permiso')
      setDetalle(String(err?.message || err))
      return
    }
    if (permission !== 'granted') {
      setEstado('sin-permiso')
      // "default" en vez de "denied" significa que el aviso ni se llegó a mostrar: Chrome lo
      // silencia en sitios con poca interacción. La solución es distinta a la de un rechazo.
      setDetalle(permission === 'default' ? 'El aviso no llegó a aparecer.' : 'Permiso denegado.')
      return
    }

    let subscription
    try {
      const registration = await navigator.serviceWorker.ready
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })
    } catch (err) {
      setEstado('fallo-suscripcion')
      setDetalle(String(err?.message || err))
      return
    }

    try {
      await api.pushSubscribe({ subscription, grupo })
      setEstado('suscrito')
    } catch (err) {
      setEstado('fallo-servidor')
      setDetalle(String(err?.message || err))
    }
  }

  return { estado, detalle, suscribir }
}
