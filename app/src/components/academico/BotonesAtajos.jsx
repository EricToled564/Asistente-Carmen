// Dispara Atajos de iOS vía el esquema shortcuts://. No se programa lógica aquí —
// el Atajo en sí (grabar/detener + subir audio) se crea en la app Atajos del iPhone.
// Ver /docs/atajos-ios.md para las instrucciones completas y el fallback si el link no abre nada
// (p.ej. si el Atajo con ese nombre exacto no existe todavía en su teléfono).
export default function BotonesAtajos() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-terracota-700">Grabar clase con 2 taps</p>
      <p className="text-xs text-noche-900/50">
        Requiere crear los Atajos "GrabarClase" y "TerminarClase" una vez en la app Atajos del iPhone.
        Instrucciones en Ajustes → Ayuda.
      </p>
      <div className="flex gap-2">
        <a
          href="shortcuts://run-shortcut?name=GrabarClase"
          className="flex-1 rounded-xl bg-terracota-600 py-2.5 text-center text-sm font-semibold text-white"
        >
          ▶️ Grabar clase
        </a>
        <a
          href="shortcuts://run-shortcut?name=TerminarClase"
          className="flex-1 rounded-xl bg-noche-900 py-2.5 text-center text-sm font-semibold text-white"
        >
          ⏹️ Terminar clase
        </a>
      </div>
    </div>
  )
}
