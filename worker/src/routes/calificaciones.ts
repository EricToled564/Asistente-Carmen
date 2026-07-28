import { Hono } from 'hono'
import type { Env } from '../types.js'
import { EVALUACION } from '../data/evaluacion.js'
import { PLAN_ESTUDIOS, bloqueDe } from '../data/planEstudios.js'
import { extraerEvaluacionDeGuia } from '../lib/extraerEvaluacion.js'
import { leer, escribir, calcular, estructuraDe, type CalculoMateria } from '../lib/calificacionesStore.js'

export const calificaciones = new Hono<{ Bindings: Env }>()

function nombreDe(kbCode: string, dado?: string): string {
  return (
    dado?.trim() ||
    EVALUACION.find((e) => e.kbCode === kbCode)?.materia ||
    PLAN_ESTUDIOS.flatMap((b) => b.materias).find((m) => m.kbCode === kbCode)?.titulo ||
    kbCode
  )
}

// Qué asignaturas se enseñan: las nueve transcritas a mano, más las que ella haya preparado o
// montado. Deliberadamente NO se listan las 51 del plan: una pantalla con cuarenta asignaturas de
// tercero y cuarto sin una sola nota no informa de nada y esconde las cinco que sí importan.
function codigosConEstructura(
  personalizados: Record<string, unknown>,
  derivados: Record<string, unknown>
): string[] {
  const vistos = new Set<string>()
  const salida: string[] = []
  for (const k of [...EVALUACION.map((e) => e.kbCode), ...Object.keys(derivados), ...Object.keys(personalizados)]) {
    if (!vistos.has(k)) {
      vistos.add(k)
      salida.push(k)
    }
  }
  return salida
}

// GET /calificaciones — todas las materias con desglose, con lo que lleva y lo que le falta.
calificaciones.get('/calificaciones', async (c) => {
  const { notas, personalizados, derivados } = await leer(c.env)

  // Las oficiales primero, y después cualquier materia que ella se haya montado a mano.
  const codigos = codigosConEstructura(personalizados, derivados)

  const materias = codigos.map((kbCode) => calcular(kbCode, nombreDe(kbCode), notas[kbCode] || {}, personalizados, derivados))

  return c.json({
    materias,
    resumen: {
      total: materias.length,
      empezadas: materias.filter((m) => m.pesoEvaluado > 0).length,
      completas: materias.filter((m) => m.pesoEvaluado >= 100).length,
      enRiesgo: materias.filter((m) => m.imposibleAprobar || m.minimosEnRiesgo.length > 0).length
    }
  })
})

// POST /calificaciones — {kbCode, componenteId, nota}. nota entre 0 y 10.
calificaciones.post('/calificaciones', async (c) => {
  const body = await c.req.json<{ kbCode?: string; componenteId?: string; nota?: number }>()
  const kbCode = body.kbCode?.trim()
  const componenteId = body.componenteId?.trim()

  if (!kbCode || !componenteId) {
    return c.json({ error: 'Faltan "kbCode" y/o "componenteId"' }, 400)
  }
  // Se valida el rango porque el número entra a mano desde un móvil. Un 85 en vez de 8,5 —el error
  // de tecleo más fácil de cometer aquí— dispararía el promedio y le diría que va sobrada.
  if (typeof body.nota !== 'number' || Number.isNaN(body.nota) || body.nota < 0 || body.nota > 10) {
    return c.json({ error: 'La nota tiene que ser un número entre 0 y 10' }, 400)
  }

  const almacen = await leer(c.env)
  const { componentes } = estructuraDe(kbCode, almacen.personalizados, almacen.derivados)
  if (!componentes.some((x) => x.id === componenteId)) {
    return c.json({ error: `"${componenteId}" no es un apartado de ${kbCode}` }, 404)
  }

  almacen.notas[kbCode] = { ...(almacen.notas[kbCode] || {}), [componenteId]: body.nota }
  await escribir(c.env, almacen)

  const calculo = calcular(kbCode, nombreDe(kbCode), almacen.notas[kbCode], almacen.personalizados, almacen.derivados)
  return c.json({ ok: true, materia: calculo })
})

