import { useApp } from '../context/AppContext.jsx'
import ElevenLabsWidget from '../components/agente/ElevenLabsWidget.jsx'

// Pantalla dedicada a Maite. Es el ÚNICO sitio donde se monta el widget.
//
// El contexto (`contextoAgente`) lo deja puesto quien navegó hasta aquí: si Carmen llegó desde
// unos apuntes o desde una ruta activa, la conversación arranca sabiendo de qué va. Por eso esta
// pantalla NO lo limpia al entrar — antes lo hacía, y borraba justo lo que el botón acababa de
// preparar.
export default function Agente() {
  const { config, contextoAgente } = useApp()

  return (
    // pt-40 (no p-5 arriba): el widget flota centrado y ARRIBA de la pantalla (placement="top"),
    // y su burbuja de saludo ("¿Necesitas ayuda?" + botones) es bastante alta — sin este hueco de
    // separación, tapaba el título "Maite" y el párrafo de abajo. Se comprobó con una captura real
    // de la pantalla en el teléfono, no a ojo.
    <div className="flex h-full flex-col gap-4 px-5 pb-32 pt-40">
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
        // Ya no hay tarjeta propia invitando a tocar el widget: el widget mismo enseña su saludo
        // ("¿Necesitas ayuda?" con sus botones) en cuanto carga, así que una tarjeta aparte
        // repitiendo lo mismo no aportaba nada — solo ocupaba media pantalla de más.
        contextoAgente && (
          <div className="rounded-2xl bg-lavanda-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavanda-800">
              Ya sabe de qué le vas a hablar
            </p>
            <p className="mt-1 text-sm text-morado-900/70">
              Llegaste desde otra pantalla, así que no tienes que explicarle el contexto. Entra
              directo a lo que querías preguntarle.
            </p>
          </div>
        )
      )}

      {/* El widget se monta aquí y solo aquí. Al salir de esta pantalla se destruye. */}
      <ElevenLabsWidget />
    </div>
  )
}
