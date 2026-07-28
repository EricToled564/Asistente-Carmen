#!/usr/bin/env node
//
// Aplica docs/system-prompt-maite.md al agente de ElevenLabs.
//
// Este script existe porque ya pasó lo contrario: el prompt del repo se actualizó con las 8 tools
// y el modo tutor, y NUNCA se aplicó al agente. Durante días Maite corrió con una versión que
// decía "tienes cuatro herramientas" mientras tenía ocho enganchadas — o sea que las cuatro
// nuevas, incluida la de los apuntes de clase, existían pero ella no sabía cuándo usarlas. No hubo
// ningún error en ninguna parte: todo respondía 200 y el agente simplemente era peor de lo que
// debía.
//
// El prompt vive en markdown porque así se revisa en un diff, pero al agente se le manda en texto
// plano: los asteriscos y las almohadillas se los leería como parte del contenido.
//
// Y se manda SOLO lo que hay entre ---INICIO--- y ---FIN---. El documento empieza con una
// explicación dirigida a quien lo mantiene ("edita aquí y copia el bloque de abajo…"); mandar el
// archivo entero le metería a Maite, dentro de su propia identidad, las instrucciones de cómo
// actualizar su propio prompt. No falla ruidosamente: simplemente empieza a hablar de sí misma en
// tercera persona y a citar decisiones de diseño cuando nadie se lo ha pedido.
//
// Uso:
//   export ELEVENLABS_API_KEY=...
//   node scripts/aplicar-system-prompt.mjs             # dry run: enseña el diff de tamaño
//   node scripts/aplicar-system-prompt.mjs --aplicar

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const API = 'https://api.elevenlabs.io/v1'
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_8701kyeepa7tffmr5475esyq7rtq'
const API_KEY = process.env.ELEVENLABS_API_KEY
const APLICAR = process.argv.includes('--aplicar')

const aqui = dirname(fileURLToPath(import.meta.url))
const RUTA_PROMPT = join(aqui, '..', '..', 'docs', 'system-prompt-maite.md')

// Markdown -> texto plano. Se quitan las marcas de formato pero se conservan los saltos de línea y
// los guiones de lista: la estructura visual sí le sirve al modelo, los asteriscos no.
function extraerPrompt(md) {
  // Los marcadores tienen que estar SOLOS en su línea. La introducción del documento los cita
  // entre comillas invertidas para explicar cómo se usa, y buscarlos con un indexOf a secas
  // encontraba esas menciones: el recorte salía de un caracter. Lo cazó el guardia de tamaño, pero
  // solo porque estaba puesto — sin él se habría escrito una cadena vacía sobre el prompt bueno.
  const m = /^---INICIO---$/m.exec(md)
  const f = /^---FIN---$/m.exec(md)
  const inicio = m ? m.index : -1
  const fin = f ? f.index : -1
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(
      'No encontré los marcadores ---INICIO--- y ---FIN--- en docs/system-prompt-maite.md. ' +
        'Sin ellos no se puede separar el prompt de la documentación que lo rodea, y no voy a mandar el archivo entero.'
    )
  }
  return md.slice(inicio + '---INICIO---'.length, fin)
}

function aTextoPlano(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '') // encabezados
    .replace(/\*\*(.+?)\*\*/g, '$1') // negritas
    .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1') // cursivas
    .replace(/`([^`]+)`/g, '$1') // código en línea
    .replace(/^\s*[-*]\s+/gm, '') // viñetas
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // enlaces
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function llamar(metodo, ruta, cuerpo) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  })
  const texto = await res.text()
  if (!res.ok) throw new Error(`${metodo} ${ruta} -> ${res.status}\n${texto}`)
  return texto ? JSON.parse(texto) : {}
}

async function main() {
  const md = await readFile(RUTA_PROMPT, 'utf8')
  const nuevo = aTextoPlano(extraerPrompt(md))

  if (!API_KEY) {
    console.log(`Sin ELEVENLABS_API_KEY: solo se puede ver el resultado de la conversión.\n`)
    console.log(`markdown: ${md.length} caracteres -> texto plano: ${nuevo.length}`)
    console.log(`\n--- primeras 20 líneas ---\n${nuevo.split('\n').slice(0, 20).join('\n')}`)
    return
  }

  const agente = await llamar('GET', `/convai/agents/${AGENT_ID}`)
  const prompt = agente.conversation_config?.agent?.prompt || {}
  const actual = prompt.prompt || ''

  console.log(`Agente:  ${AGENT_ID}`)
  console.log(`Actual:  ${actual.length} caracteres`)
  console.log(`Nuevo:   ${nuevo.length} caracteres`)
  console.log(`Tools:   ${(prompt.tool_ids || []).length} enganchadas (no se tocan)`)
  console.log(`KB:      ${(prompt.knowledge_base || []).length} documentos (no se tocan)\n`)

  // Guardia: escribir un prompt mucho más corto que el vivo casi siempre significa que el markdown
  // se leyó mal o que se apuntó al archivo equivocado. Y como el PATCH reemplaza, el prompt bueno
  // desaparecería sin copia.
  if (nuevo.length < actual.length * 0.7) {
    console.error(
      `\n⛔ El prompt nuevo tiene menos del 70% del actual (${nuevo.length} vs ${actual.length}).\n` +
        'Eso parece una pérdida, no una actualización. No se escribió nada.'
    )
    process.exit(1)
  }
  if (nuevo.length < 5000) {
    console.error('\n⛔ El prompt nuevo es sospechosamente corto. No se escribió nada.')
    process.exit(1)
  }

  if (!APLICAR) {
    console.log('Dry run. Vuelve a correr con --aplicar para escribirlo.')
    return
  }

  // Se manda SOLO la rama del prompt: el PATCH del agente hace merge en profundidad, así que
  // mandar el objeto entero que devuelve el GET rompería (lleva `tools` inline y `tool_ids` a la
  // vez, y la API responde 400 si llegan los dos).
  await llamar('PATCH', `/convai/agents/${AGENT_ID}`, {
    conversation_config: { agent: { prompt: { prompt: nuevo } } }
  })

  const despues = await llamar('GET', `/convai/agents/${AGENT_ID}`)
  const p2 = despues.conversation_config?.agent?.prompt || {}
  const ok = (p2.prompt || '').length === nuevo.length
  console.log(`Comprobación tras el PATCH:`)
  console.log(`  system prompt: ${(p2.prompt || '').length} caracteres ${ok ? '✅' : '❌ NO coincide'}`)
  console.log(`  tools:         ${(p2.tool_ids || []).length} ${(p2.tool_ids || []).length === (prompt.tool_ids || []).length ? '✅ intactas' : '❌'}`)
  console.log(`  KB:            ${(p2.knowledge_base || []).length} ${(p2.knowledge_base || []).length === (prompt.knowledge_base || []).length ? '✅ intacto' : '❌'}`)
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
