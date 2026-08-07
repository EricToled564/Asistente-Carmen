import escudoUnav from '../../assets/escudo-unav.png'

// Pantalla de bienvenida: el escudo de la Universidad de Navarra, a pantalla completa. Aparece al
// abrir la app —cada vez, no solo la primera— y toca el escudo para entrar a la app de verdad.
//
// Vive en un estado local de App.jsx, no en localStorage: es una portada de apertura, como la de
// un libro, no un paso de configuración que haya que marcar como "hecho" para siempre. Si viviera
// en localStorage, Carmen la vería una vez en su vida y luego nunca más — que es justo lo
// contrario de "pantalla de inicio".
export default function Splash({ onEntrar }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-lavanda-glow px-4 text-center safe-top">
      <button
        type="button"
        onClick={onEntrar}
        aria-label="Entrar a la app"
        className="flex flex-col items-center gap-6 transition-transform active:scale-95"
      >
        {/* 3 veces el tamaño que tenía (192px -> 576px), con tope en el 85% del ancho de pantalla
            para que no se salga en un teléfono angosto: 576px no cabe entero en ~390px de ancho. */}
        <img
          src={escudoUnav}
          alt="Escudo de la Universidad de Navarra"
          className="h-[85vw] w-[85vw] max-h-[576px] max-w-[576px] drop-shadow-xl"
          draggable={false}
        />
        <div>
          <p className="font-display text-2xl font-bold text-lavanda-800">Maite</p>
          <p className="mt-1 text-sm text-morado-900/60">Tu companion en Pamplona</p>
        </div>
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-morado-900/40">
        Toca el escudo para entrar
      </p>
    </div>
  )
}