// DELETE /calificaciones/:kbCode/:componenteId — se equivocó al meterla, o se la revisaron.
calificaciones.delete('/calificaciones/:kbCode/:componenteId', async (c) => {
  const kbCode = c.req.param('kbCode')
  const componenteId = c.req.param('componenteId')

  const almacen = await leer(c.env)
  if (almacen.notas[kbCode]) {
    delete almacen.notas[kbCode][componenteId]
    await escribir(c.env, almacen)
  }
  return c.json({ ok: true, materia: calcular(kbCode, nombreDe(kbCode), almacen.notas[kbCode] || {}, almacen.personalizados, almacen.derivados) })
})

// POST /calificaciones/estructura — para las materias sin desglose oficial (2º a 4º).
calificaciones.post('/calificaciones/estructura', async (c) => {
  const body = await c.req.json<{
    kbCode?: string
    materia?: string
    componentes?: Array<{ id?: string; nombre?: string; peso?: number; minimo?: number }>
  }>()
  const kbCode = body.kbCode?.trim()
  if (!kbCode) return c.json({ error: 'Falta "kbCode"' }, 400)
  if (EVALUACION.some((e) => e.kbCode === kbCode)) {
    return c.json({ error: 'Esa materia ya tiene su desglose oficial de la guía docente' }, 409)
  }
  const lista = body.componentes || []
  if (!lista.length) return c.json({ error: 'Manda al menos un apartado' }, 400)

  const componentes = lista.map((x, i) => ({
    id: x.id?.trim() || `c${i + 1}`,
    nombre: x.nombre?.trim() || `Apartado ${i + 1}`,
    peso: Number(x.peso) || 0,
    minimo: typeof x.minimo === 'number' ? x.minimo : undefined
  }))

  const suma = componentes.reduce((t, x) => t + x.peso, 0)
  // Sin esta comprobación, unos pesos que sumaran 80 darían un promedio inflado y ella no tendría
  // forma de notarlo: el número saldría bien formado, solo que mal.
  if (Math.abs(suma - 100) > 0.5) {
    return c.json({ error: `Los porcentajes suman ${suma} y tienen que sumar 100` }, 400)
  }

  const almacen = await leer(c.env)
  almacen.personalizados[kbCode] = componentes
  await escribir(c.env, almacen)
  return c.json({ ok: true, materia: calcular(kbCode, nombreDe(kbCode, body.materia), almacen.notas[kbCode] || {}, almacen.personalizados, almacen.derivados) })
})

// GET /calificaciones/consulta?materia= — la que llama Maite por voz.
//
// Devuelve frases ya redactadas además de los números. Un agente de voz que recibe
// {pesoEvaluado: 60, necesarioParaAprobar: 3.25} tiende a leerlos tal cual, y "tu peso evaluado es
// sesenta" no se lo dice nadie a nadie. Dándole la frase hecha, dice algo que suena a persona.
calificaciones.get('/calificaciones/consulta', async (c) => {
  const { notas, personalizados, derivados } = await leer(c.env)
  const buscada = (c.req.query('materia') || '').trim().toLowerCase()

  const codigos = codigosConEstructura(personalizados, derivados)
  let materias = codigos.map((kbCode) => calcular(kbCode, nombreDe(kbCode), notas[kbCode] || {}, personalizados, derivados))

  if (buscada) {
    const coincide = materias.filter(
      (m) => m.materia.toLowerCase().includes(buscada) || m.kbCode.toLowerCase() === buscada
    )
    if (!coincide.length) {
      return c.json({
        encontradas: 0,
        mensaje: `No tengo ninguna asignatura que se llame "${c.req.query('materia')}". Pregúntale a Carmen cuál es exactamente.`
      })
    }
    materias = coincide
  }

  const conNotas = materias.filter((m) => m.pesoEvaluado > 0)
  if (!conNotas.length) {
    return c.json({
      encontradas: 0,
      mensaje:
        'Carmen todavía no ha registrado ninguna nota parcial. No le des un promedio ni lo estimes: dile que las puede ir metiendo en Académico, en Mi Progreso, según se las vayan dando.'
    })
  }

  return c.json({
    encontradas: conNotas.length,
    materias: conNotas.map((m) => ({
      materia: m.materia,
      resumen: frase(m),
      // Los números también, por si necesita compararlos — pero la frase va primero.
      notaHastaAhora: m.notaHastaAhora,
      pesoEvaluado: m.pesoEvaluado,
      necesarioParaAprobar: m.necesarioParaAprobar,
      avisos: [...m.minimosEnRiesgo, ...(m.aviso ? [m.aviso] : [])]
    })),
    comoDecirlo:
      'Lee los números como se dicen hablando: "ocho coma cinco", no "8.5". Y no la presiones: si va justa, dilo con calma y céntrate en qué le queda por hacer, no en lo que ya no puede cambiar.'
  })
})

