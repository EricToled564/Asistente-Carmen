import type { Env } from '../types.js'

// Espejo del Knowledge Base en el repo.
//
// Cada vez que se actualiza un documento en ElevenLabs, se escribe también el .md correspondiente
// en GitHub. No es por tener dos copias bonitas: es por tener DESHACER.
//
// ElevenLabs no guarda versiones de sus documentos. Si una actualización sale mal —el modelo
// resume de más, entra información equivocada, alguien sube la foto que no era— el contenido
// anterior no existe en ningún sitio del que recuperarlo. Con el espejo, cada cambio es un commit:
// se ve exactamente qué cambió, cuándo, y se puede revertir.
//
// Todo esto es best-effort. Si GitHub falla, el KB de ElevenLabs YA se actualizó y Maite funciona
// igual: lo único que se pierde es el historial de ese cambio. Nunca debe tumbar la actualización.

const API = 'https://api.github.com'

interface ArchivoRepo {
  name: string
  path: string
  sha: string
}

// El código va seguido de guion para que "KB9-1" no encaje con "KB9-10".
function encajaCodigo(nombreArchivo: string, kbCode: string): boolean {
  return nombreArchivo.toUpperCase().startsWith(`${kbCode.toUpperCase()}-`)
}

async function llamarGitHub(env: Env, ruta: string, init?: RequestInit) {
  return fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'asistentecarmen-worker',
      ...(init?.headers || {})
    }
  })
}

// Se busca el nombre real del archivo en el repo en vez de guardar un mapa de códigos a nombres.
// Un mapa fijo se desincroniza en silencio en cuanto alguien renombra un .md, y el fallo sería
// justo el que estamos intentando evitar: creer que hay respaldo cuando no lo hay.
async function buscarArchivoDeKb(env: Env, kbCode: string): Promise<ArchivoRepo | null> {
  const res = await llamarGitHub(env, `/repos/${env.GITHUB_REPO}/contents/kb?ref=${env.GITHUB_BRANCH}`)
  if (!res.ok) throw new Error(`GitHub listar kb/ ${res.status}: ${await res.text()}`)
  const archivos = (await res.json()) as ArchivoRepo[]
  return archivos.find((a) => encajaCodigo(a.name, kbCode)) || null
}

// btoa no vale: rompe con acentos, y estos documentos están llenos ("Antropología", "Pío XII").
// Hay que pasar por UTF-8 byte a byte antes de codificar en base64.
function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

export interface ResultadoEspejo {
  ok: boolean
  motivo?: string
  archivo?: string
  commit?: string
}

export async function espejarKbEnRepo(
  env: Env,
  kbCode: string,
  contenido: string,
  descripcionCambio: string
): Promise<ResultadoEspejo> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO || !env.GITHUB_BRANCH) {
    return { ok: false, motivo: 'Falta configurar GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH' }
  }

  const archivo = await buscarArchivoDeKb(env, kbCode)
  if (!archivo) {
    return { ok: false, motivo: `No hay ningún archivo en kb/ que empiece por "${kbCode}-"` }
  }

  // El sha del archivo actual es obligatorio para sobrescribir: es lo que le dice a GitHub "estoy
  // reemplazando ESTA versión". Si alguien tocó el archivo entretanto, el sha no coincide y GitHub
  // rechaza el commit en vez de pisar el cambio ajeno.
  const res = await llamarGitHub(env, `/repos/${env.GITHUB_REPO}/contents/${archivo.path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `KB ${kbCode}: ${descripcionCambio}\n\nActualizado automáticamente desde la app.`,
      content: aBase64(contenido),
      sha: archivo.sha,
      branch: env.GITHUB_BRANCH
    })
  })

  if (!res.ok) {
    return { ok: false, motivo: `GitHub PUT ${res.status}: ${(await res.text()).slice(0, 200)}` }
  }

  const datos = (await res.json()) as { commit?: { sha?: string } }
  return { ok: true, archivo: archivo.path, commit: datos.commit?.sha?.slice(0, 7) }
}
