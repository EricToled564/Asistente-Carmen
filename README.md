# Maite — companion PWA para Carmen en Pamplona

Regalo de despedida: PWA instalable + Cloudflare Worker + bot de Telegram, companion de Carmen,
estudiante mexicana de primer año del Grado en Diseño en la Universidad de Navarra, viviendo en
CampusHome (Iturrama, Pamplona). Construido siguiendo el **PROMPT MAESTRO v2 (DEFINITIVO)** —
único documento fuente de verdad; el v1 y su addendum quedan solo en `/docs/diseño-original/`
como referencia histórica.

**Principio no negociable del diseño:** la app y el agente nunca inventan información de campus/
trámites/ciudad — todo eso vive en el Knowledge Base de Maite (ElevenLabs), consumido vía widget
embebido, no reimplementado aquí.

**Dirección visual:** paleta lavanda predominante + morado profundo + neutros cálidos + un acento
melocotón, inspirada en Mine/usemine.com (tipografía bold expresiva, tarjetas grandes, stats
celebrados) con gradientes suaves estilo Luma y calidez de onboarding estilo Flo. El módulo SOS y
el modo emergencia quedan **fuera** de esta paleta a propósito — ahí manda el rojo/blanco de alto
contraste. Tipografía: Bricolage Grotesque (display) + Plus Jakarta Sans (body). Todos los pares
texto/fondo están verificados contra WCAG AA.

## Estructura del repo

```
/app        → Frontend: React + Vite + Tailwind, PWA instalable, mobile-first
/worker     → Backend: Cloudflare Worker (Hono) — todos los proxies, webhooks y crons
/kb         → Los 45 documentos del Knowledge Base de Maite + script de sync a ElevenLabs
/elevenlabs → Registro por API de los 8 server tools (webhooks) del agente
/docs       → Documentación de apoyo (Atajos de iOS, este README, diseño original)
```

## Qué se construyó

| # | Módulo | Estado |
|---|---|---|
| 1 | Esqueleto PWA + sistema de diseño lavanda (manifest, SW, 6 tabs) | ✅ |
| 2 | Widget de Maite flotante + fecha/hora y contexto de pantalla como dynamic variables | ✅ (`agent_id` ya configurado) |
| 3 | Mapa con pines curados (CampusHome real) + deep links a Google Maps (modo transporte público, "desde donde estoy" por GPS) + apps oficiales de transporte | ✅ |
| 4 | Foto → información (visión Claude) | ✅ |
| 5 | Académico: horario visual, radar de fechas, índice de materias con temario/evaluación real (leído de /kb), tutor (vía Maite), captura rápida | ✅ |
| 6 | Botones "Grabar clase"/"Terminar clase" (Atajos iOS) | ✅ (ver limitación abajo) |
| 7 | Módulo SOS (countdown, GPS, 3 canales, modo emergencia) | ✅ |
| 8 | Notificaciones push (Web Push + cron de check-ins) | ✅ |
| 9 | "Actualizar mi info" (KB self-service con vista previa editable) | ✅ |
| 10 | Onboarding (permisos + checklist 30 días) | ✅ |
| 11 | Datos de emergencia (nombre legal + tipo de sangre, separados del KB) | ✅ |
| 12 | Memoria persistente de Maite (`/memory/retrieve` + `/memory/add`) | ✅ (registro por API: `node elevenlabs/registrar-webhooks.mjs`) |
| 13 | Mapa → "¿Cómo llego?": wayfinding interior por checkpoints de voz (Carmen indica origen/destino, Maite guía paso a paso) | ✅ (registro por API: `node elevenlabs/registrar-webhooks.mjs`) |
| — | Mecanismo C: preguntas de actualización (`/kb-answer`, Ajustes → Preguntas) | ✅ |
| — | Registro flexible de document_id del KB (KV, ya no env vars fijas) | ✅ |
| — | Worker: `/vision /audio /telegram /sos /push/subscribe /kb-upload /kb-confirm /emergency-data /memory/* /kb-answer* /ruta/* /horario /notas* /hora` + crons | ✅ |
| — | Académico → Horario: vista semanal visual (no solo conversación con Maite); "Actualizar mi info" la mantiene sincronizada | ✅ |
| — | KB: 45 documentos + `kb/manifest.json` + `kb/sync.mjs` | ✅ |

**Server tools / webhooks de Maite (8 en total).** El código de todas está listo y probado contra
un Worker local. **El registro en ElevenLabs ya no es manual: se hace por API con un comando**
(ver [`/elevenlabs/README.md`](elevenlabs/README.md)):

