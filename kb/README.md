# Knowledge Base de Maite

27 documentos: KB1-KB8 (núcleo) + KB9-1 a KB9-19 (guías docentes, una por asignatura de 1º-2º curso).

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

Al momento de esta versión, faltan las guías docentes de 3º-4º curso (dependen de la mención
elegida — Producto/Moda/Servicios — y de las optativas). Se agregan a esta carpeta y a
`manifest.json` conforme Carmen avance de curso.
