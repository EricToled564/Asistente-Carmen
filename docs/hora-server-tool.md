# Server tool `consultar_hora` — configuración en ElevenLabs

> Para **configurar el agente**, usa [`webhooks-elevenlabs.md`](webhooks-elevenlabs.md): ahí están
> las 7 tools juntas y listas para pegar. Este documento se queda con el detalle de por qué la
> aritmética de husos horarios se resuelve en el servidor y no en el modelo.

Permite que Maite responda "¿qué hora es en Berlín?" o "¿es buena hora para llamar a mi tía en
Nueva York?" con el dato correcto.

## Por qué es un webhook y no lo resuelve el modelo

La aritmética de husos horarios se falla en silencio, que es la peor forma de fallar: el modelo
afirma una hora con total seguridad y está mal. Para acertar hay que saber si ese país aplica
horario de verano, si lo aplica en las mismas fechas que España, y si cambió sus reglas hace poco
(México lo eliminó en 2022; varios países lo han movido). Además hay zonas con desfase de media
hora — India, Nepal, partes de Australia — que se pierden si se razona en horas enteras.

El endpoint lo calcula con la base de datos IANA de zonas horarias que trae el runtime, que ya
incluye todas esas reglas y se actualiza sola.

La hora de Pamplona y la de Ciudad de México **no** necesitan esta tool: llegan siempre como
dynamic variables (`{{fecha_actual}}`, `{{hora_mexico}}`). Esta tool es para cualquier otra
ciudad.

## Configuración

⚠️ Igual que con las otras tools: no se pudo verificar la UI exacta de ElevenLabs durante esta
construcción. Los campos de abajo son los conceptos estándar; confirma contra lo que veas.

- **Name:** `consultar_hora`
- **Description:** "Consulta la hora actual en cualquier ciudad del mundo y su diferencia con
  Pamplona. Úsala cuando Carmen pregunte por la hora en un sitio que no sea Pamplona ni Ciudad de
  México, o cuando quiera saber si es buen momento para llamar a alguien en otro país."
- **Method:** `GET`
- **URL:** `https://<TU-WORKER>.workers.dev/hora`
- **Parámetro (query string):**
  - `ciudad` (string, obligatorio) — el nombre de la ciudad en español ("Berlín", "Nueva York") o
    el identificador IANA de la zona horaria ("Europe/Berlin", "America/New_York"). Cualquiera de
    los dos funciona; si el modelo conoce el identificador IANA, mejor, porque no depende del
    diccionario de ciudades.

## Respuestas

**Cuando la encuentra:**
```json
{
  "encontrada": true,
  "ciudad": "Nueva York",
  "zonaHoraria": "America/New_York",
  "hora": "09:59",
  "dia": "domingo, 26 de julio",
  "diferenciaHoras": -6,
  "relacion": "6 horas por detrás de Pamplona",
  "horaEnPamplona": "15:59"
}
```

El campo `relacion` viene ya redactado para leerse en voz, incluidas las medias horas ("3 horas y
media por delante de Pamplona"). El agente puede usarlo tal cual.

**Cuando no reconoce la ciudad:**
```json
{
  "encontrada": false,
  "mensaje": "No reconozco la zona horaria de \"...\". Pregúntale a Carmen el país o dilo con el nombre completo de la ciudad."
}
```

## Ciudades del diccionario

`worker/src/routes/hora.ts` trae un diccionario de ciudades comunes (España, México, capitales
europeas, América, Asia). No pretende ser exhaustivo: para cualquier otra, el agente manda el
identificador IANA y funciona igual. Si notas que falta alguna que Carmen usa seguido, se agrega
ahí en una línea.
