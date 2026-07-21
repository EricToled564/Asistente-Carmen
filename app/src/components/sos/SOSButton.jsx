import { useEffect, useRef, useState } from 'react'

const COUNTDOWN_S = 5

export default function SOSButton({ onDisparar }) {
  const [contando, setContando] = useState(false)
  const [restante, setRestante] = useState(COUNTDOWN_S)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function iniciar() {
    setContando(true)
    setRestante(COUNTDOWN_S)
    intervalRef.current = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setContando(false)
          onDisparar()
          return COUNTDOWN_S
        }
        return r - 1
      })
    }, 1000)
  }

  function cancelar() {
    clearInterval(intervalRef.current)
    setContando(false)
    setRestante(COUNTDOWN_S)
  }

  if (contando) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-40 w-40 items-center justify-center rounded-full bg-red-600 text-6xl font-bold text-white shadow-soft">
          {restante}
        </div>
        <p className="text-sm text-noche-900/60">Enviando SOS en {restante}…</p>
        <button onClick={cancelar} className="rounded-full bg-noche-900/10 px-6 py-2.5 text-sm font-semibold">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={iniciar}
      className="flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-full bg-terracota-600 text-white shadow-soft active:scale-95"
    >
      <span className="text-4xl">🆘</span>
      <span className="text-lg font-bold">SOS</span>
    </button>
  )
}
