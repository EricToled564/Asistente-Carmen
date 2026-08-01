import { useState } from 'react'

// Los botones de "grabar clase con dos taps", vía el esquema `shortcuts://` de iOS.
//
// Esto salió mal en el mundo real y conviene dejar escrito por qué, porque el fallo no estaba en
// el código: estaba en ofrecer un botón que no puede funcionar sin un paso que nadie hizo.
//
// Los dos Atajos ("GrabarClase" y "TerminarClase") hay que crearlos A MANO, una vez, en la app
// Atajos del iPhone. La PWA no puede grabar con la pantalla bloqueada —limitación de Safari en
// iOS, no algo que se arregle con más código— y por eso esa parte vive fuera.
//
// El problema: **el navegador no tiene forma de saber si esos Atajos existen.** No hay API. Al
// tocar el enlace, iOS abre la app Atajos y, si no lo encuentra, enseña su propio error ("el
// archivo de atajo no existe") que esta app ni ve ni puede prevenir. Antes, esta tarjeta era dos
// botones grandes y una línea gris diciendo "instrucciones en Ajustes → Ayuda". El resultado
// predecible: tocas, sale un error del sistema que parece un fallo de la app, y las instrucciones
// están en otra pestaña.
//
// Así que ahora: se dice ANTES de que lo toque que hace falta instalarlos, las instrucciones están
// aquí mismo, y lo primero de la tarjeta es que grabar desde la propia app funciona sin nada de
// esto. Los Atajos son un atajo, no el camino.
export default function BotonesAtajos() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Grabar clase con 2 taps</p>

      <p className="rounded-xl bg-melocoton-300/50 p-2.5 text-xs leading-relaxed text-morado-900">
        <span className="font-semibold">Hay que instalarlos una vez.</span> Son dos Atajos de iPhone
        que no vienen puestos. Si tocas los botones sin haberlos creado, iOS te dirá{' '}
        <span className="italic">"el archivo de atajo no existe"</span> — no es un fallo de la app, es
        que faltan. Desde aquí no hay manera de saber si los tienes.
      </p>

      <div className="flex gap-2">
        <a
          href="shortcuts://run-shortcut?name=GrabarClase"
          className="flex-1 rounded-xl bg-lavanda-700 py-2.5 text-center text-sm font-semibold text-white"
        >
          ▶️ Grabar clase
        </a>
        <a
          href="shortcuts://run-shortcut?name=TerminarClase"
          className="flex-1 rounded-xl bg-morado-900 py-2.5 text-center text-sm font-semibold text-white"
        >
          ⏹️ Terminar clase
        </a>
      </div>

      <button
        onClick={() => setAbierto((x) => !x)}
        className="mt-1 text-left text-xs font-semibold text-lavanda-700 underline decoration-dotted"
      >
        {abierto ? 'Ocultar cómo se instalan' : 'Cómo se instalan (5 minutos, una sola vez)'}
      </button>

      {abierto && (
        <div className="rounded-xl bg-crema-100 p-3 text-xs leading-relaxed text-morado-900/80">
          <p className="font-semibold text-morado-900">En la app Atajos del iPhone (la del icono azul):</p>
          <ol className="mt-1.5 list-decimal space-y-1.5 pl-4">
            <li>
              Toca <span className="font-semibold">+</span> arriba a la derecha y llama al atajo{' '}
              <span className="rounded bg-white px-1 font-mono font-semibold">GrabarClase</span>. Tiene que
              escribirse exactamente así: junto, con las mayúsculas donde están y sin acentos. Si cambia una
              letra, el botón no lo encuentra.
            </li>
            <li>
              Añádele la acción <span className="font-semibold">Grabar audio</span>. Si tu iOS no la tiene,
              vale con <span className="font-semibold">Abrir app → Notas de Voz</span>: es un toque más y ya.
            </li>
            <li>
              Crea otro llamado{' '}
              <span className="rounded bg-white px-1 font-mono font-semibold">TerminarClase</span> que pare la
              grabación, coja la última nota de voz y la mande con{' '}
              <span className="font-semibold">Obtener contenido de URL</span> a{' '}
              <span className="break-all font-mono">
                asistentecarmen.erictoled564.workers.dev/audio
              </span>{' '}
              por <span className="font-semibold">POST</span>, en un campo de formulario llamado{' '}
              <span className="font-mono">audio</span>.
            </li>
          </ol>
          <p className="mt-2.5 rounded-lg bg-white p-2">
            <span className="font-semibold">Si algo de esto se atasca, déjalo.</span> Es un atajo para
            ahorrarte toques, no la forma de grabar. El botón de arriba de esta pantalla graba desde la
            propia app y sube el audio igual.
          </p>
        </div>
      )}
    </div>
  )
}
