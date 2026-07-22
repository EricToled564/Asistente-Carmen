# Knowledge Base de Maite

45 documentos: KB1-KB8 (núcleo) + KB9-1 a KB9-37 (guías docentes de 1º a 4º curso, incluyendo
optativas y las 3 menciones de 3º-4º). El índice interactivo de la app (`Académico → Índice`)
usa estos mismos códigos para dar contexto a Maite cuando Carmen pregunta por una materia.

## Primera vez (una sola vez por documento)

1. En el dashboard de ElevenLabs → tu agente Maite → Knowledge Base → sube cada `.md` de esta
   carpeta (arrastrar y soltar o pegar contenido)
2. Copia el `document_id` que ElevenLabs le asigna a cada uno
3. Pégalo **en dos lugares** (sirven para cosas distintas, ambos lo necesitan):
   - En `manifest.json` de esta carpeta, en el campo correspondiente al nombre del archivo — lo
     usa `kb/sync.mjs` (el script que corres tú, a mano, cuando editas un `.md`)
   - En el registro de KV del Worker, con el código corto del doc (KB1, KB3, KB8, KB9-4, etc):
     `npx wrangler kv key put --binding=KV "kb-doc-id:KB1" "<document_id>"` — lo usan
     `/kb-upload`, `/kb-answer` y el cron de auto-investigación (todo lo que corre en vivo desde
     la app o los crons)

## Después de la primera vez

Cuando edites cualquier `.md` de esta carpeta (por ejemplo, para actualizar un horario o
corregir un dato), corre:

```bash
ELEVENLABS_API_KEY=tu_key node kb/sync.mjs
```

Esto hace `PATCH` a todos los documentos que ya tengan `document_id` en `manifest.json`. Para
sincronizar solo uno: `node kb/sync.mjs KB8-horario.md`.

## Guías docentes faltantes

Solo falta 4º curso, 2º semestre: Estrategias de Comunicación & Web, Business management, Market
strategies, Creative leadership workshop y el TFG — no tienen guía docente todavía. Se agregan a
esta carpeta, a `manifest.json` y a `app/src/data/indiceAcademico.js` conforme existan.
