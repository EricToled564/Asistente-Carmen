# Handoff: registrar los webhooks de Maite en ElevenLabs

Para una sesión nueva —con acceso de red completo— que termine la configuración sin que Eric tenga
que reexplicar nada.

**Lee esto y luego `docs/webhooks-elevenlabs.md`**, que tiene los 8 schemas listos para pegar.

## Datos que no hay que volver a preguntar

| Qué | Valor |
|---|---|
| Worker desplegado | **`https://asistentecarmen.erictoled564.workers.dev`** |
| Agente de ElevenLabs | **`agent_8701kyeepa7tffmr5475esyq7rtq`** |
| Repo / rama | `EricToled564/Asistente-Carmen` · `claude/app-creation-documents-c74xfz` |
| KV namespace | `84bc612d19634b5683c9ada11835394c` |

---

## Estado: el Worker está VIVO y los 8 webhooks VERIFICADOS

Probados contra producción el 26-jul-2026, no en local:

| Tool | Comprobado |
|---|---|
| health `/` | `{"ok":true,"servicio":"asistentecarmen"}` |
| `consultar_hora` | Berlín, Nueva York (−6 h), y una ciudad inventada → pide el país |
| `consultar_horario` | sin horario subido → manda a KB8 |
| `consultar_promedio` | responde con el campo `contexto` obligatorio |
| `consultar_apuntes` | 0 resultados con mensaje redactado |
| `iniciar_ruta` | "la biblioteca" → "la 1111" resuelve a Biblioteca → Sala A, 3 pasos |
| ↳ ambigüedad | "seminario" devuelve las 4 opciones en vez de elegir |
| `avanzar_ruta` | los 3 pasos hasta "Listo, ya llegaste" |
| `add_memories` / `retrieve_memories` | guarda y recupera; consulta sin relación → vacío |

Eso confirma además que **KV está conectado y escribiendo**, y que **el deploy automático desde Git
funciona**: los commits de esta rama llegan solos a producción. Ojo con eso — lo que se empuja se
despliega.

## Lo que falta

### 1. Registrar las 8 tools en ElevenLabs ← es LO ÚNICO que bloquea a Maite

El código está desplegado y probado; el agente todavía no sabe que las tools existen, así que nunca
las va a llamar. Sin este paso, Maite arranca cada conversación en blanco y no puede guiar rutas,
ni consultar la hora, ni hacer quizzes de los apuntes.

**Vía API (preferible):**

```bash
cd worker
export WORKER_URL=https://asistentecarmen.erictoled564.workers.dev
node scripts/registrar-tools-elevenlabs.mjs            # dry run, imprime el JSON
export ELEVENLABS_API_KEY=...                          # export, NO argumento del comando
node scripts/registrar-tools-elevenlabs.mjs --aplicar
```

> ⚠️ **El script NO está verificado contra la API real.** Se escribió en un entorno que bloquea
> `elevenlabs.io` (403 en el CONNECT del proxy), así que ni la documentación ni la API estaban
> accesibles. Las rutas (`POST /v1/convai/tools`, `PATCH /v1/convai/agents/{id}`) y la forma de
> `tool_config` salen de conocimiento previo, no de haberlas probado.
>
> **Primera tarea:** abrir
> https://elevenlabs.io/docs/agents-platform/customization/tools/server-tools y
> https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools, confirmar endpoint y
> schema, corregir el script si hace falta. No correrlo con `--aplicar` antes de eso.

**Vía dashboard:** Agents → el agente → sección Agent → "Add Tool" → tipo "Webhook". Los 8 schemas
están en `docs/webhooks-elevenlabs.md` con las URLs ya completas. Esa ruta de UI tampoco se pudo
verificar en pantalla; confírmala antes de guiar a Eric, porque él pidió ir **paso a paso**, uno a
la vez, confirmando cada uno.

### 2. Pegar el system prompt

`docs/system-prompt-maite.md`, **de `---INICIO---` para abajo**. Lo de arriba de esa línea es
configuración para el humano, no parte del prompt.

