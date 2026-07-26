#!/usr/bin/env node
// Registra por API los 8 server tools (webhooks) del agente Maite en ElevenLabs y los
// engancha al agente. Sustituye el trabajo manual de /docs/webhooks-elevenlabs.md.
//
// Uso:
//   ELEVENLABS_API_KEY=xxx WORKER_URL=https://companion-worker.TU-SUBDOMINIO.workers.dev \
//     node elevenlabs/registrar-webhooks.mjs
//
//   --dry-run     imprime exactamente lo que mandaría, sin llamar a ElevenLabs
//   --verificar   solo lee: qué tools existen y cuáles tiene enganchadas el agente
//
// Es idempotente: si un tool con el mismo nombre ya existe, lo ACTUALIZA (PATCH) en vez de
// crear un duplicado. Correrlo dos veces no deja 16 tools.
//
// Antes de tocar el agente guarda su configuración actual en un .backup-agente-*.json local
// (gitignorado). El PATCH al agente es mínimo — solo tool_ids — y después vuelve a leer el
// agente para comprobar que el system prompt sigue en su sitio.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { construirTools } from './tools-maite.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API = 'https://api.elevenlabs.io/v1/convai'
const AGENT_ID_DEFAULT = 'agent_8701kyeepa7tffmr5475esyq7rtq'

const API_KEY = process.env.ELEVENLABS_API_KEY
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || AGENT_ID_DEFAULT
const DRY_RUN = process.argv.includes('--dry-run')
const SOLO_VERIFICAR = process.argv.includes('--verificar')

// --- Validación de entrada -------------------------------------------------------------

if (!API_KEY) {
  console.error('❌ Falta ELEVENLABS_API_KEY en el entorno (elevenlabs.io → Settings → API keys).')
  process.exit(1)
}

const WORKER_URL = (process.env.WORKER_URL || '').trim().replace(/\/+$/, '')

if (!SOLO_VERIFICAR) {
  if (!WORKER_URL) {
    console.error(
      '❌ Falta WORKER_URL: la URL pública de tu Cloudflare Worker, ej.\n' +
        '   WORKER_URL=https://companion-worker.tu-subdominio.workers.dev'
    )
    process.exit(1)
  }
  // Una URL con el placeholder sin sustituir no falla al registrar: falla en silencio a mitad
  // de una conversación, que es mucho peor. Por eso se corta aquí.
  if (/TU-|SUBDOMINIO|<|>/i.test(WORKER_URL)) {
    console.error(`❌ WORKER_URL todavía trae el placeholder sin sustituir: ${WORKER_URL}`)
    process.exit(1)
  }
  if (!WORKER_URL.startsWith('https://')) {
    console.error(`❌ WORKER_URL debe empezar con https:// — recibí: ${WORKER_URL}`)
    process.exit(1)
  }
}

// --- Cliente HTTP ----------------------------------------------------------------------

async function llamar(metodo, ruta, cuerpo) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'xi-api-key': API_KEY,
      ...(cuerpo ? { 'content-type': 'application/json' } : {})
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {})
  })

  const crudo = await res.text()
  let datos
  try {
    datos = crudo ? JSON.parse(crudo) : {}
  } catch {
    datos = { _crudo: crudo }
  }

  if (!res.ok) {
    const detalle = typeof datos.detail === 'string' ? datos.detail : JSON.stringify(datos).slice(0, 500)
    throw new Error(`${metodo} ${ruta} → ${res.status} ${res.statusText}\n   ${detalle}`)
  }
  return datos
}

// La API ha devuelto la lista de tools con y sin envoltorio según la versión; aceptamos ambas.
const listaDeTools = (datos) => (Array.isArray(datos) ? datos : datos.tools || datos.data || [])

// --- Modo --verificar ------------------------------------------------------------------

async function verificar() {
  const tools = listaDeTools(await llamar('GET', '/tools'))
  const agente = await llamar('GET', `/agents/${AGENT_ID}`)
  const enganchados = agente?.conversation_config?.agent?.prompt?.tool_ids || []

  console.log(`\n🔎 Tools en el workspace: ${tools.length}`)
  for (const t of tools) {
    const cfg = t.tool_config || {}
    const marca = enganchados.includes(t.id) ? '🔗' : '  '
    console.log(`${marca} ${t.id}  ${cfg.name}  [${cfg.type}]  ${cfg.api_schema?.method || ''} ${cfg.api_schema?.url || ''}`)
  }

  const sistema = agente?.conversation_config?.agent?.prompt?.prompt || ''
  console.log(`\n🤖 Agente ${AGENT_ID}`)
  console.log(`   nombre: ${agente?.name || '(sin nombre)'}`)
  console.log(`   tools enganchadas: ${enganchados.length}`)
  console.log(`   system prompt: ${sistema.length} caracteres`)
  console.log('\n🔗 = enganchado a este agente\n')
}

