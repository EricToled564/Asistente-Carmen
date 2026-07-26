# Webhooks de Maite — todo lo que hay que registrar en ElevenLabs

Este es el documento único de los **server tools** del agente. Antes estaban repartidos entre
`memoria-server-tools.md`, `ruta-interior.md` y `hora-server-tool.md`; esos siguen existiendo con
el detalle de por qué cada uno funciona así, pero para **configurar el agente basta con este**.

Agente: `agent_8701kyeepa7tffmr5475esyq7rtq`
Base de todas las URLs: `https://<TU-WORKER>.workers.dev` (sustituye por tu subdominio real de
Cloudflare Workers antes de pegar nada).

⚠️ No se pudo verificar la UI exacta de ElevenLabs durante esta construcción. Los campos de abajo
(Name, Description, Method, URL, Parameters) son los conceptos estándar de cualquier plataforma de
tools; si el dashboard los llama distinto, el contenido es el mismo.

---

## Los 7 tools de un vistazo

| # | Name | Método | Ruta | Para qué |
|---|---|---|---|---|
| 1 | `retrieve_memories` | POST | `/memory/retrieve` | Recordar conversaciones anteriores |
| 2 | `add_memories` | POST | `/memory/add` | Guardar algo que dijo Carmen |
| 3 | `iniciar_ruta` | POST | `/ruta/iniciar` | Empezar una ruta dentro del edificio |
| 4 | `avanzar_ruta` | POST | `/ruta/avanzar` | Dar el siguiente paso cuando ella confirma |
| 5 | `consultar_hora` | GET | `/hora?ciudad=` | Hora en cualquier ciudad del mundo |
| 6 | `consultar_horario` | GET | `/horario/consulta?dia=` | ¿Hay un horario más nuevo que KB8? |
| 7 | `consultar_promedio` | GET | `/notas` | Promedio ponderado por ECTS |

Ninguno lleva autenticación: el Worker no expone datos de terceros y el coste de un secreto mal
copiado (Maite muda a mitad de una conversación) es mayor que el de que alguien descubra la URL.
Si en algún momento quieres cerrarlo, el sitio es `worker/src/index.ts` con un header compartido.

---

## 1. `retrieve_memories`

**Cuándo debe llamarlo:** al inicio de una conversación, o cuando Carmen mencione algo que suene a
que ya habían hablado de eso (un evento próximo, una preocupación recurrente, un nombre de su
círculo).

- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/memory/retrieve`
- **Description:** "Busca recuerdos guardados de conversaciones anteriores con Carmen, relevantes a
  lo que está diciendo ahorita. Úsalo al empezar la conversación y cuando algo suene a contexto
  pasado."
- **Parameters (body):**
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
  Lista vacía = todavía no hay nada guardado. No es un error; simplemente no la menciones.

## 2. `add_memories`

**Cuándo debe llamarlo:** cuando Carmen comparta algo que valga la pena recordar después —
preferencias, preocupaciones, eventos próximos, nombres de su gente. No en cada mensaje.

- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/memory/add`
- **Description:** "Guarda un recuerdo corto y concreto sobre Carmen para usarlo en conversaciones
  futuras. No lo uses para cada mensaje — solo para información que valga la pena recordar después
  (preferencias, preocupaciones, eventos, nombres de su gente)."
- **Parameters (body):**
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

## 3. `iniciar_ruta`

**Cuándo debe llamarlo:** cuando Carmen diga por voz dónde está y a dónde va dentro del edificio de
Arquitectura ("estoy en la biblioteca y tengo clase en el Taller 01").

Si la ruta la arrancó ella desde la app, **no** lo llames: el `rutaId` ya viene en tu contexto y lo
único que toca es `avanzar_ruta`.

- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/ruta/iniciar`
- **Description:** "Calcula la ruta a pie dentro del edificio de la Escuela de Arquitectura entre
  dos sitios, y devuelve el primer paso. Úsala cuando Carmen te diga dónde está y a dónde quiere
  ir dentro del edificio. Manda los nombres tal cual los dijo ella."
- **Parameters (body):**
  ```json
  {
    "type": "object",
    "properties": {
      "origen": {
        "type": "string",
        "description": "Dónde está Carmen ahora, con el nombre que ella usó ('la biblioteca', 'Seminario 3', 'la 1111')."
      },
      "destino": {
        "type": "string",
        "description": "A dónde quiere llegar, con el nombre que ella usó."
      }
    },
    "required": ["origen", "destino"]
  }
  ```
- **Respuesta cuando encuentra los dos sitios:**
  ```json
  {
    "rutaId": "1e2cc1ff-...",
    "origenNombre": "Biblioteca",
    "destinoNombre": "Taller 01",
    "paso": { "instruccion": "Desde Biblioteca, gira a la izquierda y camina...", "checkpoint": "Ascensor" },
    "pasos": [ ... ],
    "indice": 0,
    "total": 3,
    "terminado": false
  }
  ```
  **Guarda el `rutaId`** — lo vas a necesitar en cada `avanzar_ruta`.
  Di **solo** `paso.instruccion` y espera. El arreglo `pasos` viene completo porque la app lo pinta
  en pantalla; si se los cantas todos de corrido, Carmen no se acuerda del tercero.

- **Respuesta cuando el nombre es ambiguo o no existe:**
  ```json
  { "necesitaAclaracion": true, "campo": "origen", "opciones": [...], "mensaje": "..." }
  ```
  Léele el `mensaje` (o dilo con tus palabras), espera su respuesta y vuelve a llamar la tool. No
  elijas tú una de las opciones: hay seminarios con el mismo nombre en plantas distintas y mandarla
  al piso equivocado es peor que preguntar.

## 4. `avanzar_ruta`

**Cuándo debe llamarlo:** cuando Carmen confirme por voz que llegó al `checkpoint` del paso
anterior ("ya estoy", "ya llegué", "ok ya la veo"). Nunca antes.

- **Method:** `POST`
- **URL:** `https://<TU-WORKER>.workers.dev/ruta/avanzar`
- **Description:** "Devuelve el siguiente paso de una ruta que ya está en curso dentro del
  edificio. Llámala solo cuando Carmen confirme que llegó al punto de referencia del paso anterior."
- **Parameters (body):**
  ```json
  {
    "type": "object",
    "properties": {
      "rutaId": {
        "type": "string",
        "description": "El id de la ruta activa, tal como te lo dio iniciar_ruta o como viene en tu contexto si la ruta la empezó ella desde la app."
      }
    },
    "required": ["rutaId"]
  }
  ```
- **Respuestas:**
  - `{ "terminado": false, "paso": {...}, "indice": 1, "total": 3 }` → dile la instrucción y espera.
  - `{ "terminado": true, "mensaje": "Listo, ya llegaste a Taller 01." }` → cierra, no sigas llamando.
  - HTTP 404 → la ruta expiró (viven 6 horas). Dile que vas a recalcular y llama `iniciar_ruta` otra vez.

## 5. `consultar_hora`

**Cuándo debe llamarlo:** cuando Carmen pregunte la hora en cualquier sitio que **no** sea Pamplona
ni Ciudad de México — esas dos ya las tienes en `{{fecha_actual}}` y `{{hora_mexico}}` y no hacen
falta llamadas.

- **Method:** `GET`
- **URL:** `https://<TU-WORKER>.workers.dev/hora`
- **Description:** "Consulta la hora actual en cualquier ciudad del mundo y su diferencia con
  Pamplona. Úsala cuando Carmen pregunte por la hora en un sitio que no sea Pamplona ni Ciudad de
  México, o cuando quiera saber si es buen momento para llamar a alguien en otro país."
- **Query param:**
  - `ciudad` (string, obligatorio) — nombre en español ("Berlín", "Nueva York") o identificador
    IANA ("Europe/Berlin"). Si conoces el IANA, mándalo: no depende del diccionario de ciudades.
- **Respuesta:**
  ```json
  {
    "encontrada": true, "ciudad": "Nueva York", "zonaHoraria": "America/New_York",
    "hora": "09:59", "dia": "domingo, 26 de julio", "diferenciaHoras": -6,
    "relacion": "6 horas por detrás de Pamplona", "horaEnPamplona": "15:59"
  }
  ```
  `relacion` ya viene redactado para voz, medias horas incluidas ("3 horas y media por delante").
  Úsalo tal cual; no rehagas la resta.
  Si `encontrada` es `false`, lee el `mensaje` y pídele el país.

