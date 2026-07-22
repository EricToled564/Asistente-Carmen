#!/usr/bin/env node
// Publica los .md de /kb al Knowledge Base de ElevenLabs vía PATCH.
//
// Requiere que cada archivo YA exista como documento en ElevenLabs (subido una vez a mano
// desde su dashboard) y que su document_id esté en manifest.json — este script no crea
// documentos nuevos, solo actualiza contenido de los que ya tienen ID.
//
// Uso:
//   ELEVENLABS_API_KEY=xxx node kb/sync.mjs           # sincroniza todo
//   ELEVENLABS_API_KEY=xxx node kb/sync.mjs KB1-plan-grado-diseno.md   # solo uno
//
// ⚠️ El endpoint PATCH exacto de Knowledge Base de ElevenLabs puede haber cambiado — verifica
// contra elevenlabs.io/docs si este script empieza a fallar con 404/405.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.ELEVENLABS_API_KEY

if (!API_KEY) {
  console.error('Falta ELEVENLABS_API_KEY en el entorno.')
  process.exit(1)
}

const manifest = JSON.parse(await readFile(path.join(__dirname, 'manifest.json'), 'utf8'))
const soloEste = process.argv[2]

const archivos = Object.keys(manifest).filter((k) => !k.startsWith('_') && (!soloEste || k === soloEste))

if (soloEste && archivos.length === 0) {
  console.error(`No encontré "${soloEste}" en manifest.json`)
  process.exit(1)
}

let ok = 0
let omitidos = 0
let fallidos = 0

for (const archivo of archivos) {
  const documentId = manifest[archivo]
  if (!documentId) {
    console.warn(`⏭  ${archivo}: sin document_id en manifest.json, se omite (súbelo primero a mano en ElevenLabs)`)
    omitidos++
    continue
  }

  const contenido = await readFile(path.join(__dirname, archivo), 'utf8')

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${documentId}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ content: contenido })
  })

  if (res.ok) {
    console.log(`✅ ${archivo} -> ${documentId}`)
    ok++
  } else {
    const texto = await res.text().catch(() => '')
    console.error(`❌ ${archivo} -> ${documentId}: ${res.status} ${texto}`)
    fallidos++
  }
}

console.log(`\n${ok} actualizados, ${omitidos} omitidos (sin ID), ${fallidos} fallidos.`)
if (fallidos > 0) process.exit(1)
