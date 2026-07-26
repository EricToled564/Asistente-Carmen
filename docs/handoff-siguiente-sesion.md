# Handoff: registrar los webhooks de Maite en ElevenLabs

Este documento existe para que una sesión nueva —con acceso de red completo— pueda terminar la
configuración sin que Eric tenga que reexplicar nada.

**Empieza leyendo esto y luego `docs/webhooks-elevenlabs.md`.** Ese segundo tiene los 8 schemas
completos; este tiene el contexto y el estado.

---

## Lo que ya está hecho (no lo rehagas)

- **Código**: los 8 endpoints están construidos, typecheckean limpio y están probados contra un
  Worker local (`wrangler dev --local`). Frontend compila.
- **Agente conectado**: `agent_8701kyeepa7tffmr5475esyq7rtq`, en
  `app/src/context/AppContext.jsx` (pisable con `VITE_ELEVENLABS_AGENT_ID`).
- **System prompt**: `docs/system-prompt-maite.md`, ~5.800 palabras, al día con las 8 tools y con
  el modo viaje. Se pega tal cual en el agente, desde la línea `---INICIO---`. Lo de arriba de esa
  línea es configuración para el humano, no parte del prompt.
- **Script de registro**: `worker/scripts/registrar-tools-elevenlabs.mjs` — crea las 8 tools por
  API y las engancha al agente. Ver la advertencia de abajo antes de correrlo.

## Lo que falta, en orden

### 1. Desplegar el Worker ← **bloquea todo lo demás**

Sin esto no hay URL que meterle a las tools. Los 8 endpoints solo usan KV: **no hacen falta API
keys para que los webhooks funcionen** (las keys de Anthropic/ElevenLabs son para `/audio`,
`/vision` y `/notas/extraer`, que son features de la app, no de los webhooks).

El Worker se llama **`asistentecarmen`**, así que la URL será
`https://asistentecarmen.<subdominio>.workers.dev`.

> **Ojo con el nombre — ya causó un problema.** El Worker se llamaba `companion-worker` en
> `wrangler.toml`, pero la integración de Git de Cloudflare había creado uno llamado
> `asistentecarmen` (Cloudflare propone por defecto el nombre del repo normalizado:
> `Asistente-Carmen` → `asistentecarmen`). Wrangler ignora el nombre del dashboard y despliega al
> de `wrangler.toml`, así que se acaba con dos Workers y sacando la URL del que está vacío. Y los
> secretos y bindings de KV son **por Worker**: se ponen en uno, se despliega al otro, y revienta
> en runtime pareciendo un bug de código.
>
> Ya está resuelto: `wrangler.toml` dice `asistentecarmen`. **Si en el dashboard el Worker se
> llama distinto, cambia `wrangler.toml` para que coincida — nunca al revés**, porque Cloudflare
> no deja renombrar un Worker y habría que rehacer la conexión de Git.

**Si el deploy va por la integración de Git de Cloudflare** (Workers & Pages → el Worker →
Settings → Build), la configuración tiene que ser:

| Campo | Valor |
|---|---|
| Root directory | `worker` |
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy` |

El **root directory es el que más se olvida**: `wrangler.toml` vive en `worker/`, no en la raíz
del repo. Si queda en la raíz, el build falla con algo tipo *"no wrangler configuration found"*.

**Si se despliega a mano** (más simple, y no depende de nada del dashboard):

```bash
cd worker && npm install && npx wrangler login && npx wrangler deploy
```

Otro posible tropiezo: `wrangler.toml` apunta al KV namespace `84bc612d19634b5683c9ada11835394c`.
Si no existe en esa cuenta, el deploy falla; se crea con `npx wrangler kv namespace create KV` y se
pega el id nuevo en `wrangler.toml`.

Comprobación: `GET https://<url>/` debe devolver `{"ok":true,"servicio":"asistentecarmen"}`. Ese
campo `servicio` está justo para esto — si devuelve otra cosa, o 404, estás mirando el Worker
equivocado.

Después, poner esa URL en `app/.env` como `VITE_WORKER_URL` y redesplegar el frontend — si no, la
app sigue llamando a `/api` y todo lo que depende del Worker falla en silencio.

### 2. Registrar las 8 tools

Dos vías. La de API es preferible: 8 formularios a mano es donde se cuelan las erratas.

**Vía API (recomendada):**

```bash
cd worker
export WORKER_URL=https://asistentecarmen.TU-SUBDOMINIO.workers.dev
node scripts/registrar-tools-elevenlabs.mjs            # dry run, imprime el JSON
export ELEVENLABS_API_KEY=...                          # export, NO argumento
node scripts/registrar-tools-elevenlabs.mjs --aplicar
```

> ⚠️ **El script no se pudo verificar contra la API real.** Se escribió en un entorno que bloquea
> `elevenlabs.io` a nivel de red (403 en el CONNECT del proxy), así que ni la documentación ni la
> API estaban accesibles. Las rutas (`POST /v1/convai/tools`,
> `PATCH /v1/convai/agents/{id}`) y la forma de `tool_config` salen de conocimiento previo, **no de
> haberlas probado**.
>
> **Primera tarea de la sesión nueva:** abrir
> https://elevenlabs.io/docs/agents-platform/customization/tools/server-tools y
> https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools, confirmar endpoint y
> schema, y corregir el script si hace falta. No lo corras con `--aplicar` antes de eso.

