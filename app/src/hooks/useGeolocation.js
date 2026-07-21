export function getCurrentPosition(timeout = 10000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, reason: 'unsupported' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ ok: false, reason: 'denied' }),
      { timeout, maximumAge: 30000 }
    )
  })
}

// La Battery Status API no existe en iOS Safari — se degrada a "desconocida" en vez de fallar.
export async function getBatteryLevel() {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery()
      return Math.round(battery.level * 100)
    }
  } catch {
    // ignorar, cae al valor por defecto
  }
  return null
}
