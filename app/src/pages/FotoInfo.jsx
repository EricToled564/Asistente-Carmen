import FotoCapture from '../components/foto/FotoCapture.jsx'

export default function FotoInfo({ onClose }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 p-5 pb-2">
        <button onClick={onClose} className="text-2xl leading-none text-lavanda-700" aria-label="Volver">
          ←
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-lavanda-800">Foto → info</h1>
          <p className="text-sm text-morado-900/60">Sube una foto y Maite te explica qué dice o qué significa.</p>
        </div>
      </header>
      <FotoCapture />
    </div>
  )
}
