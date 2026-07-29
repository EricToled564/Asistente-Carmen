// Pruebas del cliente del portal de horarios.
//
// La red no se toca: se le da a `fetch` la respuesta REAL que devolvió el portal de la Universidad
// de Navarra el 29-jul-2026 (guardada en portalHorarios.fixture.json, 255 eventos de los cuatro
// cursos del grado). Así se comprueba la parte que de verdad puede fallar —cómo se interpretan esos
// datos— sin depender de que la universidad esté levantada ni de que este sandbox tenga salida.
//
// Correr con: node --test src/lib/portalHorarios.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const aqui = dirname(fileURLToPath(import.meta.url))
const EVENTOS = JSON.parse(readFileSync(join(aqui, 'portalHorarios.fixture.json'), 'utf8'))

const { normalizar, filtrar, limpiarMateria, semestreDe, fechaReal, traerHorarioDelPortal } = await import(
  '../../.test-build/portalHorarios.mjs'
)

const h = normalizar(EVENTOS)
const D = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const linea = (c) => `${D[c.dia]} ${c.inicio}-${c.fin} ${c.materia} @ ${c.aulas.join(',')}`

test('el primer semestre de primero sale exactamente como lo publica la UNAV', () => {
  const { clases } = filtrar(h, 1, 1)
  assert.deepEqual(
    clases.filter((c) => c.semestre === 1).map(linea),
    [
      'Lunes 10:00-12:00 CORE- Anthropology @ AMI-P0-Aula005',
      'Lunes 10:00-12:00 CORE- Antropología I @ ARQ-P1-AULA5',
      'Martes 09:00-12:00 Design Studio I (Design thinking) @ ARQ-P1-AULA6',
      'Martes 12:00-13:00 Design Studio I (Design thinking) @ ARQ-P2-TALLER4A',
      'Martes 15:30-17:30 Design Studio I (Design thinking) @ ARQ-P2-TALLER4A',
      'Miércoles 09:30-12:00 Form and Image (Geometries) @ ARQ-P1-AULA5',
      'Miércoles 12:00-13:00 Form and Image (Geometries) @ ARQ-P2-TALLER4A',
      'Jueves 10:00-14:00 Art culture of the last century @ ARQ-P0-MAGNA',
      'Viernes 09:00-12:00 Comprehensive Lab I (Graphics 2D) @ ARQ-P1-AULA5',
      'Viernes 12:00-13:00 Comprehensive Lab I (Graphics 2D) @ ARQ-P2-TALLER4A'
    ]
  )
})

test('cada asignatura trae su profesor', () => {
  const { clases } = filtrar(h, 1, 1)
  const de = (m) => clases.find((c) => c.materia.includes(m))?.profesores.join(', ')
  assert.equal(de('Design Studio I'), 'Javier Antón Sancho')
  assert.equal(de('Art culture'), 'Diego Javier Caro Serrano')
  assert.equal(de('Form and Image'), 'Juan Luis Roquette Rodríguez-Villamil')
  assert.equal(de('Comprehensive Lab I'), 'Cristina María Sanz Larrea')
  assert.equal(de('Antropología I'), 'Raquel Cascales Tornel')
  assert.equal(de('Anthropology'), 'Miguel García-Valdecasas Merino')
  assert.ok(clases.every((c) => c.profesores.length > 0), 'ninguna clase puede quedarse sin profesor')
})

test('el segundo semestre existe y no se mezcla con el primero', () => {
  const { clases } = filtrar(h, 1, 2)
  const soloDel2 = clases.filter((c) => c.semestre === 2)
  assert.equal(soloDel2.length, 10)
  assert.ok(soloDel2.some((c) => c.materia.includes('Form and Matter')))
  assert.ok(soloDel2.some((c) => c.materia.includes('Design Studio II')))
  // Y ninguna del primero se cuela.
  assert.ok(!soloDel2.some((c) => c.materia.includes('Design Studio I (')))
})

test('lo que no es de Diseño no entra en el horario de Diseño', () => {
  // "Tradiciones Creativas en la Cultura Hispana" es de 2º. Su evento incluye además grupos de
  // primero de OTRA titulación (Int.Found), y coger el primer grupo la metía en 1º de Diseño.
  const { clases } = filtrar(h, 1)
  assert.ok(!clases.some((c) => c.materia.includes('Tradiciones Creativas')))
  assert.ok(filtrar(h, 2).clases.some((c) => c.materia.includes('Tradiciones Creativas')))
})

test('una clase de un solo día no entra en la parrilla semanal', () => {
  // La recuperación de Antropología del 30-nov viene marcada como "Clases" pero es un solo día.
  // En la parrilla diría que tiene Antropología todos los lunes a las 16:00, que es falso.
  const { clases, sesiones } = filtrar(h, 1)
  assert.ok(!clases.some((c) => c.inicio === '16:00'))
  assert.ok(sesiones.some((s) => s.fecha === '2026-11-30' && s.inicio === '16:00'))
})

