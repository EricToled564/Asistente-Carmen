import type { Env } from '../types.js'

// Cuándo se actualizó el horario (KB8) por última vez — para que el recordatorio push de
// "sube tu horario" no siga insistiendo cuando ya está cargado (ej. el semestre 1 ya viene
// precargado en KB8-horario.md desde el arranque, no hace falta que Carmen lo vuelva a subir).
const KEY = 'horario:ultimaActualizacion'

// Si la última actualización es más reciente que esto, el recordatorio se salta. Menor que la
// separación entre los dos disparos del cron (25-ago / 20-dic, ~117 días) para que SIEMPRE
// vuelva a avisar del semestre que todavía no se ha subido, pero mayor que el margen normal
// entre "se subió el horario" y "llegó el siguiente disparo de este mismo semestre".
const DIAS_VIGENCIA = 120

export async function marcarHorarioActualizado(env: Env): Promise<void> {
  await env.KV.put(KEY, new Date().toISOString())
}

export async function debeRecordarHorario(env: Env): Promise<boolean> {
  const ultima = await env.KV.get(KEY)
  if (!ultima) return true
  const dias = (Date.now() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24)
  return dias >= DIAS_VIGENCIA
}

// Versión estructurada del horario (para que la app la RENDERICE como tabla, no solo para que
// Maite la lea en conversación). Se llena cuando Carmen sube uno nuevo vía "Actualizar mi info";
// si nunca se ha subido nada (ej. recién desplegado), GET /horario devuelve null y la app cae al
// horario del semestre 1 precargado en app/src/data/horario.js.
const KEY_DATOS = 'horario:datos'

export interface ClaseHorario {
  dia: string
  hora: string
  materia: string
  aula: string
}

export interface HorarioEstructurado {
  grupo: string
  cursoAcademico: string
  actualizadoEn: string
  notas: string[]
  clases: ClaseHorario[]
}

export async function guardarHorarioEstructurado(env: Env, datos: HorarioEstructurado): Promise<void> {
  await env.KV.put(KEY_DATOS, JSON.stringify(datos))
}

export async function obtenerHorarioEstructurado(env: Env): Promise<HorarioEstructurado | null> {
  const raw = await env.KV.get(KEY_DATOS)
  return raw ? (JSON.parse(raw) as HorarioEstructurado) : null
}
