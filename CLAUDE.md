# Contexto operativo — léelo antes de preguntar nada

Este archivo existe para que ninguna sesión vuelva a pedirle a Eric datos que ya dio. Si vas a
preguntarle una URL, un nombre de servicio o dónde está desplegado algo, búscalo aquí primero.

**Cómo trabaja Eric:** desde el navegador. Los despliegues van por la integración de GitHub con
Cloudflare, **no** por línea de comandos. No asumas que tiene terminal, Node o wrangler
instalados — no está confirmado que los tenga. Si una tarea necesita terminal, dilo explícito y
ofrece antes una alternativa que se haga desde el navegador.

## Infraestructura (confirmado con capturas del panel, 26-jul-2026)

| Qué | Valor |
|---|---|
| Cuenta Cloudflare | `erictoled564@gmail.com` · account id `f76a5dd565b2a2a94be9460bbab48eef` |
| Worker (nombre del servicio) | **`asistentecarmen`** |
| Worker (URL pública) | **`https://asistentecarmen.erictoled564.workers.dev`** |
| KV namespace | `Asistente_Carmen` · id `84bc612d19634b5683c9ada11835394c` |
| Agente ElevenLabs (Maite) | `agent_8701kyeepa7tffmr5475esyq7rtq` |
| Frontend | Desplegado en Vercel (`vercel.json` en la raíz, root dir `app`) |
| Entorno de Claude Code | `FUWeb` |

El Worker está **vivo y recibiendo tráfico** (27 invocaciones en 24 h el 26-jul-2026).

### Cómo se despliega el Worker

Cloudflare Workers Builds, conectado al repo de GitHub:

- Rama que despliega: **`claude/app-creation-documents-c74xfz`** (no `main`)
- Build command: `cd worker && npm install`
- Deploy command: `cd worker && npx wrangler deploy`
- Se dispara solo al hacer push a esa rama

Para que un cambio del Worker llegue a producción hay que llevarlo a esa rama. Un push a otra
rama no despliega nada.

## Pendientes conocidos

Estas dos cosas están sin resolver a propósito — no las des por hechas.

**1. Desajuste de nombre del Worker.** `worker/wrangler.toml` dice `name = "companion-worker"`,
pero el servicio en Cloudflare se llama `asistentecarmen`. Falta confirmar abriendo
`https://asistentecarmen.erictoled564.workers.dev` en un navegador: si devuelve
`{"ok":true,"servicio":"companion-worker"}`, el código vive ahí y la URL de arriba es la buena.
Si devuelve un error, el `wrangler deploy` creó un Worker aparte llamado `companion-worker` y hay
que averiguar cuál es el que corre antes de apuntarle webhooks. **No toques el `name` de
`wrangler.toml` hasta resolver esto** — cambiarlo a ciegas puede partir el despliegue en dos.

**2. `VITE_WORKER_URL` en Vercel.** `app/src/lib/api.js` cae a `/api` si esa variable no está
definida, y `/api` no existe en Vercel. Si no está configurada con la URL del Worker, todo lo que
depende del backend (foto, captura rápida, SOS, subida de KB) está roto en producción. Hay que
comprobarlo en el panel de Vercel.

## Límite de red de este entorno

`api.elevenlabs.io`, `elevenlabs.io` y `*.workers.dev` están **bloqueados** por la política de
egress del entorno `FUWeb` (403 en el CONNECT del proxy). Consecuencias prácticas:

- No se puede llamar a la API de ElevenLabs desde aquí.
- No se pueden leer los docs de ElevenLabs. Para verificar su API, baja el SDK oficial desde npm
  (`npm pack @elevenlabs/elevenlabs-js`) y lee los tipos en `api/types/` — npm sí es alcanzable.
- No se puede probar el Worker desplegado con `curl`. Esa comprobación la tiene que hacer Eric
  abriendo la URL en su navegador.

Para levantarlo: en **claude.ai/code** (pantalla de inicio, no dentro de una sesión), selector de
entorno `FUWeb` → ⚙️ → **Network access: Custom** + dominio permitido, marcando *"Also include
default list of common package managers"*. Ojo: ese engranaje **no aparece dentro de una sesión
abierta**, solo en la pantalla de inicio. Eric ya se perdió buscándolo ahí una vez.

Dos cosas de ese diálogo que hay que tener presentes:

- **Los cambios solo aplican a sesiones nuevas.** Después de guardar hay que abrir una sesión
  nueva; la que está corriendo sigue con la política vieja.
- **El campo Environment variables NO sirve para secretos.** El propio diálogo avisa que son
  visibles para cualquiera que use el entorno. No metas ahí API keys.

### Cómo pasarle una API key a una sesión

Como el campo de variables de entorno queda descartado, la vía es: Eric crea una key **nueva y
dedicada** en el proveedor, la pega en el chat, se usa, y **la revoca en cuanto termina la
tarea**. Exposición acotada y bajo su control. Propónselo así — no le pidas que reutilice una key
existente ni que la guarde en el entorno.

## Idioma

Todo en español: código, comentarios, documentación, mensajes de commit y respuestas.
