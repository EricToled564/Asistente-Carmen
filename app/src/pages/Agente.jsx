import { useApp } from '../context/AppContext.jsx'
import ElevenLabsWidget from '../components/agente/ElevenLabsWidget.jsx'

// Sugerencias para arrancar. Son las preguntas que de verdad va a tener los primeros meses, no
// ejemplos de demo: cada una toca una capacidad distinta (horario, ruta interior, trámites, KB).
const SUGERENCIAS = [
  '¿Qué clase tengo hoy?',
  'Estoy en la biblioteca, ¿cómo llego al Taller 01?',
  '¿Qué hora es en México?',
  'Ayúdame con lo del TIE',
  'Hazme un quiz de mi última clase',
  '¿Cómo voy de promedio?'
]

// Pantalla dedicada a Maite. Es el ÚNICO sitio donde se monta el widget.
//
// El contexto (`contextoAgente`) lo deja puesto quien navegó hasta aquí: si Carmen llegó desde
// unos apuntes o desde una ruta activa, la conversación arranca sabiendo de qué va. Por eso esta
// pantalla NO lo limpia al entrar — antes lo hacía, y borraba justo lo que el botón acababa de
// preparar.
export default function Agente() {
  const { config, contextoAgente } = useApp()

  return (
    <div className="flex h-full flex-col gap-4 p-5 pb-32">
      <header>
        <h1 className="font-display text-2xl font-bold text-lavanda-800">Maite</h1>
        <p className="text-sm text-morado-900/60">
          Pregúntale lo que sea — de tus clases, de Pamplona, de un trámite, o de cómo va tu día.
        </p>
      </header>

      {!config.elevenLabsAgentId ? (
        <div className="rounded-2xl border border-dashed border-lavanda-300 bg-lavanda-50 p-5 text-sm text-morado-900/70">
          <p className="font-semibold text-lavanda-800">El agente aún no está configurado</p>
          <p className="mt-2">
            Falta la variable <code className="rounded bg-white px-1">VITE_ELEVENLABS_AGENT_ID</code>.
          </p>
        </div>
      ) : (
        <>
          {contextoAgente && (
            <div className="rounded-2xl bg-lavanda-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">
                Ya sabe de qué le vas a hablar
              </p>
              <p className="mt-1 text-sm text-morado-900/70">
                Llegaste desde otra pantalla, así que no tienes que explicarle el contexto. Entra
                directo a lo que querías preguntarle.
              </p>
            </div>
          )}

          <div className="rounded-3xl bg-gradient-to-br from-lavanda-700 via-lavanda-600 to-lavanda-500 p-6 text-center shadow-glow">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-4xl">
              💬
            </span>
            <p className="mt-3 font-display text-xl font-bold text-white">Toca el botón de abajo</p>
            <p className="mt-1 text-sm text-lavanda-50/85">
              Está en la esquina inferior derecha. Puedes hablarle o escribirle, como prefieras.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-morado-900/50">
              Si no sabes por dónde empezar
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {SUGERENCIAS.map((s) => (
                <p key={s} className="rounded-2xl bg-white px-4 py-3 text-sm text-morado-900/75 shadow-soft">
                  “{s}”
                </p>
              ))}
            </div>
          </div>
        </>
      )}

      {/* El widget se monta aquí y solo aquí. Al salir de esta pantalla se destruye. */}
      <ElevenLabsWidget />
    </div>
  )
}
