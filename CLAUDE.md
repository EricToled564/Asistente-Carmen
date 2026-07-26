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
| Worker (nombre del servicio) | **`asistentecarmen`** (y `name` de `wrangler.toml`, ya cuadrados) |
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

Lo único que queda abierto es el punto 2. El 1 se deja escrito porque explica un fallo que ya costó
una sesión entera y que se puede repetir.

**1. Nombre del Worker — RESUELTO y verificado en producción (26-jul-2026).** `wrangler.toml` decía
`companion-worker` mientras el servicio de Cloudflare se llamaba `asistentecarmen`, así que el
deploy aterrizaba en un Worker distinto del que tenía la dirección pública encendida. Ya están
cuadrados. Comprobado desde esta sesión con `curl`:

- `/` → `{"ok":true,"servicio":"asistentecarmen"}`
- `/hora?ciudad=Berlin` → JSON con la hora y la relación con Pamplona
- `/notas` → responde con el campo `contexto` obligatorio
- `/horario/consulta?dia=martes` → manda a KB8, como toca

**No cambies el `name`**: el comentario al principio de `wrangler.toml` explica por qué vive en dos
sitios y qué se rompe al desincronizarlos.

**2. `VITE_WORKER_URL` en Vercel.** `app/src/lib/api.js` cae a `/api` si esa variable no está
definida, y `/api` no existe en Vercel. Si no está configurada con la URL del Worker, todo lo que
depende del backend (foto, captura rápida, SOS, subida de KB) está roto en producción. Hay que
comprobarlo en el panel de Vercel.

## Red del entorno

Eric abrió la política de egress del entorno `FUWeb` el 26-jul-2026. Comprobado desde esta sesión:
`api.elevenlabs.io` responde (401 sin key, con el JSON de error de ElevenLabs) y
`asistentecarmen.erictoled564.workers.dev` es alcanzable con `curl`. Antes los dos daban 403 en el
CONNECT del proxy.

Si en una sesión futura vuelven a fallar con 403, la política se cambia en **claude.ai/code**
(pantalla de inicio, no dentro de una sesión), selector de entorno `FUWeb` → ⚙️ → **Network
access**. `Full` permite cualquier dominio; `Custom` pide una lista y **hay que marcar** *"Also
include default list of common package managers"* o se rompe npm.

Dos cosas de ese diálogo:

- **Los cambios solo aplican a sesiones nuevas.** La que está corriendo sigue con la política vieja.
- **El campo Environment variables NO sirve para secretos.** El propio diálogo avisa de que son
  visibles para cualquiera que use el entorno. No metas ahí API keys.

Truco que sigue siendo útil aunque haya red: para verificar el contrato de una API sin depender de
que su web sea alcanzable, baja su SDK oficial de npm (`npm pack @elevenlabs/elevenlabs-js`) y lee
los tipos en `api/types/`. Así se verificó el registro de tools.

### Cómo pasarle una API key a una sesión

Como el campo de variables de entorno queda descartado: Eric crea una key **nueva y dedicada** en el
proveedor, la pega en el chat, se usa, y **la revoca en cuanto termina la tarea**. Exposición
acotada y bajo su control. Propónselo así — no le pidas que reutilice una key existente ni que la
guarde en el entorno.

## Idioma

Todo en español: código, comentarios, documentación, mensajes de commit y respuestas.
