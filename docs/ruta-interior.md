# "¿Cómo llego?" — wayfinding dentro del Edificio de Arquitectura

## Por qué es así

No existe forma de saber en tiempo real dónde está Carmen dentro del edificio: el GPS no
funciona bien en interiores, y no hay infraestructura de WiFi-fingerprinting, BLE beacons ni UWB
instalada en el edificio (eso requeriría presupuesto y hardware que no tenemos). Google My Maps
tampoco expone una API de "dónde estoy" dentro de un embed.

En vez de simular un posicionamiento que no existe, la app deja que **Carmen le diga a la app**
dónde está y a dónde quiere ir. Maite arma la ruta completa de una vez, pero se la da **en voz,
un checkpoint a la vez**: dice el primer paso, espera a que Carmen confirme por voz que llegó, y
solo entonces da el siguiente. Así el "no sé exactamente dónde estás en cada segundo" deja de ser
un problema — es Carmen quien avisa cuándo avanzó.

Las instrucciones sí dicen "izquierda/derecha" — cada parada tiene un campo `lado` (norte/sur,
ver `edificioArquitectura.ts`) sacado de su posición real en las capturas, y el edificio es una
sola nave con un pasillo central (confirmado con el Río Sadar corriendo por el norte en las tres
plantas, o sea las fotos sí están orientadas con el norte arriba). Caminando hacia el este, lado
norte queda a la izquierda y lado sur a la derecha (al revés caminando hacia el oeste) — es
geometría simple, no una suposición. Cuando el punto de partida es una escalera/ascensor (que no
tiene un lado propio), en vez de inventar hacia dónde queda mirando Carmen al salir, se da el giro
de LLEGADA al destino en su lugar (ver `girarHacia` en `rutaInterior.ts`) — nunca se inventa un
giro sin dato real detrás.

## Cómo funciona técnicamente

1. Carmen abre Mapa → "🧭 ¿Cómo llego?", elige "Estoy en" y "Quiero ir a" (`GET /ruta/lugares`
   llena esos selects desde `worker/src/data/edificioArquitectura.ts`).
2. Al tocar "Iniciar ruta con Maite", la app llama `POST /ruta/iniciar` — el Worker calcula toda
   la ruta (`worker/src/lib/rutaInterior.ts`) y la guarda en KV bajo una `rutaId` (expira sola en
   6 horas). Devuelve el primer paso.
3. La app abre el widget de Maite pasándole por `dynamic-variables` la `rutaId` y el primer paso
   como contexto.
4. Cuando Carmen le confirma por voz a Maite que llegó al checkpoint, Maite llama la server tool
   `avanzar_ruta` (ver abajo).

**La otra entrada: pedirla hablando.** Carmen también puede saltarse los selects y decirle a Maite
"estoy en la biblioteca y tengo clase en el Taller 01". Ahí Maite llama `iniciar_ruta` con los
nombres tal cual los dijo ella. El mismo `POST /ruta/iniciar` acepta las dos formas: `origenId`/
`destinoId` (ids exactos, los manda la app) u `origen`/`destino` en texto libre (los manda el
agente). La resolución por nombre está en `buscarParadasPorNombre` (`edificioArquitectura.ts`):
compara sin acentos, entiende números de sala ("la 1111"), y cuando el texto casa con varias
paradas **devuelve las opciones en vez de elegir una** — hay seminarios homónimos en plantas
distintas, y mandarla al piso equivocado por adivinar es peor que repreguntar.

⚠️ No se pudo verificar la UI exacta de ElevenLabs para registrar server tools durante esta
construcción — los campos de abajo son los conceptos estándar, confirma contra lo que veas en
pantalla. Los schemas de las 7 tools juntos y listos para pegar están en
[`webhooks-elevenlabs.md`](webhooks-elevenlabs.md).

## Tool: `avanzar_ruta`

**Cuándo debe llamarla el agente:** cuando Carmen confirme por voz que llegó al checkpoint que
Maite le pidió (ej. "ya llegué", "ya estoy en la cafetería", "ya subí"). Nunca antes de esa
confirmación.

- **Name:** `avanzar_ruta`
- **Description:** "Obtiene el siguiente paso de la ruta activa dentro del edificio, después de
  que Carmen confirmó por voz que llegó al checkpoint anterior. Dile el siguiente paso tal cual
  lo devuelva la herramienta."
- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/ruta/avanzar`
- **Parameters (JSON schema del body):**
  ```json
  {
    "type": "object",
    "properties": {
      "rutaId": {
        "type": "string",
        "description": "El id de la ruta activa, viene en el contexto de la conversación."
      }
    },
    "required": ["rutaId"]
  }
  ```
- **Respuesta si no ha terminado:** `{ "terminado": false, "paso": { "instruccion", "checkpoint" }, "indice", "total" }`
- **Respuesta al llegar al destino:** `{ "terminado": true, "mensaje": "Listo, ya llegaste a ..." }`

## Datos del edificio

Los datos (`worker/src/data/edificioArquitectura.ts`) salen de capturas reales del Google My Maps
que armaste — Planta -1, 0 y 1 (confirmado, es el último piso), ya completas.

Confirmado: **Planta -1 no tiene ascensor**, solo la escalera junto a Seminario 3. Por eso una
ruta que empiece o termine en Planta -1 siempre usa esa escalera — no hay alternativa accesible en
esa planta (`grupoComunEnCamino` en `rutaInterior.ts` ya lo refleja así, y avisa en vez de inventar
una ruta si algún día se pide algo que no existe).
