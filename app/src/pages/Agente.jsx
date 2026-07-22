import ElevenLabsWidget from '../components/agente/ElevenLabsWidget.jsx'

export default function Agente() {
  return (
    <div className="flex h-full flex-col">
      <header className="p-5 pb-2">
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Habla con Maite</h1>
        <p className="text-sm text-morado-900/60">Tu agente de voz — pregúntale lo que sea de tu día a día en Pamplona.</p>
      </header>
      <div className="flex-1">
        <ElevenLabsWidget />
      </div>
    </div>
  )
}