function frase(m: CalculoMateria): string {
  const partes: string[] = []
  partes.push(`En ${m.materia} lleva ${m.notaHastaAhora} de media, con el ${m.pesoEvaluado}% de la asignatura ya evaluado.`)

  if (m.aprobadaYa) {
    partes.push('Ya la tiene aprobada pase lo que pase en lo que queda.')
  } else if (m.imposibleAprobar) {
    partes.push(
      'Con lo que queda ya no le dan los números para aprobar en la convocatoria ordinaria. Díselo con cuidado y háblale de la extraordinaria, que existe.'
    )
  } else if (m.necesarioParaAprobar !== null) {
    partes.push(`Para aprobar necesita sacar ${m.necesarioParaAprobar} de media en lo que le falta.`)
  }

  if (m.minimosEnRiesgo.length) {
    partes.push(`Ojo con esto: ${m.minimosEnRiesgo.join('; ')}. Con eso la asignatura suspende aunque la media dé.`)
  }
  if (!m.oficial) {
    partes.push('El desglose de esta asignatura lo puso Carmen a mano, no sale de la guía docente.')
  }
  return partes.join(' ')
}

// --- Preparar el siguiente semestre ---------------------------------------------------------
//
// Las nueve asignaturas de primero tienen su desglose transcrito a mano. Las otras cuarenta no, y
// copiarlas todas de golpe habría sido transcribir cuarenta párrafos de porcentajes para
// asignaturas que Carmen cursará dentro de tres años, con guías docentes que para entonces habrán
// cambiado.
//
// Así que se hace cuando toca: ella termina un semestre, pulsa preparar el siguiente, y se leen
// las guías de ESAS cinco o seis asignaturas —las que hay en la base de conocimiento ese día— para
// sacar los pesos. Cada seis meses, siempre con la versión vigente.

// GET /calificaciones/semestres — qué semestres hay y cuáles ya están preparados.
calificaciones.get('/calificaciones/semestres', async (c) => {
  const { personalizados, derivados, notas } = await leer(c.env)

  return c.json({
    semestres: PLAN_ESTUDIOS.map((b) => {
      const materias = b.materias.map((m) => {
        const { origen } = estructuraDe(m.kbCode, personalizados, derivados)
        return {
          kbCode: m.kbCode,
          titulo: m.titulo,
          origen,
          preparada: origen !== 'ninguno',
          // Si ya tiene notas metidas, preparar de nuevo no las borra — pero conviene decirlo en la
          // pantalla antes de que le dé al botón, no después.
          tieneNotas: Object.keys(notas[m.kbCode] || {}).length > 0
        }
      })
      return {
        curso: b.curso,
        semestre: b.semestre,
        materias,
        preparadas: materias.filter((m) => m.preparada).length,
        total: materias.length
      }
    })
  })
})