```bash
ELEVENLABS_API_KEY=... WORKER_URL=https://asistentecarmen.erictoled564.workers.dev \
  node elevenlabs/registrar-webhooks.mjs
```

Es idempotente (correrlo dos veces actualiza, no duplica), respalda el agente antes de tocarlo y
comprueba al final que el system prompt sigue intacto. El **porqué** de cada tool y la prueba de
humo en voz siguen en [`/docs/webhooks-elevenlabs.md`](docs/webhooks-elevenlabs.md).

| Tool | Método | Ruta | Para qué |
|---|---|---|---|
| `retrieve_memories` | POST | `/memory/retrieve` | Recordar conversaciones anteriores |
| `add_memories` | POST | `/memory/add` | Guardar algo para después |
| `iniciar_ruta` | POST | `/ruta/iniciar` | Arrancar una ruta interior desde la voz |
| `avanzar_ruta` | POST | `/ruta/avanzar` | Siguiente paso cuando ella confirma que llegó |
| `consultar_hora` | GET | `/hora?ciudad=` | Hora en cualquier ciudad del mundo |
| `consultar_horario` | GET | `/horario/consulta?dia=` | ¿Hay un horario más nuevo que KB8? |
| `consultar_promedio` | GET | `/notas` | Promedio ponderado por ECTS |
| `consultar_apuntes` | GET | `/apuntes/buscar?q=` | Lo que se dijo en SU clase, para quizzes |

El agente conectado en la app es `agent_8701kyeepa7tffmr5475esyq7rtq`
(`app/src/context/AppContext.jsx`, pisable con `VITE_ELEVENLABS_AGENT_ID`).

**Wayfinding interior ("¿Cómo llego?"):** no hay posicionamiento automático dentro del edificio
(no existe esa infraestructura) — Carmen dice dónde está y a dónde va, por la app o hablando con
Maite, y la guía es un checkpoint a la vez, confirmando cada punto antes de dar el siguiente paso.
Cuando lo pide hablando, `iniciar_ruta` resuelve los nombres como ella los dice ("la biblioteca",
"la 1111") y repregunta si son ambiguos en vez de adivinar la planta. `/docs/ruta-interior.md`
explica además el único dato del edificio pendiente de confirmar (accesibilidad/ascensor en
Planta -1).

**Registro de KB docs:** los `document_id` ya no van en `wrangler.toml` — se cargan uno por uno
en KV después de subir cada documento a mano en ElevenLabs:
```bash
npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"
```
Repite para cada código (`KB1`...`KB9-37`) que ya tengas subido. Sin esto, `/kb-upload`,
`/kb-answer` y el cron de auto-investigación (mecanismo A) no van a poder actualizar ese
documento — pero no rompen nada, solo lo loguean y lo omiten.

**Todo lo del prompt v2 está construido.** Lo único 100% pendiente de tu lado es la configuración
externa: crear el agente en ElevenLabs, correr `elevenlabs/registrar-webhooks.mjs`, cargar los
document_id, y las cuentas/keys de las APIs (ver "Configuración pendiente" abajo).

Todo el código está escrito y el frontend **compila limpio** (`npm run build`) y el Worker
**typechequea limpio** (`tsc --noEmit`) y **bundlea limpio** (`wrangler deploy --dry-run`). Lo que
**no** se pudo verificar end-to-end en esta sesión es cualquier llamada real a APIs externas
(Claude, ElevenLabs, Resend, Telegram, Web Push) porque requieren credenciales que solo tú puedes
generar — ver "Configuración pendiente" abajo.

## Cómo correr localmente

```bash
# Frontend
cd app
npm install
cp .env.example .env   # llena lo que ya tengas
npm run dev             # http://localhost:5173

# Worker
cd worker
npm install
cp .dev.vars.example .dev.vars   # llena tus API keys de prueba
npm run dev              # wrangler dev, por defecto http://localhost:8787
```

Mientras no tengas el Worker desplegado, apunta `VITE_WORKER_URL` a `http://localhost:8787` para
probar los módulos que dependen de él (foto, captura rápida, SOS, KB upload).

## Configuración pendiente (todo lo que tienes que hacer tú)

### 1. Cuenta de Cloudflare
1. Crea cuenta en cloudflare.com (gratis)
2. `npx wrangler login` dentro de `/worker`
3. Crea el KV namespace: `npx wrangler kv namespace create KV` → copia el `id` a `wrangler.toml`
4. Crea la D1 (opcional en v1, reservada para log de cambios de KB si la quieres):
   `npx wrangler d1 create companion-db` → copia el `database_id` a `wrangler.toml`
