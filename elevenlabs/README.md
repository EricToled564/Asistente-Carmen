# Configuración de ElevenLabs por API

Registra los 8 server tools (webhooks) del agente Maite sin tocar el dashboard.

```
tools-maite.mjs         Los 8 tool_config, en el formato exacto de la API
registrar-webhooks.mjs  Los crea/actualiza y los engancha al agente
```

## Correrlo

```bash
export ELEVENLABS_API_KEY=...        # elevenlabs.io → Settings → API keys
export WORKER_URL=https://companion-worker.TU-SUBDOMINIO.workers.dev

node elevenlabs/registrar-webhooks.mjs --dry-run   # ver qué se mandaría
node elevenlabs/registrar-webhooks.mjs             # hacerlo
node elevenlabs/registrar-webhooks.mjs --verificar # ver cómo quedó
```

`WORKER_URL` es la URL que te devolvió `npm run deploy` dentro de `/worker`, sin barra final.
El script se niega a arrancar si todavía trae el placeholder `TU-SUBDOMINIO`: una URL sin
sustituir no da error de configuración, falla en silencio a mitad de una conversación.

El `agent_id` por defecto es el de Maite (`agent_8701kyeepa7tffmr5475esyq7rtq`). Si recreas el
agente, pásalo con `ELEVENLABS_AGENT_ID`.

## Qué hace exactamente

1. `GET /v1/convai/tools` — mira qué hay ya en el workspace.
2. Por cada uno de los 8: `POST /v1/convai/tools` si no existe, `PATCH /v1/convai/tools/{id}`
   si ya hay uno con ese nombre. **Es idempotente**: correrlo dos veces no deja 16 tools.
3. `GET /v1/convai/agents/{agent_id}` y guarda la respuesta completa en un
   `.backup-agente-*.json` local (gitignorado) antes de tocar nada.
4. `PATCH /v1/convai/agents/{agent_id}` con `conversation_config.agent.prompt.tool_ids` — la
   **unión** de lo que ya tuviera y los 8 nuevos, para no desenganchar nada por accidente.
5. Vuelve a leer el agente y comprueba dos cosas: que las 8 quedaron enganchadas y que el
   system prompt sigue teniendo caracteres. Si el PATCH se hubiera llevado por delante el
   system prompt, te lo dice y sale con código 1 en vez de dejarte un agente mudo.

## Después

Registrar los tools no configura el resto del agente. Sigue haciendo falta, una sola vez:

- Pegar `docs/system-prompt-maite.md` (bloque entre `---INICIO---` y `---FIN---`) — su sección
  **TUS HERRAMIENTAS** describe estas mismas 8 tools desde el lado de Maite.
- LLM en Claude Sonnet 5, "First message" en blanco, `{{system__time}}` en Europe/Madrid.
- Subir los documentos del Knowledge Base (ver `kb/README.md`).

Y la prueba de humo en voz que está al final de `docs/webhooks-elevenlabs.md`.

## Si la API cambió

El contrato que usa este script se verificó contra el SDK oficial `@elevenlabs/elevenlabs-js`
(`WebhookToolConfigInput` / `WebhookToolApiSchemaConfigInput` / `PromptAgentApiModelInput`):

| Qué | Dónde |
|---|---|
| Crear tool | `POST /v1/convai/tools`, body `{ tool_config: {...} }`, responde `{ id, ... }` |
| Actualizar tool | `PATCH /v1/convai/tools/{tool_id}` |
| Listar tools | `GET /v1/convai/tools` |
| Enganchar al agente | `PATCH /v1/convai/agents/{agent_id}` → `conversation_config.agent.prompt.tool_ids` |
| Auth | header `xi-api-key` |

Si empieza a devolver 404/422, compara contra esos tipos en la versión actual del SDK
(`npm pack @elevenlabs/elevenlabs-js` y mira `api/types/`) antes de tocar el script a ciegas.
