import { useState } from 'react'
import { api } from '../../lib/api.js'
import { ATAJOS, HAY_ENLACES_DE_INSTALACION, urlEjecutar } from '../../data/atajos.js'
import { TODAS_LAS_MATERIAS } from '../../data/indiceAcademico.js'

// Los botones de "grabar clase con dos taps", vía el esquema `shortcuts://` de iOS.
//
// Esto salió mal en el mundo real y conviene dejar escrito por qué, porque el fallo no estaba en
// el código: estaba en ofrecer un botón que no puede funcionar sin un paso que nadie hizo.
//
// La app NO puede crear el Atajo. iOS no expone ninguna API para eso —ni para crearlo, ni siquiera
// para preguntar cuáles tienes— y es deliberado: si la hubiera, cualquier web podría meterte
// automatizaciones en el teléfono. Lo único que se puede hacer desde aquí es pedirle a iOS que
// EJECUTE uno por su nombre, y si no existe, iOS enseña su propio error ("el archivo de atajo no
// existe") que esta app ni ve ni puede prevenir.
//
// Lo que sí se puede: un enlace de iCloud que lo instala de un toque. Alguien tiene que
// construirlo una vez en un iPhone de verdad; a partir de ahí es un botón. Ver data/atajos.js.
export default function BotonesAtajos() {
  const [abierto, setAbierto] = useState(!HAY_ENLACES_DE_INSTALACION)
  const [menuMaterias, setMenuMaterias] = useState(false)
  const [materiaKb, setMateriaKb] = useState('') // '' = nada elegido, 'otras' = tema libre
  const [temaLibre, setTemaLibre] = useState('')
  const [avisoError, setAvisoError] = useState(null)

  const materiaDeLista = TODAS_LAS_MATERIAS.find((m) => m.kbCode === materiaKb)
  // Esto es justo lo que faltaba: sin elegir materia ANTES de grabar, todo lo grabado por Atajo
  // caía en el mismo cajón "Sin clasificar" en Mis apuntes, porque el Atajo no tiene pantalla donde
  // Carmen pueda revisar ni elegir nada después. Eligiendo aquí, el nombre viaja como entrada del
  // propio Atajo y sale ya clasificado.
  const textoParaAtajo = materiaKb === 'otras' ? temaLibre.trim() : materiaDeLista?.titulo || ''
  const listoParaGrabar = Boolean(textoParaAtajo)

  function elegir(kb) {
    setMateriaKb(kb)
    if (kb !== 'otras') setMenuMaterias(false)
  }

  // La materia viaja por DOS caminos a la vez, y con uno que llegue basta:
  //   1. Se aparca en el servidor por HTTP (mismo mecanismo que el resto de la app).
  //   2. Va también como Entrada de atajo en la URL shortcuts://, que es lo elegante… y lo que
  //      llegó vacío en el teléfono real, por eso no puede ser el único camino.
  //
  // El Atajo se abre EN EL MISMO INSTANTE del toque, no después de esperar al servidor. La
  // primera versión hacía `await` del aviso y luego navegaba, y iOS puede bloquear en silencio un
  // enlace shortcuts:// que no ocurra inmediatamente con el gesto del usuario — el aviso llegaba
  // (se vio en el servidor) pero el Atajo podía no abrirse. El aviso ahora viaja en paralelo con
  // `keepalive`, que le pide al navegador completarlo aunque la página pase a segundo plano al
  // abrirse la app de Atajos.
  function lanzarAtajo() {
    setAvisoError(null)
    fetch(`${import.meta.env?.VITE_WORKER_URL || 'https://asistentecarmen.erictoled564.workers.dev'}/audio/proxima-materia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materia: textoParaAtajo }),
      keepalive: true
    }).catch(() => {
      setAvisoError('No pude avisarle al servidor de qué materia es (¿sin conexión?). La grabación vale igual, pero puede salir sin materia.')
    })
    window.location.href = urlEjecutar(ATAJOS.grabar.nombre, textoParaAtajo)
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Grabar clase con 2 taps</p>

      {HAY_ENLACES_DE_INSTALACION ? (
        <p className="rounded-xl bg-lavanda-50 p-2.5 text-xs leading-relaxed text-morado-900">
          <span className="font-semibold">Instálalo una vez</span> con este botón y ya no vuelves a
          tocarlo. Si al grabar te sale <span className="italic">"el archivo de atajo no existe"</span>,
          es que falta.
        </p>
      ) : (
        <p className="rounded-xl bg-melocoton-300/50 p-2.5 text-xs leading-relaxed text-morado-900">
          <span className="font-semibold">Hay que crearlo a mano una vez.</span> Es un Atajo de iPhone
          que no viene puesto, y la app no puede instalártelo: iOS no deja que una web cree Atajos, ni
          siquiera saber cuáles tienes. Si tocas el botón sin haberlo creado, iOS te dirá{' '}
          <span className="italic">"el archivo de atajo no existe"</span> — no es un fallo de la app,
          es que falta.
        </p>
      )}

      {HAY_ENLACES_DE_INSTALACION && (
        <a
          href={ATAJOS.grabar.instalarUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-lavanda-300 bg-lavanda-50 py-2 text-center text-xs font-semibold text-lavanda-800"
        >
          ⬇️ Instalar “Grabar clase”
        </a>
      )}

      {/* El menú colapsable: hay que elegir de qué es la clase ANTES de grabar, porque el Atajo no
          tiene forma de preguntarlo después. */}
      <div className="mt-1">
        <button
          onClick={() => setMenuMaterias((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-lavanda-200 bg-lavanda-50/60 px-3 py-2.5 text-left text-sm"
        >
          <span className={listoParaGrabar ? 'font-medium text-morado-900' : 'text-morado-900/50'}>
            {listoParaGrabar ? `📎 ${textoParaAtajo}` : '¿De qué clase es? — toca para elegir'}
          </span>
          <span className="text-lavanda-700">{menuMaterias ? '▲' : '▼'}</span>
        </button>

        {menuMaterias && (
          <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-lavanda-100 bg-white p-1.5">
            {TODAS_LAS_MATERIAS.map((m) => (
              <button
                key={`${m.kbCode}-${m.titulo}`}
                onClick={() => elegir(m.kbCode)}
                className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                  materiaKb === m.kbCode ? 'bg-lavanda-100 font-semibold text-lavanda-800' : 'text-morado-900'
                }`}
              >
                {m.titulo} <span className="text-morado-900/40">({m.curso}º)</span>
              </button>
            ))}
            <button
              onClick={() => elegir('otras')}
              className={`mt-1 block w-full rounded-lg border-t border-lavanda-100 px-2.5 py-2 text-left text-xs ${
                materiaKb === 'otras' ? 'bg-lavanda-100 font-semibold text-lavanda-800' : 'text-morado-900'
              }`}
            >
              Otras…
            </button>
          </div>
        )}

        {materiaKb === 'otras' && (
          <input
            value={temaLibre}
            onChange={(e) => setTemaLibre(e.target.value)}
            placeholder="¿Sobre qué es? (nombre libre)"
            className="mt-1.5 w-full rounded-xl border border-lavanda-200 px-3 py-2 text-sm"
          />
        )}
      </div>

      <div className="mt-1">
        {listoParaGrabar ? (
          <button
            onClick={lanzarAtajo}
            className="block w-full rounded-xl bg-lavanda-700 py-2.5 text-center text-sm font-semibold text-white"
          >
            ▶️ Grabar clase
          </button>
        ) : (
          <button
            disabled
            className="block w-full rounded-xl bg-lavanda-700/40 py-2.5 text-center text-sm font-semibold text-white"
          >
            ▶️ Elige primero de qué clase es ↑
          </button>
        )}
        {avisoError && <p className="mt-1.5 text-xs text-red-700">{avisoError}</p>}
      </div>

      {/* Fuera del acordeón a propósito: es lo que más tranquiliza y lo que menos se debe esconder
          detrás de un "ver más". Si el Atajo no va, no pasa nada. */}
      <p className="text-xs leading-relaxed text-morado-900/55">
        No hace falta el Atajo: el botón del micrófono en Académico → Captura graba desde la propia
        app y sube el audio igual, con su propia pantalla para elegir materia y revisar antes de
        guardar.
      </p>

      <button
        onClick={() => setAbierto((x) => !x)}
        className="mt-1 text-left text-xs font-semibold text-lavanda-700 underline decoration-dotted"
      >
        {abierto ? 'Ocultar cómo se crea' : 'Cómo se crea a mano (5 minutos, una sola vez)'}
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
              Añádele la acción <span className="font-semibold">Grabar audio</span>. Al ejecutar el
              Atajo, esta acción se queda en pantalla grabando — no hace falta un segundo Atajo para
              parar: se para tocando "Listo" ahí mismo, y el propio Atajo sigue solo al siguiente paso.
            </li>
            <li>
              Justo después, añade <span className="font-semibold">Obtener contenido de URL</span>{' '}
              hacia <span className="break-all font-mono">asistentecarmen.erictoled564.workers.dev/audio</span>,
              método <span className="font-semibold">POST</span>, cuerpo <span className="font-semibold">Formulario</span>,
              con dos campos:
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  <span className="font-mono">audio</span> (tipo Archivo) = la salida de "Grabar audio".
                </li>
                <li>
                  <span className="font-mono">materia</span> (tipo Texto) = la variable{' '}
                  <span className="italic">"Entrada de acceso directo"</span> (lo que esta app le manda al
                  ejecutar el Atajo) — no un texto fijo. Así cada clase queda guardada con la materia que
                  elegiste aquí arriba, no siempre como "Sin clasificar".
                </li>
              </ul>
            </li>
            <li>
              Tócale a <span className="font-semibold">Compartir</span> y guarda el enlace de iCloud:
              pegándolo en la app, este botón se convierte en un simple "Instalar" y nadie más tiene que
              repetir estos pasos.
            </li>
          </ol>
          <p className="mt-2.5 rounded-lg bg-white p-2">
            <span className="font-semibold">Si algo de esto se atasca, déjalo.</span> Es un atajo para
            ahorrarte toques, no la forma de grabar. El micrófono de Académico → Captura graba desde la
            propia app y sube el audio igual.
          </p>
        </div>
      )}
    </div>
  )
}