// POST /calificaciones/preparar — {curso, semestre}. Lee las guías y PROPONE. No guarda nada.
//
// Devolver una propuesta en vez de guardar directamente es el mismo criterio que en "Actualizar mi
// info": la extracción es buena pero no infalible, y un peso mal leído no da error — da un
// promedio equivocado que ella se va a creer durante todo el semestre. Que lo vea primero.
calificaciones.post('/calificaciones/preparar', async (c) => {
  const body = await c.req.json<{ curso?: number; semestre?: number }>()
  const curso = Number(body.curso)
  const semestre = Number(body.semestre)

  const bloque = bloqueDe(curso, semestre)
  if (!bloque) {
    return c.json({ error: `No tengo el curso ${body.curso}, semestre ${body.semestre} en el plan de estudios` }, 404)
  }

  const { personalizados, derivados } = await leer(c.env)

  // Las que ya tienen desglose se dejan en paz: volver a extraerlas gastaría llamadas y podría
  // proponer un reparto distinto del que ella ya revisó y aceptó.
  const pendientes = bloque.materias.filter((m) => estructuraDe(m.kbCode, personalizados, derivados).origen === 'ninguno')

  if (!pendientes.length) {
    return c.json({
      curso,
      semestre,
      propuestas: [],
      mensaje: 'Este semestre ya está preparado entero. No hay nada que hacer.'
    })
  }

  // En serie y no en paralelo: son cinco o seis llamadas a Claude, cada una con una guía docente
  // entera dentro. En paralelo se juntan los tiempos de CPU del Worker y se corre el riesgo de
  // agotar el límite a mitad, dejando media preparación hecha.
  const propuestas = []
  for (const m of pendientes) {
    propuestas.push(await extraerEvaluacionDeGuia(c.env, m.kbCode, m.titulo))
  }

  return c.json({
    curso,
    semestre,
    propuestas,
    resumen: {
      pedidas: pendientes.length,
      correctas: propuestas.filter((p) => p.ok).length,
      conProblema: propuestas.filter((p) => !p.ok).length
    }
  })
})

// POST /calificaciones/confirmar-semestre — guarda las propuestas que ella revisó.
calificaciones.post('/calificaciones/confirmar-semestre', async (c) => {
  const body = await c.req.json<{
    materias?: Array<{
      kbCode?: string
      materia?: string
      componentes?: Array<{ id?: string; nombre?: string; peso?: number; minimo?: number; cuantos?: number }>
      notaMinima?: number
      asistenciaMinima?: number
      aviso?: string
    }>
  }>()

  const lista = body.materias || []
  if (!lista.length) return c.json({ error: 'No mandaste ninguna materia' }, 400)

  const almacen = await leer(c.env)
  const guardadas: string[] = []
  const rechazadas: Array<{ kbCode: string; motivo: string }> = []

  for (const m of lista) {
    const kbCode = m.kbCode?.trim()
    if (!kbCode) {
      rechazadas.push({ kbCode: '(sin código)', motivo: 'Falta el código de la asignatura' })
      continue
    }
    if (EVALUACION.some((e) => e.kbCode === kbCode)) {
      rechazadas.push({ kbCode, motivo: 'Ya tiene su desglose transcrito de la guía docente' })
      continue
    }
    const comps = (m.componentes || []).map((x, i) => ({
      id: x.id?.trim() || `c${i + 1}`,
      nombre: x.nombre?.trim() || `Apartado ${i + 1}`,
      peso: Number(x.peso) || 0,
      minimo: typeof x.minimo === 'number' ? x.minimo : undefined,
      cuantos: typeof x.cuantos === 'number' ? x.cuantos : undefined
    }))
    if (!comps.length) {
      rechazadas.push({ kbCode, motivo: 'No trae apartados' })
      continue
    }
    const suma = Math.round(comps.reduce((t, x) => t + x.peso, 0) * 100) / 100
    if (Math.abs(suma - 100) > 0.5) {
      // Se rechaza aunque venga de la pantalla de revisión: si ella corrigió un peso y se dejó otro,
      // el resultado sumaría 95 y el promedio saldría inflado sin que nada lo indicara.
      rechazadas.push({ kbCode, motivo: `Los porcentajes suman ${suma} y tienen que sumar 100` })
      continue
    }

    almacen.derivados[kbCode] = {
      componentes: comps,
      notaMinima: Number(m.notaMinima) || 5,
      asistenciaMinima: typeof m.asistenciaMinima === 'number' ? m.asistenciaMinima : undefined,
      aviso: m.aviso?.trim() || undefined,
      materia: m.materia?.trim() || kbCode,
      extraidoEn: new Date().toISOString()
    }
    guardadas.push(kbCode)
  }

  if (guardadas.length) await escribir(c.env, almacen)

  return c.json({ ok: guardadas.length > 0, guardadas, rechazadas })
})
