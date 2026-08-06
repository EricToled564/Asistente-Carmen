import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { materiasDelSemestre } from '../../data/indiceAcademico.js'
import { marcarProcesando, terminarProceso } from '../../lib/procesoApunte.js'
import TextoDeMaite from '../comun/TextoDeMaite.jsx'

// 90 minutos: una clase entera, no una nota de voz. El tope existe solo como red de seguridad
// (que un olvido no grabe toda la tarde), no como límite de uso. Subir ~1 hora de audio opus son
// ~30-50 MB, dentro de lo que aceptan tanto el Worker como la transcripción.
const MAX_MS = 90 * 60 * 1000

// Solo las del semestre en curso: 5 opciones en vez de 45. Cualquier otra cosa cabe en "Otras".
const MATERIAS = materiasDelSemestre()

// Grabar la clase desde la propia app, con el MISMO número de toques que tenía el flujo con el
// Atajo de iOS: elegir materia → grabar → parar. Todo lo demás es automático — sube, transcribe,
// estructura y GUARDA en Mis apuntes, sin pantalla de revisión intermedia.
//
// Por qué se quitó la revisión intermedia: el flujo con Atajos (que era el patrón a igualar)
// guardaba directo sin revisar, y mantener aquí un paso más lo hacía estrictamente peor en toques.
// El texto queda a la vista al terminar, y en Mis apuntes se puede borrar y regrabar si salió mal.
//
// Por qué existe esto en vez de (solo) el Atajo: el tramo Atajo→servidor resultó no depurable —
// fallaba sin que ni la app ni el servidor pudieran ver por qué. Este camino es 100% código de la
// app: cada paso se puede probar y ver.
export default function CapturaRapida({ onGuardado }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null) // respuesta de /audio con guardado:true
  const [error, setError] = useState(null)
  const [menuMaterias, setMenuMaterias] = useState(false)
  const [materiaKb, setMateriaKb] = useState('') // '' = nada elegido, 'otras' = tema libre
  const [temaLibre, setTemaLibre] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const wakeLockRef = useRef(null)
  const materiaAlGrabarRef = useRef('')

  const materiaDeLista = MATERIAS.find((m) => m.kbCode === materiaKb)
  const materiaElegida = materiaKb === 'otras' ? temaLibre.trim() : materiaDeLista?.titulo || ''

  function elegir(kb) {
    setMateriaKb(kb)
    if (kb !== 'otras') setMenuMaterias(false)
  }

  // Mientras se graba, la pantalla no se apaga sola. Sin esto, el bloqueo automático del iPhone
  // corta la grabación a los pocos minutos — el problema número uno para grabar una clase entera.
  // Es la API estándar del navegador para esto (Safari la tiene desde iOS 16.4); se pide al
  // empezar y se suelta sola al parar. Si el navegador no la tiene, se sigue sin ella — grabar
  // funciona igual, solo que Carmen tendría que tocar la pantalla de vez en cuando.
  async function pedirPantallaEncendida() {
    try {
      wakeLockRef.current = await navigator.wakeLock?.request('screen')
    } catch {
      wakeLockRef.current = null
    }
  }

  function soltarPantalla() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  // iOS suelta el wake lock si la app pasa a segundo plano (llamada, cambio de app). Al volver,
  // se vuelve a pedir — sin esto, la primera interrupción dejaría el resto de la clase con la
  // pantalla apagándose.
  function revalidarAlVolver() {
    if (document.visibilityState === 'visible' && mediaRecorderRef.current?.state === 'recording') {
      pedirPantallaEncendida()
    }
  }

  async function iniciar() {
    setError(null)
    setResultado(null)
    // La materia se congela al empezar: si Carmen tocara el menú durante la clase, la grabación
    // en curso se guarda con la materia con la que EMPEZÓ, que es la que era verdad.
    materiaAlGrabarRef.current = materiaElegida
    // Limpieza del mecanismo del Atajo, por si quedó una materia aparcada de un intento anterior.
    api.audioProximaMateriaBorrar().catch(() => {})
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        enviar(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      // Trozos cada 30 s en vez de un solo bloque al final: en una grabación de una hora, un solo
      // bloque gigante es más frágil (todo o nada) y algunos navegadores lo manejan peor.
      recorder.start(30000)
      mediaRecorderRef.current = recorder
      setGrabando(true)
      setSegundos(0)
      pedirPantallaEncendida()
      document.addEventListener('visibilitychange', revalidarAlVolver)
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          const next = s + 1
          if (next * 1000 >= MAX_MS) detener()
          return next
        })
      }, 1000)
    } catch {
      setError('No pude acceder al micrófono. Revisa los permisos de este sitio.')
    }
  }

  function detener() {
    clearInterval(timerRef.current)
    document.removeEventListener('visibilitychange', revalidarAlVolver)
    // OJO: el wake lock NO se suelta aquí. Parar la grabación no es el final del trabajo: subir y
    // transcribir una clase de una hora tarda minutos, y si la pantalla se apaga en ese rato, iOS
    // suspende la página y mata la subida a mitad — sin apunte y sin error visible. Se suelta al
    // terminar enviar(), cuando el apunte ya está guardado (o falló de verdad).
    setGrabando(false)
    mediaRecorderRef.current?.stop()
  }

  async function enviar(blob) {
    setProcesando(true)
    // La señal compartida: Mis apuntes la lee para enseñar "⏳ en proceso" aunque Carmen se salga
    // de esta pantalla mientras se procesa.
    marcarProcesando(materiaAlGrabarRef.current)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'captura.webm')
      // Con la materia en la petición, el servidor guarda el apunte él solo — el mismo mecanismo
      // (ya probado) que se hizo para el Atajo. Un solo camino de guardado para los dos mundos.
      formData.append('materia', materiaAlGrabarRef.current)
      const result = await api.audio(formData)
      if (result.guardado) {
        setResultado(result)
        onGuardado?.()
      } else {
        // Sin `guardado` no hubo apunte: casi siempre es que no se detectó voz en el audio.
        setError(result.texto || 'No se pudo procesar la grabación.')
      }
    } catch (err) {
      setError('No pude procesar el audio. (' + err.message + ')')
    } finally {
      setProcesando(false)
      terminarProceso()
      soltarPantalla()
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-sm font-semibold text-lavanda-800">Grabar la clase (hasta 90 min)</p>

      {!grabando && !procesando && (
        <div className="w-full">
          <button
            onClick={() => setMenuMaterias((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-lavanda-200 bg-lavanda-50/60 px-3 py-2.5 text-left text-sm"
          >
            <span className={materiaElegida ? 'font-medium text-morado-900' : 'text-morado-900/50'}>
              {materiaElegida ? `📎 ${materiaElegida}` : '¿De qué clase es? — toca para elegir'}
            </span>
            <span className="text-lavanda-700">{menuMaterias ? '▲' : '▼'}</span>
          </button>

          {menuMaterias && (
            <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-lavanda-100 bg-white p-1.5">
              {MATERIAS.map((m) => (
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
      )}

      {grabando && (
        <p className="rounded-xl bg-lavanda-50 px-3 py-1.5 text-center text-xs text-morado-900/70">
          La pantalla se queda encendida mientras grabas. Deja la app abierta — si cambias de app o
          bloqueas el teléfono, la grabación se corta.
        </p>
      )}

      {!grabando ? (
        <button
          onClick={iniciar}
          disabled={procesando || !materiaElegida}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-lavanda-700 text-2xl text-white shadow-soft disabled:opacity-40"
        >
          🎙️
        </button>
      ) : (
        <button
          onClick={detener}
          className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-soft"
        >
          ⏹️
        </button>
      )}
      {!grabando && !procesando && !materiaElegida && (
        <p className="text-xs text-morado-900/50">Elige primero de qué clase es ↑</p>
      )}
      {grabando && (
        <p className="text-sm text-morado-900/60">
          {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')} · máx. 90 min
        </p>
      )}
      {procesando && (
        <div className="rounded-xl bg-lavanda-50 p-3 text-center">
          <p className="text-sm font-semibold text-lavanda-800">⏳ Maite está transcribiendo y guardando tus apuntes…</p>
          <p className="mt-1 text-xs text-morado-900/60">
            Una nota corta tarda segundos; una clase entera, 2-4 minutos. No cierres la app — cuando
            termine, aquí sale el ✓ y el apunte aparece en Mis apuntes.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {resultado && (
        <div className="flex w-full flex-col gap-2 text-left">
          <p className="self-center rounded-full bg-lavanda-50 px-3 py-1.5 text-xs font-semibold text-lavanda-800">
            ✓ Guardado en Mis apuntes — {resultado.apunte?.materia}
          </p>
          <div className="rounded-2xl bg-crema-100 p-3 text-sm text-morado-900">
            <TextoDeMaite texto={resultado.texto} />
          </div>
          <p className="text-xs text-morado-900/50">
            Si algo salió mal transcrito, en Mis apuntes puedes borrarlo y volver a grabar.
          </p>
        </div>
      )}
    </div>
  )
}