El prompt asume: LLM Claude Sonnet 5, first message vacío, `{{system__time}}` en `Europe/Madrid`.

### 3. Poner la URL del Worker en el frontend

`VITE_WORKER_URL=https://asistentecarmen.erictoled564.workers.dev` en el entorno de Vercel, y
redesplegar. Sin esto la app llama a `/api` en su propio origen, donde no hay Worker.

Antes eso se colgaba en silencio; ya no: la capa de API exige JSON y falla con un mensaje que
nombra la causa (`app/src/lib/api.js`).

### 4. Subir la KB y registrar los document_id

Los 60 documentos de `kb/` se suben a mano al Knowledge Base del agente. Después, por cada uno:

```bash
npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"
```

Sin esto, `/kb-upload`, `/kb-answer` y el cron de auto-investigación no pueden actualizar ese
documento (no rompen nada: lo loguean y lo omiten).

### 5. Secretos del Worker — para la app, NO para los webhooks

Los 8 webhooks solo usan KV y ya funcionan sin ninguna key. Estos son para las otras features:

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

Ninguno lleva autenticación: el Worker no expone datos de terceros, y una key mal copiada deja a
Maite muda a mitad de conversación — cuesta más que la URL siendo pública.

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

`DELETE /memory/:id` existe pero **no se registra como tool**: que el agente pueda borrar recuerdos
por su cuenta es un riesgo (un "olvídalo" dicho como muletilla podría llevarse algo que importaba).
Es para mantenimiento y para que la app pueda ofrecerlo de forma explícita.

## Prueba de humo, en voz, después de registrar

- "¿Qué hora es en Berlín?" → `consultar_hora`
- "¿Qué clases tengo el martes?" → `consultar_horario`
- "¿Cómo voy de promedio?" → `consultar_promedio`, **sin dar un número objetivo**
- "Estoy en la biblioteca y tengo que ir al Taller 01" → `iniciar_ruta`; "ya llegué" → `avanzar_ruta`
- "Estoy en un seminario" → debe **preguntar cuál**, no elegir uno
- Grabar en Académico → Captura, guardar, y pedir "hazme un quiz de esa clase" → `consultar_apuntes`
- Contarle algo, cerrar, reabrir y ver si se acuerda → `add_memories` + `retrieve_memories`
- Modo viaje en Inicio (Tokio) + "¿a qué hora tengo clase mañana?" → debe decir la hora **de
  Pamplona** y aclarar qué hora es eso allá

## Restricciones que no se pueden romper

- **Nunca un número objetivo para la mención de 4º.** Se asigna por orden de expediente; no hay
  nota mínima publicada. `/notas` devuelve un campo `contexto` que lo dice, y el prompt prohíbe
  contradecirlo.
- **Los apuntes de clase no son fuente oficial.** Salen de reconocimiento de voz en un aula. Si
  contradicen al KB en un dato duro (fechas, créditos, requisitos), gana el KB y Maite lo dice.
- **En modo viaje, toda hora del campus se dice con su referencia** ("las nueve de Pamplona, que
  aquí son las tres"). El horario vive en hora de Pamplona y no se mueve porque ella viaje.
- **Nada de posicionamiento automático dentro del edificio.** No existe esa infraestructura; Carmen
  dice dónde está. Ver `docs/ruta-interior.md`.
- **El nombre del Worker (`asistentecarmen`) no se cambia solo.** Ver el comentario al principio de
  `wrangler.toml`: vive en dos sitios y desincronizarlos rompe cosas en silencio. Ya pasó una vez.

## Contexto de trabajo con Eric

- Todo va a la rama `claude/app-creation-documents-c74xfz`.
- Pidió ir **paso a paso**: uno, él confirma, el siguiente. No le entregues los 8 de golpe.
- No quiere que se culpe a factores externos (Vercel, el navegador, la caché) antes de haber
  revisado el código propio de forma exhaustiva. Ese reflejo ya le costó tiempo antes.
- No le pidas datos que ya se pueden encontrar en el repo o deducir. Por eso la URL y el agent id
  están en la tabla de arriba.
