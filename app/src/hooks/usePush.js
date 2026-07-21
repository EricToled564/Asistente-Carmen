import { useState } from 'react'
import { api } from '../lib/api.js'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePush(vapidPublicKey, grupo = 'ella') {
  const [estado, setEstado] = useState('idle') // idle | pidiendo | suscrito | error | no-soportado

  async function suscribir() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('no-soportado')
      return
    }
    if (!vapidPublicKey) {
      setEstado('error')
      console.error('Falta VITE_VAPID_PUBLIC_KEY para activar push')
      return
    }
    setEstado('pidiendo')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setEstado('error')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })
      await api.pushSubscribe({ subscription, grupo })
      setEstado('suscrito')
    } catch (err) {
      console.error(err)
      setEstado('error')
    }
  }

  return { estado, suscribir }
}