**Vía dashboard (si la API no cuadra):** Agents → el agente → sección Agent → "Add Tool" → tipo
"Webhook". Los 8 schemas están en `docs/webhooks-elevenlabs.md` listos para copiar. Esa ruta de UI
tampoco se pudo verificar en pantalla — confírmala antes de guiar a Eric paso a paso, porque él
pidió explícitamente ir de uno en uno confirmando cada paso.

### 3. Pegar el system prompt

`docs/system-prompt-maite.md`, de `---INICIO---` para abajo.

Configuración del agente que el prompt asume (está anotada al principio del archivo): LLM Claude
Sonnet 5, first message vacío, `{{system__time}}` en `Europe/Madrid`.

### 4. Subir la KB y registrar los document_id

Los 60 documentos de `kb/` se suben a mano al Knowledge Base del agente. Después, por cada uno:

```bash
npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"
```

Sin esto, `/kb-upload`, `/kb-answer` y el cron de auto-investigación no pueden actualizar ese
documento (no rompen nada: lo loguean y lo omiten).

### 5. Secretos del Worker (para las features de la app, no para los webhooks)

```bash
npx wrangler secret put ANTHROPIC_API_KEY    # /vision, /audio, /notas/extraer
npx wrangler secret put ELEVENLABS_API_KEY   # transcripción en /audio
npx wrangler secret put TELEGRAM_BOT_TOKEN   # /telegram
npx wrangler secret put RESEND_API_KEY       # /sos
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

Y en `wrangler.toml`, `[vars]`: `FAMILIA_EMAIL_DESTINO` y `RESIDENCIA_DIRECCION` siguen con
`REEMPLAZA_CON_...`.

---

## Los 8 webhooks

Ninguno lleva autenticación: el Worker no expone datos de terceros y una key mal copiada deja a
Maite muda a mitad de conversación, que cuesta más que la URL siendo pública.

| Tool | Método | Ruta | Código |
|---|---|---|---|
| `retrieve_memories` | POST | `/memory/retrieve` | `worker/src/routes/memory.ts` |
| `add_memories` | POST | `/memory/add` | `worker/src/routes/memory.ts` |
| `iniciar_ruta` | POST | `/ruta/iniciar` | `worker/src/routes/ruta.ts` |
| `avanzar_ruta` | POST | `/ruta/avanzar` | `worker/src/routes/ruta.ts` |
| `consultar_hora` | GET | `/hora?ciudad=` | `worker/src/routes/hora.ts` |
| `consultar_horario` | GET | `/horario/consulta?dia=` | `worker/src/routes/horario.ts` |
| `consultar_promedio` | GET | `/notas` | `worker/src/routes/notas.ts` |
| `consultar_apuntes` | GET | `/apuntes/buscar?q=` | `worker/src/routes/apuntes.ts` |

## Prueba de humo, en voz, después de registrar

- "¿Qué hora es en Berlín?" → `consultar_hora`
- "¿Qué clases tengo el martes?" → `consultar_horario`
- "¿Cómo voy de promedio?" → `consultar_promedio`, **sin dar un número objetivo** (ver abajo)
- "Estoy en la biblioteca y tengo que ir al Taller 01" → `iniciar_ruta`; luego "ya llegué" →
  `avanzar_ruta`
- "Estoy en un seminario" → debe **preguntar cuál**, no elegir uno
- Grabar algo en Académico → Captura, guardarlo, pedir "hazme un quiz de esa clase" →
  `consultar_apuntes`
- Contarle algo memorable, cerrar, reabrir y preguntarle si se acuerda → `add_memories` +
  `retrieve_memories`
- Activar modo viaje en Inicio (Tokio) y preguntar "¿a qué hora tengo clase mañana?" → debe decir
  la hora **de Pamplona** y aclarar qué hora es eso allá

## Restricciones que no se pueden romper

Están escritas en el prompt y en el código, pero conviene tenerlas presentes al revisar:

- **Nunca un número objetivo para la mención de 4º.** Se asigna por orden de expediente entre
  quienes la piden; no hay nota mínima publicada. Decirle "necesitas 8.5" le inventa una presión
  que no existe. `/notas` devuelve un campo `contexto` que dice esto y el prompt prohíbe
  contradecirlo.
- **Los apuntes de clase no son fuente oficial.** Salen de reconocimiento de voz en un aula. Si
  contradicen al KB en un dato duro (fechas, créditos, requisitos), gana el KB y Maite tiene que
  decirlo.
- **En modo viaje, toda hora del campus se dice con su referencia** ("las nueve de Pamplona, que
  aquí son las tres"). El horario vive en hora de Pamplona y no se mueve porque ella viaje.
- **Nada de posicionamiento automático dentro del edificio.** No existe esa infraestructura; Carmen
  dice dónde está. Ver `docs/ruta-interior.md`.

## Contexto de trabajo con Eric

- Rama de desarrollo: `claude/app-creation-documents-c74xfz`. Todo va ahí.
- Pidió explícitamente ir **paso a paso**: un paso, él confirma, el siguiente. No le entregues los
  8 de golpe.
- Ha sido claro en que no quiere que se culpe a factores externos (Vercel, el navegador, la caché)
  antes de haber revisado el código propio de forma exhaustiva. Si algo falla, el primer sitio
  donde buscar es lo que escribimos nosotros.