## 6. `consultar_horario`

**Cuándo debe llamarlo:** antes de contestar cualquier pregunta sobre clases, horas o aulas.

Esta tool **no** te devuelve el horario normal — ese ya lo tienes en KB8. Lo que contesta es si
Carmen subió uno **más nuevo** por "Actualizar mi info" (cambio de semestre, aula que cambió). Si
lo hizo, KB8 quedó viejo y lo que manda es esto.

- **Method:** `GET`
- **URL:** `https://<TU-WORKER>.workers.dev/horario/consulta`
- **Description:** "Comprueba si Carmen subió un horario más reciente que el del documento KB8, y
  devuelve las clases de un día. Llámala antes de contestar sobre clases, horas o aulas."
- **Query param:**
  - `dia` (string, opcional) — "lunes", "martes"… Sin acentos o con ellos, da igual. Si lo omites
    devuelve la semana completa.
- **Respuestas:**
  - `{ "hayHorarioSubido": false, "mensaje": "..." }` → no hay nada más nuevo, contesta con KB8.
  - `{ "hayHorarioSubido": true, "clases": [...], "notas": [...], "actualizadoEn": "..." }` → usa
    esto en vez de KB8. **Lee también `notas`**: ahí van las advertencias reales del horario
    (materias partidas en teoría y taller, la Antropología duplicada del lunes). Sin ellas suenas
    más segura de lo que el horario permite.
  - `{ "hayHorarioSubido": true, "clases": [], "mensaje": "El jueves no tiene clases..." }` → día libre.

## 7. `consultar_promedio`

**Cuándo debe llamarlo:** cuando Carmen pregunte cómo va, cuánto lleva de promedio, o si le alcanza
para la mención de 4º.

- **Method:** `GET`
- **URL:** `https://<TU-WORKER>.workers.dev/notas`
- **Description:** "Devuelve las calificaciones que Carmen ha registrado y su promedio ponderado
  por ECTS. Úsala cuando pregunte cómo va académicamente o por la mención de 4º."
- **Parameters:** ninguno.
- **Respuesta:**
  ```json
  {
    "notas": [{ "materia": "Art Culture", "nota": 8.5, "ects": 6, "curso": 1 }, ...],
    "promedio": 8.85, "ectsComputados": 12, "materias": 2,
    "contexto": "La mención se asigna por orden de expediente entre quienes la piden — ..."
  }
  ```
  **El campo `contexto` no es opcional.** La mención de 4º se asigna por orden de expediente entre
  quienes la piden: no hay nota mínima publicada. Nunca le digas a Carmen que "necesita un 8.5" ni
  ningún otro número — ese número no existe y ponerlo le inventa una presión falsa.
  Si `materias` es 0, todavía no ha registrado nada: dile que puede subir una foto de su boletín en
  "Mi Progreso", sin dar un promedio inventado.

---

## Después de registrarlos

1. Pega el system prompt de `docs/system-prompt-maite.md` en el agente — su sección **TUS
   HERRAMIENTAS** describe estas mismas 7 tools desde el lado de Maite (cuándo sí, cuándo no, qué
   hacer si fallan). Las dos piezas están escritas para leerse juntas.
2. Comprueba que `<TU-WORKER>.workers.dev` esté sustituido en las 7 URLs. Una URL sin sustituir no
   da error de configuración: falla en silencio a mitad de conversación.
3. Prueba de humo, en voz, en este orden — cada una toca un tool distinto:
   - "¿Qué hora es en Berlín?" → `consultar_hora`
   - "¿Qué clases tengo el martes?" → `consultar_horario`
   - "¿Cómo voy de promedio?" → `consultar_promedio`
   - "Estoy en la biblioteca y tengo que ir al Taller 01" → `iniciar_ruta`, luego "ya llegué" →
     `avanzar_ruta`
   - "Estoy en un seminario" → debe **preguntar cuál**, no elegir uno
   - Cuéntale algo memorable, cierra, vuelve a abrir y pregúntale si se acuerda → `add_memories` +
     `retrieve_memories`
