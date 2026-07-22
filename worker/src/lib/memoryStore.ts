import type { Env } from '../types.js'

export interface Recuerdo {
  id: string
  texto: string
  categoria?: string
  creadoEn: string
}

const PREFIX = 'memoria:'

function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos para que "mamá"/"mama" empaten
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

export async function agregarRecuerdo(env: Env, texto: string, categoria?: string): Promise<Recuerdo> {
  const recuerdo: Recuerdo = {
    id: crypto.randomUUID(),
    texto: texto.trim(),
    categoria: categoria?.trim() || undefined,
    creadoEn: new Date().toISOString()
  }
  await env.KV.put(`${PREFIX}${recuerdo.creadoEn}-${recuerdo.id}`, JSON.stringify(recuerdo))
  return recuerdo
}

// Búsqueda simple por solape de palabras + bonus de recencia — suficiente para un solo usuario
// con volumen bajo de recuerdos (no hace falta una vector DB para v1).
export async function buscarRecuerdos(env: Env, query: string, limite = 5): Promise<Recuerdo[]> {
  const lista = await env.KV.list({ prefix: PREFIX })
  const recuerdos = (
    await Promise.all(
      lista.keys.map(async (k) => {
        const raw = await env.KV.get(k.name)
        return raw ? (JSON.parse(raw) as Recuerdo) : null
      })
    )
  ).filter((r): r is Recuerdo => r !== null)

  if (!query.trim()) {
    // Sin query: devuelve los más recientes nada más (útil para "recupera contexto al inicio").
    return recuerdos.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, limite)
  }

  const tokensQuery = new Set(tokenizar(query))
  const ahora = Date.now()

  const puntuados = recuerdos.map((r) => {
    const tokensRecuerdo = tokenizar(r.texto)
    const coincidencias = tokensRecuerdo.filter((t) => tokensQuery.has(t)).length
    const diasDesde = (ahora - new Date(r.creadoEn).getTime()) / (1000 * 60 * 60 * 24)
    const bonusRecencia = Math.max(0, 1 - diasDesde / 90) // decae a 0 en ~90 días
    return { recuerdo: r, score: coincidencias + bonusRecencia * 0.5 }
  })

  return puntuados
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((p) => p.recuerdo)
}