5. Despliega: `npm run deploy` desde `/worker` — te da la URL `https://companion-worker.TU-SUBDOMINIO.workers.dev`

### 2. Secretos del Worker
```bash
cd worker
npx wrangler secret put ANTHROPIC_API_KEY       # console.anthropic.com
npx wrangler secret put ELEVENLABS_API_KEY      # elevenlabs.io → API keys
npx wrangler secret put ELEVENLABS_AGENT_ID     # el agent_id que generes en ElevenLabs
npx wrangler secret put TELEGRAM_BOT_TOKEN      # @BotFather en Telegram
npx wrangler secret put RESEND_API_KEY          # resend.com
npx wrangler secret put VAPID_PUBLIC_KEY        # ver sección "Notificaciones push"
npx wrangler secret put VAPID_PRIVATE_KEY
```

Y en `worker/wrangler.toml`, reemplaza los `REEMPLAZA_CON_...` de `[vars]`:
- `FAMILIA_EMAIL_DESTINO`, `RESIDENCIA_DIRECCION`

Los `document_id` del KB **no** van en `wrangler.toml` — van en un registro de KV, uno por cada
código (`KB1`, `KB3`, `KB8`, `KB9-4`, etc), cargados así después de subir cada documento a mano
en ElevenLabs:
```bash
npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"
```

### 3. ElevenLabs — el agente Maite y su Knowledge Base
1. Crea cuenta y un agente Conversational AI en elevenlabs.io, llámalo Maite
2. Pega su system prompt: está en `/docs/system-prompt-maite.md` (copia el bloque entre
   `---INICIO---` y `---FIN---`). Ese archivo es la fuente de verdad — si hay que cambiar cómo se
   comporta Maite, se edita ahí y se vuelve a pegar, no al revés.
3. Configura el LLM del agente en Claude Sonnet 5, y el "First message" en blanco (Carmen habla
   primero)
4. Configura `{{system__time}}` con timezone **Europe/Madrid** en la plataforma. Sirve de
   respaldo: la fuente principal de fecha/hora son las dynamic variables que manda la app
   (`{{dia_semana}}`, `{{fecha_actual}}`, `{{hora_mexico}}`), porque `{{system__time}}` da el día
   de la semana en inglés y el horario de Carmen está en español
5. Sube los 60 documentos de `/kb` (ver `/kb/README.md` para el flujo completo con
   `kb/manifest.json` y `kb/sync.mjs`)
6. Registra los 8 server tools (webhooks) — por API, con el Worker ya desplegado:
   ```bash
   ELEVENLABS_API_KEY=... WORKER_URL=https://asistentecarmen.erictoled564.workers.dev \
     node elevenlabs/registrar-webhooks.mjs
   ```
   Ver `/elevenlabs/README.md`. Compruébalo con `--verificar` y haz la prueba de humo en voz de
   `/docs/webhooks-elevenlabs.md`.
7. Copia el `agent_id` → `app/.env` (`VITE_ELEVENLABS_AGENT_ID`) y el Worker secret
8. Como KB8 (horario) ya viene con el del semestre 1 precargado desde este repo (no subido vía
   "Actualizar mi info"), marca eso en KV para que el recordatorio push de horario no insista de
   más — ver `worker/src/lib/horarioEstado.ts`:
   ```bash
   npx wrangler kv key put --binding=KV "horario:ultimaActualizacion" "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
   ```

**Sin verificar:** los endpoints exactos de la API de Knowledge Base de ElevenLabs
(`worker/src/lib/elevenlabs.ts`) están escritos según la forma más plausible de su API pública al
momento de construir esto — su superficie es relativamente nueva. Antes de confiar en el
mantenimiento automático del KB (mecanismo A del cron), prueba manualmente un `GET`/`PATCH` a un
documento y ajusta `elevenlabs.ts` si los paths no coinciden con lo que ves en
elevenlabs.io/docs.

### 4. Notificaciones push (VAPID keys)
```bash
npx web-push generate-vapid-keys
```
(o cualquier generador de claves VAPID). La pública va en `app/.env` (`VITE_VAPID_PUBLIC_KEY`) y
en el Worker; la privada solo en el Worker.

