# Server tools de memoria — configuración en ElevenLabs

> Para **configurar el agente**, usa [`webhooks-elevenlabs.md`](webhooks-elevenlabs.md): ahí están
> las 7 tools juntas y listas para pegar. Este documento se queda con el detalle de por qué la
> memoria funciona así y dónde viven los datos.

El agente Maite no recuerda nada entre conversaciones por defecto. Estos dos endpoints ya están
construidos en el Worker (`worker/src/routes/memory.ts`); lo que falta es que **tú** los
registres como "server tools" (a veces llamado "custom tool" / "webhook tool", según la versión
del dashboard) en la configuración del agente en ElevenLabs.

⚠️ No se pudo verificar la UI exacta de ElevenLabs para configurar server tools durante esta
construcción — los nombres de campo de abajo (Name, Description, Parameters, URL, Method)
son los conceptos estándar que casi cualquier plataforma de tools pide, pero confirma contra
elevenlabs.io/docs si algo no calza exactamente con lo que ves en pantalla.

## Tool 1: `retrieve_memories`

**Cuándo debe llamarlo el agente:** al inicio de una conversación, o cuando Carmen mencione algo
que suene a que ya habían hablado de eso antes (un evento próximo, una preocupación recurrente,
un nombre de alguien de su círculo).

- **Name:** `retrieve_memories`
- **Description:** "Busca recuerdos guardados de conversaciones anteriores con Carmen, relevantes
  a lo que está diciendo ahorita. Úsalo al empezar la conversación y cuando algo suene a contexto
  pasado."
- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/memory/retrieve`
- **Parameters (JSON schema del body):**
  ```json
  {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Palabras clave de lo que se quiere recordar. Vacío para traer los recuerdos más recientes."
      },
      "limite": {
        "type": "integer",
        "description": "Cuántos recuerdos traer como máximo (default 5)."
      }
    }
  }
  ```
- **Respuesta:** `{ "recuerdos": [{ "id", "texto", "categoria", "creadoEn" }, ...] }`

## Tool 2: `add_memories`

**Cuándo debe llamarlo el agente:** cuando Carmen comparta algo que valga la pena recordar para
después — preferencias, preocupaciones, eventos próximos, nombres de su gente. No para cada
mensaje, solo para información que el agente usaría en una conversación futura.

- **Name:** `add_memories`
- **Description:** "Guarda un recuerdo corto y concreto sobre Carmen para usarlo en conversaciones
  futuras. No lo uses para cada mensaje — solo para información que valga la pena recordar
  después (preferencias, preocupaciones, eventos, nombres de su gente)."
- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/memory/add`
- **Parameters (JSON schema del body):**
  ```json
  {
    "type": "object",
    "properties": {
      "texto": {
        "type": "string",
        "description": "El recuerdo en una o dos oraciones, en tercera persona (ej. 'Carmen tiene examen de Antropología el 14 de octubre y está nerviosa por eso')."
      },
      "categoria": {
        "type": "string",
        "description": "Etiqueta corta opcional (ej. 'académico', 'emocional', 'social')."
      }
    },
    "required": ["texto"]
  }
  ```
- **Respuesta:** `{ "ok": true, "recuerdo": {...} }`

## Privacidad

Los recuerdos viven únicamente en el KV de este Worker (nuestra infraestructura, dentro de
Cloudflare) — no pasan por ningún servicio de terceros aparte de ElevenLabs invocando el webhook.
No hay límite de retención implementado en v1; si en algún momento quieres que expiren solos,
se puede agregar un TTL a `env.KV.put` en `worker/src/lib/memoryStore.ts`.
