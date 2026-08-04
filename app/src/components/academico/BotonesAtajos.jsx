import { useState } from 'react'
import { ATAJOS, HAY_ENLACES_DE_INSTALACION, urlEjecutar } from '../../data/atajos.js'

// Los botones de "grabar clase con dos taps", vía el esquema `shortcuts://` de iOS.
//
// Esto salió mal en el mundo real y conviene dejar escrito por qué, porque el fallo no estaba en
// el código: estaba en ofrecer un botón que no puede funcionar sin un paso que nadie hizo.
//
// La app NO puede crear los Atajos. iOS no expone ninguna API para eso —ni para crearlos, ni
// siquiera para preguntar cuáles tienes— y es deliberado: si la hubiera, cualquier web podría
// meterte automatizaciones en el teléfono. Lo único que se puede hacer desde aquí es pedirle a iOS
// que EJECUTE uno por su nombre, y si no existe, iOS enseña su propio error ("el archivo de atajo
// no existe") que esta app ni ve ni puede prevenir.
//
// Lo que sí se puede: un enlace de iCloud que los instala de un toque. Alguien tiene que
// construirlos una vez en un iPhone de verdad; a partir de ahí es un botón. Ver data/atajos.js.
//
// Antes esta tarjeta eran dos botones grandes y una línea gris diciendo "instrucciones en Ajustes
// → Ayuda". Resultado predecible: tocas, sale un error del sistema que parece un fallo de la app,
// y las instrucciones estaban en otra pestaña. Ahora se dice ANTES de tocar nada, las
// instrucciones están aquí mismo, y lo primero es que grabar desde la propia app funciona sin nada
// de esto. Los Atajos son un atajo, no el camino.
export default function BotonesAtajos() {
  // Abierto de entrada, no detrás de un toggle. Antes se pedía a Carmen que tocara "Cómo se crean
  // a mano" para verlas, y eso es exactamente lo mismo que no explicarlo "por ningún lado": si el
  // primer intento con los botones falla con el error de iOS, lo que necesita está un toque más
  // allá y en un tono que no invita a buscarlo.
  const [abierto, setAbierto] = useState(!HAY_ENLACES_DE_INSTALACION)

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Grabar clase con 2 taps</p>

      {HAY_ENLACES_DE_INSTALACION ? (
        <>
          <p className="rounded-xl bg-lavanda-50 p-2.5 text-xs leading-relaxed text-morado-900">
            <span className="font-semibold">Instálalos una vez</span> con estos dos botones y ya no
            vuelves a tocarlos. Si al grabar te sale <span className="italic">"el archivo de atajo no
            existe"</span>, es que falta alguno.
          </p>
          <div className="flex gap-2">
            <a
              href={ATAJOS.grabar.instalarUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-lavanda-300 bg-lavanda-50 py-2 text-center text-xs font-semibold text-lavanda-800"
            >
              ⬇️ Instalar “Grabar”
            </a>
            <a
              href={ATAJOS.terminar.instalarUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-lavanda-300 bg-lavanda-50 py-2 text-center text-xs font-semibold text-lavanda-800"
            >
              ⬇️ Instalar “Terminar”
            </a>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-melocoton-300/50 p-2.5 text-xs leading-relaxed text-morado-900">
          <span className="font-semibold">Hay que crearlos a mano una vez.</span> Son dos Atajos de
          iPhone que no vienen puestos, y la app no puede instalártelos: iOS no deja que una web cree
          Atajos, ni siquiera saber cuáles tienes. Si tocas los botones sin haberlos creado, iOS te
          dirá <span className="italic">"el archivo de atajo no existe"</span> — no es un fallo de la
          app, es que faltan.
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <a
          href={urlEjecutar(ATAJOS.grabar.nombre)}
          className="flex-1 rounded-xl bg-lavanda-700 py-2.5 text-center text-sm font-semibold text-white"
        >
          ▶️ Grabar clase
        </a>
        <a
          href={urlEjecutar(ATAJOS.terminar.nombre)}
          className="flex-1 rounded-xl bg-morado-900 py-2.5 text-center text-sm font-semibold text-white"
        >
          ⏹️ Terminar clase
        </a>
      </div>

      {/* Fuera del acordeón a propósito: es lo que más tranquiliza y lo que menos se debe esconder
          detrás de un "ver más". Si los Atajos no van, no pasa nada. */}
      <p className="text-xs leading-relaxed text-morado-900/55">
        No hacen falta: el botón del micrófono de arriba graba desde la propia app y sube el audio
        igual. Los Atajos solo ahorran toques.
      </p>

      <button
        onClick={() => setAbierto((x) => !x)}
        className="mt-1 text-left text-xs font-semibold text-lavanda-700 underline decoration-dotted"
      >
        {abierto ? 'Ocultar cómo se crean' : 'Cómo se crean a mano (5 minutos, una sola vez)'}
      </button>

      {abierto && (
        <div className="rounded-xl bg-crema-100 p-3 text-xs leading-relaxed text-morado-900/80">
          <p className="font-semibold text-morado-900">En la app Atajos del iPhone (la del icono azul):</p>
          <ol className="mt-1.5 list-decimal space-y-1.5 pl-4">
            <li>
              Toca <span className="font-semibold">+</span> arriba a la derecha y llama al atajo{' '}
              <span className="rounded bg-white px-1 font-mono font-semibold">{ATAJOS.grabar.nombre}</span>.
              Tiene que escribirse exactamente así: junto, con las mayúsculas donde están y sin acentos.
              Si cambia una letra, el botón no lo encuentra.
            </li>
            <li>
              Añádele la acción <span className="font-semibold">Grabar audio</span>. Si tu iOS no la tiene,
              vale con <span className="font-semibold">Abrir app → Notas de Voz</span>: es un toque más y ya.
            </li>
            <li>
              Crea otro llamado{' '}
              <span className="rounded bg-white px-1 font-mono font-semibold">{ATAJOS.terminar.nombre}</span>{' '}
              que pare la grabación, coja la última nota de voz y la mande con{' '}
              <span className="font-semibold">Obtener contenido de URL</span> a{' '}
              <span className="break-all font-mono">asistentecarmen.erictoled564.workers.dev/audio</span> por{' '}
              <span className="font-semibold">POST</span>, en un campo de formulario llamado{' '}
              <span className="font-mono">audio</span>.
            </li>
            <li>
              Cuando estén los dos, tócale a <span className="font-semibold">Compartir</span> en cada uno y
              guarda los dos enlaces de iCloud: pegándolos en la app, esto se convierte en un botón de
              instalar y nadie más tiene que repetir estos pasos.
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