### 5. Bot de Telegram
1. Habla con `@BotFather` → `/newbot` → copia el token → `wrangler secret put TELEGRAM_BOT_TOKEN`
2. Registra el webhook (una sola vez, después de desplegar el Worker):
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://companion-worker.TU-SUBDOMINIO.workers.dev/telegram"
   ```

### 6. Resend (email del SOS)
1. Cuenta en resend.com (gratis hasta 3,000 emails/mes)
2. Verifica un dominio o usa el sandbox de pruebas
3. `wrangler secret put RESEND_API_KEY`

### 7. Cloudflare Pages (hosting del frontend)
```bash
cd app
npm run build
npx wrangler pages deploy dist --project-name=maite-companion
```
O conecta el repo directamente en Vercel (root directory `app`, build command `npm run build`,
output `dist` — ver `vercel.json` en la raíz) o en Cloudflare Pages, para despliegue automático
en cada push. Este proyecto ya está desplegado en Vercel.

### 8. Datos personales a llenar
- `app/.env`: `VITE_SOS_WHATSAPP_NUMERO`, `VITE_SOS_CONSULADO_TEL` — `VITE_RESIDENCIA_DIRECCION`
  y las coordenadas de CampusHome ya traen default correcto, solo llénalos si cambia de residencia
- `app/src/data/pines.js`: el pin de CampusHome usa una coordenada aproximada de Av. de Pío XII
  28 — no se pudo verificar en un mapa en vivo durante la construcción; confírmala en Google Maps
- `worker/wrangler.toml`: `FAMILIA_EMAIL_DESTINO`, `RESIDENCIA_DIRECCION`

### 9. Atajos de iOS
Ver `/docs/atajos-ios.md` — **requiere hardware real** para verificar qué acciones exactas de
Notas de Voz están disponibles en su versión de iOS. Guía completa con fallback documentado ahí.

## Limitaciones conocidas (documentadas explícitamente, no asumidas)

- **Battery Status API**: no existe en iOS Safari. El módulo SOS se degrada a "batería
  desconocida" en ese caso — no falla, solo omite el dato.
- **Atajos de iOS**: no verificable sin un iPhone físico durante esta construcción. Ver
  `/docs/atajos-ios.md` para plan A + fallback.
- **Radar académico y check-ins push**: las fechas de entregas/exámenes viven en `localStorage`
  del navegador (por diseño, sin backend de usuarios). Esto significa que el cron diario de
  check-in (`0 9 * * *`) **no puede** mandar avisos específicos tipo "tu entrega es en 2 días" —
  manda un check-in genérico cálido. Si más adelante quieres avisos push de deadlines concretos,
  hace falta un endpoint de sincronización que suba esas fechas al Worker (no construido en v1
  para no reintroducir una base de datos de usuario que el diseño original evitaba).
- **Tool de web search de Claude** (usado en el cron de auto-investigación del KB,
  `worker/src/cron/kbAutoResearch.ts` / `worker/src/lib/claude.ts`): el nombre exacto del tool
  (`web_search_20250305`) pudo cambiar — verifica contra la documentación actual de Anthropic
  antes de confiar en el mecanismo A de mantenimiento automático.
- **Mapa**: se usó Leaflet + OpenStreetMap (gratis, sin API key) en vez de Mapbox/Google Maps
  como sugería el prompt original, precisamente para evitar una llave de API más que configurar.
  Si prefieres el estilo visual de Mapbox, es un cambio de un solo archivo
  (`app/src/pages/Mapa.jsx`).
- **Push a "familia"**: como es una app de un solo usuario sin login, un familiar se registra
  como destinatario de alertas SOS abriendo la misma URL con `?familia=1` y activando
  notificaciones desde Ajustes. Está documentado en la UI pero es una solución simple, no un
  sistema de roles real.

## Seguridad

- Ninguna API key vive en el frontend — todo proxy pasa por el Worker (`ANTHROPIC_API_KEY`,
  `ELEVENLABS_API_KEY`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `VAPID_PRIVATE_KEY` son todos
  secretos del Worker)
- Sin autenticación de usuarios (por diseño — app de una sola persona). Si compartes la URL
  pública, cualquiera con el link puede usar los módulos que llaman al Worker. Considera un PIN
  simple en `Ajustes` si te preocupa, o restringir el Worker por origen/CORS.

## Documentos de diseño originales

Los dos documentos que definieron este proyecto (`prompt-maestro-claude-code.md` y
`arquitectura-agente-navarra.md`) quedaron en `/docs/diseño-original/` para que cualquiera que
retome el proyecto tenga el contexto completo de las decisiones de producto.