// --- Registro --------------------------------------------------------------------------

async function registrar() {
  const definiciones = construirTools(WORKER_URL)

  console.log(`\n🎯 Agente:  ${AGENT_ID}`)
  console.log(`🌐 Worker:  ${WORKER_URL}`)
  console.log(`🔧 Tools:   ${definiciones.length}${DRY_RUN ? '   (DRY RUN — no se llama a ElevenLabs)' : ''}\n`)

  if (DRY_RUN) {
    for (const cfg of definiciones) {
      console.log(`── ${cfg.name} ─────────────────────────────`)
      console.log(JSON.stringify({ tool_config: cfg }, null, 2))
      console.log()
    }
    console.log('Nada se envió. Quita --dry-run para registrarlos de verdad.\n')
    return
  }

  // 1. Qué hay ya en el workspace, para no duplicar.
  const existentes = new Map()
  for (const t of listaDeTools(await llamar('GET', '/tools'))) {
    if (t?.tool_config?.name) existentes.set(t.tool_config.name, t.id)
  }

  // 2. Crear o actualizar cada tool.
  const ids = []
  let creados = 0
  let actualizados = 0

  for (const cfg of definiciones) {
    const yaExiste = existentes.get(cfg.name)
    if (yaExiste) {
      await llamar('PATCH', `/tools/${yaExiste}`, { tool_config: cfg })
      console.log(`♻️  ${cfg.name.padEnd(20)} actualizado  ${yaExiste}`)
      ids.push(yaExiste)
      actualizados++
    } else {
      const creado = await llamar('POST', '/tools', { tool_config: cfg })
      if (!creado?.id) throw new Error(`ElevenLabs no devolvió id al crear ${cfg.name}`)
      console.log(`✅ ${cfg.name.padEnd(20)} creado       ${creado.id}`)
      ids.push(creado.id)
      creados++
    }
  }

  // 3. Respaldo del agente antes de tocarlo.
  const agente = await llamar('GET', `/agents/${AGENT_ID}`)
  const prompt = agente?.conversation_config?.agent?.prompt || {}
  const systemPromptAntes = (prompt.prompt || '').length

  const respaldo = path.join(__dirname, `.backup-agente-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await writeFile(respaldo, JSON.stringify(agente, null, 2))
  console.log(`\n💾 Respaldo del agente en ${path.relative(process.cwd(), respaldo)}`)

  // 4. Enganchar. Unión con lo que ya tuviera, para no desenganchar nada ajeno a este script.
  const previos = Array.isArray(prompt.tool_ids) ? prompt.tool_ids : []
  const union = [...new Set([...previos, ...ids])]

  await llamar('PATCH', `/agents/${AGENT_ID}`, {
    conversation_config: { agent: { prompt: { tool_ids: union } } }
  })

  // 5. Releer y comprobar que el PATCH no se llevó por delante el system prompt.
  const despues = await llamar('GET', `/agents/${AGENT_ID}`)
  const promptDespues = despues?.conversation_config?.agent?.prompt || {}
  const systemPromptDespues = (promptDespues.prompt || '').length
  const enganchados = promptDespues.tool_ids || []

  const faltantes = ids.filter((id) => !enganchados.includes(id))

  console.log(`\n📊 ${creados} creados · ${actualizados} actualizados · ${enganchados.length} enganchadas al agente`)

  if (faltantes.length) {
    console.error(`⚠️  Estas tools no aparecen enganchadas tras el PATCH: ${faltantes.join(', ')}`)
    process.exitCode = 1
  }

  if (systemPromptAntes > 0 && systemPromptDespues === 0) {
    console.error(
      `\n🚨 El system prompt del agente pasó de ${systemPromptAntes} a 0 caracteres.\n` +
        `   Restáuralo desde el respaldo (${path.basename(respaldo)}) o volviendo a pegar\n` +
        `   docs/system-prompt-maite.md en el dashboard. NO uses el agente así.`
    )
    process.exitCode = 1
  } else {
    console.log(`✅ System prompt intacto (${systemPromptDespues} caracteres)`)
  }

  console.log('\nSiguiente paso: la prueba de humo en voz de docs/webhooks-elevenlabs.md.\n')
}

try {
  await (SOLO_VERIFICAR ? verificar() : registrar())
} catch (err) {
  // fetch() envuelve los errores de red en un "fetch failed" mudo; la causa real va dentro.
  const causa = err.cause?.message || err.cause?.code
  console.error(`\n❌ ${err.message}${causa ? `\n   causa: ${causa}` : ''}\n`)
  process.exit(1)
}
