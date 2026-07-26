import type { Env } from '../types.js'
import { investigarFuente } from '../lib/claude.js'
import { getKbDocument } from '../lib/elevenlabs.js'
import { fusionarYActualizarKb } from '../lib/kbMerge.js'
import { getKbDocId } from '../lib/kbRegistry.js'

interface DocConfig {
  nombre: string
  kbCode: string
  fuenteUrl: string
  instrucciones: string
}

// Mecanismo A: 4 pasos (investigar → comparar → decidir → actualizar), sesgo a NO tocar ante
// ambigüedad. Corre por cron, sin intervención humana. Ver arquitectura-agente-navarra.md §9-BIS.
// El document_id de cada kbCode vive en el registro de KV (lib/kbRegistry.ts), no en env vars.
const DOCS_SEMESTRALES: DocConfig[] = [
  {
    nombre: 'KB1 Plan Grado en Diseño',
    kbCode: 'KB1',
    fuenteUrl: 'https://www.unav.edu/web/grado-en-diseno/plan-de-estudios',
    instrucciones: 'Busca cambios en el plan de estudios, menciones (Producto/Moda/Servicios), regla de expediente, o idioma de clases.'
  },
  {
    nombre: 'KB2 Plan Ing. Diseño Industrial',
    kbCode: 'KB2',
    fuenteUrl: 'https://www.unav.edu',
    instrucciones: 'Busca cambios en el plan 2025 (240 ECTS) o itinerarios de Ingeniería en Diseño Industrial (Tecnun).'
  },
  {
    nombre: 'KB3 Alojamiento',
    kbCode: 'KB3',
    fuenteUrl: 'https://www.unav.edu/admision-y-ayudas/alojamiento',
    instrucciones: 'Busca cambios en el directorio de colegios mayores y residencias (dirección, teléfono, web), y en CampusHome específicamente.'
  },
  {
    nombre: 'KB4 Campus Pamplona',
    kbCode: 'KB4',
    fuenteUrl: 'https://www.unav.edu',
    instrucciones: 'Busca cambios en edificios clave, servicios o gestión de espacios del campus.'
  }
  // KB9-x (guías docentes): el prompt v2 las marca como semestrales vía asignatura.unav.edu, pero
  // cada una necesita su URL específica de guía docente — no se pudieron obtener/verificar 19 URLs
  // reales durante esta construcción. Agrégalas aquí conforme las tengas, con el mismo shape:
  // { nombre: 'KB9-4 Design Studio I', kbCode: 'KB9-4', fuenteUrl: '...', instrucciones: '...' }
]

const DOCS_MENSUALES: DocConfig[] = [
  {
    nombre: 'KB5 Movilidad',
    kbCode: 'KB5',
    fuenteUrl: 'https://www.tuvillavesa.es',
    instrucciones: 'Busca cambios en líneas, tarifas, horario de verano/invierno, o la tarjeta de transporte.'
  },
  {
    nombre: 'KB6 Trámites de llegada',
    kbCode: 'KB6',
    fuenteUrl: 'https://parainmigrantes.info',
    instrucciones: 'Busca cambios en empadronamiento, TIE (plazos, tasa EX-17), banco, sanidad o móvil.'
  }
]

async function investigarYActualizarDoc(env: Env, doc: DocConfig) {
  const documentId = await getKbDocId(env, doc.kbCode)
  if (!documentId) {
    console.warn(`[kb-cron] ${doc.nombre}: falta el document_id de ${doc.kbCode} en el registro de KV, se omite`)
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

    // Con guardia de proporción. Este camino es el más peligroso de los tres que escriben en el
    // KB: corre solo, de madrugada, sin que nadie revise nada. Si la investigación devuelve un
    // documento recortado, aquí no hay una persona delante que lo note — se escribiría y nadie se
    // enteraría hasta que Maite dejara de saber algo.
    const resultado = await fusionarYActualizarKb(env, documentId, investigacion.contenido_nuevo || actual)
    if (!resultado.ok) {
      console.error(`[kb-cron] ${doc.nombre}: NO se actualizó. ${resultado.motivo}`)
      return
    }
    console.log(
      `[kb-cron] ${doc.nombre}: actualizado (${resultado.largoAntes} → ${resultado.largoDespues} caracteres). ` +
        `Resumen: ${investigacion.resumen_del_cambio}. Fuente: ${investigacion.fuente_citada}`
    )
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
