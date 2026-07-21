import type { Env } from '../types.js'
import { investigarFuente } from '../lib/claude.js'
import { getKbDocument, updateKbDocument } from '../lib/elevenlabs.js'

interface DocConfig {
  nombre: string
  fuenteUrl: string
  getDocId: (env: Env) => string
  instrucciones: string
}

// Mecanismo A: 4 pasos (investigar → comparar → decidir → actualizar), sesgo a NO tocar ante
// ambigüedad. Corre por cron, sin intervención humana. Ver arquitectura-agente-navarra.md §9-BIS.
const DOCS_SEMESTRALES: DocConfig[] = [
  {
    nombre: 'KB1 Plan Grado en Diseño',
    fuenteUrl: 'https://www.unav.edu/web/grado-en-diseno/plan-de-estudios',
    getDocId: (env) => env.KB_DOC_ID_GRADO_DISENO,
    instrucciones: 'Busca cambios en el plan de estudios, menciones (Producto/Moda/Servicios), regla de expediente, o idioma de clases.'
  },
  {
    nombre: 'KB2 Plan Ing. Diseño Industrial',
    fuenteUrl: 'https://www.unav.edu',
    getDocId: (env) => env.KB_DOC_ID_ING_DISENO,
    instrucciones: 'Busca cambios en el plan 2025 (240 ECTS) o itinerarios de Ingeniería en Diseño Industrial (Tecnun).'
  },
  {
    nombre: 'KB3 Alojamiento',
    fuenteUrl: 'https://www.unav.edu/admision-y-ayudas/alojamiento',
    getDocId: (env) => env.KB_DOC_ID_ALOJAMIENTO,
    instrucciones: 'Busca cambios en el directorio de colegios mayores y residencias (dirección, teléfono, web).'
  },
  {
    nombre: 'KB4 Campus Pamplona',
    fuenteUrl: 'https://www.unav.edu',
    getDocId: (env) => env.KB_DOC_ID_CAMPUS,
    instrucciones: 'Busca cambios en edificios clave, servicios o gestión de espacios del campus.'
  }
]

const DOCS_MENSUALES: DocConfig[] = [
  {
    nombre: 'KB5 Movilidad',
    fuenteUrl: 'https://www.tuvillavesa.es',
    getDocId: (env) => env.KB_DOC_ID_MOVILIDAD,
    instrucciones: 'Busca cambios en líneas, tarifas, horario de verano/invierno, o la tarjeta de transporte.'
  },
  {
    nombre: 'KB6 Trámites de llegada',
    fuenteUrl: 'https://parainmigrantes.info',
    getDocId: (env) => env.KB_DOC_ID_TRAMITE,
    instrucciones: 'Busca cambios en empadronamiento, TIE (plazos, tasa EX-17), banco, sanidad o móvil.'
  }
]

async function investigarYActualizarDoc(env: Env, doc: DocConfig) {
  const documentId = doc.getDocId(env)
  if (!documentId || documentId.startsWith('REEMPLAZA')) {
    console.warn(`[kb-cron] ${doc.nombre}: falta configurar el document_id, se omite`)
    return
  }

  try {
    const [actual, investigacionRaw] = await Promise.all([
      getKbDocument(env.ELEVENLABS_API_KEY, documentId),
      investigarFuente(env.ANTHROPIC_API_KEY, doc.fuenteUrl, doc.instrucciones)
    ])

    let investigacion: { cambios: boolean; contenido_nuevo?: string; resumen_del_cambio?: string; fuente_citada?: string }
    try {
      investigacion = JSON.parse(investigacionRaw)
    } catch {
      console.warn(`[kb-cron] ${doc.nombre}: respuesta no era JSON válido, se omite por seguridad (sesgo a no tocar)`)
      return
    }

    if (!investigacion.cambios || !investigacion.fuente_citada) {
      console.log(`[kb-cron] ${doc.nombre}: sin cambios confirmados, no se toca`)
      return
    }

    // Comparación mínima: si el contenido nuevo es idéntico al actual, no hay nada que hacer.
    if (investigacion.contenido_nuevo?.trim() === actual.trim()) {
      console.log(`[kb-cron] ${doc.nombre}: contenido nuevo es igual al actual, no se toca`)
      return
    }

    await updateKbDocument(env.ELEVENLABS_API_KEY, documentId, investigacion.contenido_nuevo || actual)
    console.log(`[kb-cron] ${doc.nombre}: actualizado. Resumen: ${investigacion.resumen_del_cambio}. Fuente: ${investigacion.fuente_citada}`)
  } catch (err) {
    // Nunca fallar en silencio ni borrar el documento existente — solo loguear y reintentar
    // en el próximo ciclo del cron.
    console.error(`[kb-cron] ${doc.nombre}: error, se reintenta en el próximo ciclo`, err)
  }
}

export async function ejecutarAutoInvestigacionSemestral(env: Env) {
  for (const doc of DOCS_SEMESTRALES) await investigarYActualizarDoc(env, doc)
}

export async function ejecutarAutoInvestigacionMensual(env: Env) {
  for (const doc of DOCS_MENSUALES) await investigarYActualizarDoc(env, doc)
}
