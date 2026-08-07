import type { Env } from '../types.js'

// El libro (o los libros) de cada materia, apuntados por Carmen cuando el profesor los menciona
// en clase. No sale de ningún sitio automático: las guías docentes de la universidad NO traen la
// bibliografía transcrita en el KB (solo dicen que existe en el portal oficial), así que si Maite
// tiene que explicar "desde el libro de la clase" necesita que Carmen se lo diga una vez.
//
// Es a propósito un campo de texto simple —título y autor, nada más— y no un documento subido: no
// hay extracción de PDF ni riesgo de reproducir el contenido de un libro con derechos de autor.
// Maite sabe QUÉ libro es y puede referirse a él por nombre; no lo "lee" ni cita párrafos que no
// tiene.

const KEY = 'bibliografia:por-materia'

export type EntradaBibliografia = {
  kbCode: string
  materia: string
  libro: string
  autor?: string
  actualizadoEn: string
}

type Almacen = Record<string, EntradaBibliografia>

async function leer(env: Env): Promise<Almacen> {
  const g = await env.KV.get<Almacen>(KEY, 'json')
  return g || {}
}

async function escribir(env: Env, a: Almacen): Promise<void> {
  await env.KV.put(KEY, JSON.stringify(a))
}

export async function listar(env: Env): Promise<EntradaBibliografia[]> {
  const a = await leer(env)
  return Object.values(a).sort((x, y) => x.materia.localeCompare(y.materia))
}

export async function obtener(env: Env, kbCode: string): Promise<EntradaBibliografia | null> {
  const a = await leer(env)
  return a[kbCode] || null
}

export async function guardar(
  env: Env,
  kbCode: string,
  materia: string,
  libro: string,
  autor?: string
): Promise<EntradaBibliografia> {
  const a = await leer(env)
  const entrada: EntradaBibliografia = {
    kbCode,
    materia,
    libro: libro.trim(),
    autor: autor?.trim() || undefined,
    actualizadoEn: new Date().toISOString()
  }
  a[kbCode] = entrada
  await escribir(env, a)
  return entrada
}

export async function borrar(env: Env, kbCode: string): Promise<void> {
  const a = await leer(env)
  delete a[kbCode]
  await escribir(env, a)
}

// Búsqueda por nombre o parte del nombre, igual que hace consultar_apuntes con materia — un agente
// de voz recibe lo que Carmen dijo ("el libro de geometrías"), no un kbCode exacto.
export async function buscarPorNombre(env: Env, nombreOCodigo: string): Promise<EntradaBibliografia[]> {
  const q = nombreOCodigo.trim().toLowerCase()
  if (!q) return []
  const todas = await listar(env)
  return todas.filter((e) => e.materia.toLowerCase().includes(q) || e.kbCode.toLowerCase() === q)
}
