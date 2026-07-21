# Nava — companion PWA para Pamplona

Regalo de despedida: PWA instalable + Cloudflare Worker + bot de Telegram, companion de una
estudiante de primer año del Grado en Diseño en la Universidad de Navarra. Construido siguiendo
`prompt-maestro-claude-code.md` y `arquitectura-agente-navarra.md` (documentos de diseño
originales, incluidos en este repo bajo `/docs/diseño-original/` para referencia).

**Principio no negociable del diseño:** la app nunca inventa información de campus/trámites/
ciudad — todo eso vive en el Knowledge Base del agente de voz (ElevenLabs), consumido vía widget
embebido, no reimplementado aquí.

## Estructura del repo

```
/app      → Frontend: React + Vite + Tailwind, PWA instalable
/worker   → Backend: Cloudflare Worker (Hono) — todos los proxies, webhooks y crons
/docs     → Documentación de apoyo (Atajos de iOS, este README, diseño original)
```

## Qué se construyó (v1 completo, en el orden del prompt maestro)

| # | Módulo | Estado |
|---|---|---|
| 1 | Esqueleto PWA (manifest, SW, 6 tabs, diseño distintivo) | ✅ |
| 2 | Widget del agente ElevenLabs embebido | ✅ (necesita `agent_id`) |
| 3 | Mapa con pines curados + deep links a Google Maps | ✅ |
| 4 | Foto → información (visión Claude) | ✅ |
| 5 | Académico: radar de fechas, tutor (vía agente), captura rápida | ✅ |
| 6 | Botones "Grabar clase"/"Terminar clase" (Atajos iOS) | ✅ (ver limitación abajo) |
| 7 | Módulo SOS (countdown, GPS, 3 canales, modo emergencia) | ✅ |
| 8 | Notificaciones push (Web Push + cron de check-ins) | ✅ |
| 9 | "Actualizar mi info" (KB self-service con vista previa editable) | ✅ |
| 10 | Onboarding (permisos + checklist 30 días) | ✅ |
| — | Worker: `/vision /audio /telegram /sos /push/subscribe /kb-upload /kb-confirm` + crons | ✅ |

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
- `KB_DOC_ID_*` — los `document_id` de cada uno de los 8 documentos del Knowledge Base en
  ElevenLabs (los ves en su dashboard después de crear el agente y subir los documentos).

### 3. ElevenLabs — el agente y su Knowledge Base
1. Crea cuenta y un agente Conversational AI en elevenlabs.io
2. Sube los 7-8 documentos del KB (ver `arquitectura-agente-navarra.md` §4 para el contenido
   exacto de cada uno — KB1 a KB7 se pueden redactar/investigar ahora; KB8 depende de que
   captures el horario real del semestre)
3. Copia el `agent_id` → `app/.env` (`VITE_ELEVENLABS_AGENT_ID`) y el Worker secret
4. Copia el `document_id` de cada documento → `worker/wrangler.toml`
5. Escribe el system prompt del agente con la persona y guardrails de §3 del documento de
   arquitectura (identidad, dominios D1-D7, guardrails anti-alucinación)

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
npx wrangler pages deploy dist --project-name=nava-companion
```
O conecta el repo de GitHub directamente en el dashboard de Cloudflare Pages (build command
`npm run build`, output `dist`, root directory `app`) para despliegue automático en cada push.

### 8. Datos personales a llenar
- `app/.env`: `VITE_SOS_WHATSAPP_NUMERO`, `VITE_SOS_CONSULADO_TEL`, `VITE_RESIDENCIA_DIRECCION`,
  `VITE_RESIDENCIA_LAT/LNG` (cuando sepan qué colegio mayor/residencia)
- `app/src/data/pines.js`: revisa las coordenadas aproximadas de Pamplona — están basadas en
  ubicaciones públicas conocidas pero no verificadas metro a metro; ajusta si algo no cuadra
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