test('lo que cruza el cambio de año se marca como anual, no como del primer semestre', () => {
  const anuales = filtrar(h, 1).clases.filter((c) => c.semestre === null)
  assert.equal(anuales.length, 1)
  assert.match(anuales[0].materia, /Conferencia/)
  // Y por tanto aparece en los dos semestres.
  assert.ok(filtrar(h, 1, 1).clases.includes(anuales[0]))
  assert.ok(filtrar(h, 1, 2).clases.includes(anuales[0]))
})

test('las sesiones sueltas traen la fecha real, no la semana', () => {
  const { sesiones } = filtrar(h, 1, 1)
  const f = sesiones.map((s) => `${s.fecha} ${s.inicio}-${s.fin}`)
  assert.deepEqual(f, [
    '2026-11-30 16:00-18:00',
    '2026-12-01 09:00-14:00',
    '2026-12-02 09:00-13:00',
    '2026-12-10 09:00-18:00',
    '2026-12-14 09:00-14:00',
    '2026-12-18 09:00-14:00'
  ])
})

test('fechaReal suma el día al lunes de la semana', () => {
  assert.equal(fechaReal('2026-11-30', 0), '2026-11-30') // lunes
  assert.equal(fechaReal('2026-11-30', 1), '2026-12-01') // martes, cruzando de mes
  assert.equal(fechaReal('2026-12-28', 4), '2027-01-01') // viernes, cruzando de año
})

test('semestreDe distingue primero, segundo y anual', () => {
  assert.equal(semestreDe('2026/2027 Primer semestre', '2026-09-07'), 1)
  assert.equal(semestreDe('2026/2027 Segundo semestre', '2027-01-11'), 2)
  assert.equal(semestreDe(null, '2026-09-07', '2026-11-23'), 1)
  assert.equal(semestreDe(null, '2027-01-11', '2027-04-19'), 2)
  assert.equal(semestreDe(null, '2026-08-31', '2027-04-19'), null) // cruza el año: anual
})

test('limpiarMateria quita el ruido del portal y no se come el nombre', () => {
  assert.equal(limpiarMateria('Design Studio I (Design thinking). (Gr. Diseño)'), 'Design Studio I (Design thinking)')
  assert.equal(limpiarMateria('Form and Matter (Properties). Gr. Diseño'), 'Form and Matter (Properties)')
  assert.equal(limpiarMateria('CORE- Antropología I (Gr. Diseño) (1º sem)'), 'CORE- Antropología I')
  assert.equal(limpiarMateria('CORE- Anthropology (área Ciencias Sociales)'), 'CORE- Anthropology')
  assert.equal(limpiarMateria(''), '')
})

test('los cuatro cursos se separan bien (es lo que hará falta cuando ella avance)', () => {
  for (const curso of [1, 2, 3, 4]) {
    const { clases } = filtrar(h, curso)
    assert.ok(clases.length > 0, `${curso}º curso debería tener clases`)
    assert.ok(clases.every((c) => c.cursos.includes(curso)))
  }
  const seg = filtrar(h, 2, 1).clases.filter((c) => c.semestre === 1)
  assert.ok(seg.some((c) => c.materia.includes('Taller de Diseño III')))
  assert.ok(seg.every((c) => c.profesores.length > 0))
})

// --- La parte de red, con fetch simulado -----------------------------------------------------

test('traerHorarioDelPortal encadena config, token y búsqueda', async () => {
  const pedidas = []
  globalThis.fetch = async (url, opts) => {
    const u = String(url)
    pedidas.push(u)
    if (u.includes('app-settings')) {
      return new Response(
        JSON.stringify({
          apiBaseUrl: 'https://api.ejemplo/api',
          authConfig: { issuer: 'https://is.ejemplo', clientId: 'X', clientSecret: 'Y', scope: 'z' }
        }),
        { status: 200 }
      )
    }
    if (u.includes('/connect/token')) {
      assert.match(String(opts.body), /grant_type=client_credentials/)
      return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 })
    }
    assert.equal(opts.headers.Authorization, 'Bearer tok')
    assert.match(String(opts.body), /StudentGroups\.CurricularPlan\.Course\.Id/)
    return new Response(JSON.stringify({ data: { data: EVENTOS } }), { status: 200 })
  }

  const r = await traerHorarioDelPortal()
  assert.equal(pedidas.length, 3)
  assert.equal(r.cursoAcademico, '2026/2027')
  assert.ok(r.clases.length > 100)
  assert.ok(r.obtenido)
})

test('si el portal falla, el error dice cuál de los tres pasos se rompió', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 503 })
  await assert.rejects(traerHorarioDelPortal(), /configuración del portal \(503\)/)

  globalThis.fetch = async (url) =>
    String(url).includes('app-settings')
      ? new Response(JSON.stringify({ apiBaseUrl: 'a', authConfig: { issuer: 'b', clientId: 'c', clientSecret: 'd', scope: 'e' } }), { status: 200 })
      : new Response('nope', { status: 401 })
  await assert.rejects(traerHorarioDelPortal(), /no me dio token \(401\)/)
})
