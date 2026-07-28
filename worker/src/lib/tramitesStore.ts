import type { Env } from '../types.js'

// Los trámites de los primeros 30 días, con cita agendable y recordatorios.
//
// Antes esto era una lista de casillas en localStorage. Servía para no olvidarse de que existían,
// pero no para hacerlos: "Agenda cita de TIE" no dice dónde, ni qué llevar, ni que el plazo es de
// un mes desde que aterrizó, ni avisa el día antes. Y viviendo en el navegador, ningún cron podía
// recordarle nada — que es justo lo que hace falta cuando la cita se pidió hace tres semanas.
//
// Por eso el estado vive aquí, en KV: es la única forma de que el Worker pueda mandar el aviso de
// la víspera y el del mismo día.
//
// El contenido de los pasos sale de KB6 (trámites de llegada), que es el documento verificado.
// Donde KB6 avisa de que los requisitos exactos cambian —tasas, documentos, horarios de oficina—
// aquí NO se inventa un dato concreto: se dan los pasos y se manda a confirmarlo. Un dato
// inventado en este módulo es el que más caro sale de toda la app: significa presentarse a una
// cita de extranjería sin un papel.

export type TipoTramite = 'cita' | 'configuracion'
export type EstadoTramite = 'pendiente' | 'agendado' | 'hecho'

export interface TramiteCatalogo {
  id: string
  titulo: string
  icono: string
  tipo: TipoTramite
  resumen: string
  porQue: string
  plazo?: string
  pasos: string[]
  queLlevar?: string[]
  aviso?: string
}

export interface Cita {
  fecha: string // YYYY-MM-DD, hora de Pamplona
  hora: string // HH:MM, hora de Pamplona
  lugar?: string
  notas?: string
}

export interface EstadoGuardado {
  estado: EstadoTramite
  cita?: Cita
  completadoEn?: string
  // Qué avisos ya se mandaron, para no repetirlos cada día que corre el cron.
  recordatorios?: { vispera?: string; mismoDia?: string; seguimiento?: string }
}

// La fecha y la hora se guardan como texto plano ("2026-08-15", "09:30") y SIEMPRE significan hora
// de Pamplona.
//
// Guardarlas como instante UTC obligaría a convertir en el navegador, que usa la zona del móvil:
// si Carmen agenda una cita estando en México de vacaciones, o con el móvil mal configurado, la
// cita se guardaría desplazada varias horas y el aviso llegaría el día que no es. Con texto plano
// no hay ninguna conversión que pueda salir mal — el cron compara cadenas contra la fecha de
// Pamplona y ya está.

export const CATALOGO: TramiteCatalogo[] = [
  {
    id: 'empadronamiento',
    titulo: 'Empadronamiento',
    icono: '🏛️',
    tipo: 'cita',
    resumen: 'Registrarte en el Ayuntamiento de Pamplona como residente.',
    porQue: 'Va primero porque varios de los demás trámites lo piden. Sin esto, el banco y parte del papeleo se atascan.',
    plazo: 'Cuanto antes. Es el que desbloquea a los demás.',
    pasos: [
      'Pide cita previa en el Ayuntamiento de Pamplona. Pregúntale a Maite cómo se pide ahora mismo, que cambia.',
      'Reúne el pasaporte y un papel que demuestre dónde vives.',
      'En CampusHome pide una carta o el contrato: eso es lo que vale como comprobante de domicilio.',
      'Ve a la cita y guarda el volante de empadronamiento que te den.',
      'Hazle una foto al volante y súbela en Ajustes → Actualizar mi info, para que Maite lo sepa.'
    ],
    queLlevar: ['Pasaporte', 'Contrato o carta de CampusHome', 'La cita (impresa o en el móvil)']
  },
  {
    id: 'tie',
    titulo: 'TIE — Tarjeta de Identidad de Extranjero',
    icono: '🪪',
    tipo: 'cita',
    resumen: 'Tu documento de identidad como estudiante extranjera en España.',
    porQue: 'Es el trámite con plazo legal de toda la lista. Con la TIE en regla puedes además trabajar hasta 30 horas a la semana.',
    plazo: 'Dentro del PRIMER MES desde que entraste a España. La cita puede tardar semanas en salir, así que pídela ya aunque la fecha caiga después.',
    pasos: [
      'Pide la cita previa HOY. Es lo primero, antes de tener los papeles: las citas van con semanas de espera y el plazo corre igual.',
      'Descarga y rellena el formulario EX-17.',
      'Paga la tasa y guarda el justificante.',
      'Hazte 3 fotografías tamaño carnet.',
      'Confirma la lista exacta de documentos en la web oficial de extranjería o con la oficina de estudiantes internacionales de la UNAV antes de ir.',
      'Ve a la cita en la Oficina de Extranjería de Navarra.'
    ],
    queLlevar: [
      'Pasaporte',
      'Visado',
      'Formulario EX-17 relleno',
      'Justificante de la tasa pagada',
      '3 fotos tamaño carnet'
    ],
    aviso:
      'Las tasas y los documentos cambian con frecuencia. Confirma la lista en la oficina o con estudiantes internacionales antes de ir — presentarte sin un papel significa volver otro día.'
  },
  {
    id: 'banco',
    titulo: 'Cuenta bancaria',
    icono: '🏦',
    tipo: 'cita',
    resumen: 'Para recibir transferencias de casa y pagar cosas de aquí.',
    porQue: 'Sin cuenta española, cada transferencia desde México te cuesta comisión y tarda.',
    plazo: 'Después del empadronamiento.',
    pasos: [
      'Pregunta en la universidad qué banco tiene mejores condiciones para estudiantes internacionales.',
      'Pide cita en la sucursal que elijas.',
      'Lleva pasaporte, volante de empadronamiento y, si ya la tienes, la TIE o el justificante de haberla solicitado.',
      'Algunos bancos aceptan el resguardo de la TIE en vez de la tarjeta: pregúntalo por teléfono antes de ir.'
    ],
    queLlevar: ['Pasaporte', 'Volante de empadronamiento', 'TIE o resguardo de la solicitud']
  },
  {
    id: 'sanidad',
    titulo: 'Tarjeta sanitaria',
    icono: '🩺',
    tipo: 'cita',
    resumen: 'Para que te atiendan sin pagar en el momento si te pones mala.',
    porQue: 'El día que te haga falta no vas a estar para averiguar cómo funciona.',
    plazo: 'Cuando tengas el empadronamiento.',
    pasos: [
      'Mira primero qué cubre el seguro médico con el que sacaste el visado: puede que ya tengas cobertura y solo necesites saber a qué centro ir.',
      'Localiza tu centro de salud, que te toca por la dirección donde estás empadronada.',
      'Pide cita para darte de alta.',
      'Lleva pasaporte, volante de empadronamiento y la póliza del seguro.',
      'Apunta el teléfono de tu centro de salud donde lo encuentres rápido.'
    ],
    queLlevar: ['Pasaporte', 'Volante de empadronamiento', 'Póliza del seguro médico']
  },
  {
    id: 'movil',
    titulo: 'Línea de móvil española',
    icono: '📱',
    tipo: 'cita',
    resumen: 'Un número de aquí para que te puedan llamar de las citas.',
    porQue: 'Casi todos los trámites piden un teléfono de contacto español, y muchos avisan por SMS.',
    plazo: 'Los primeros días.',
    pasos: [
      'Compara tarifas de prepago: no te ates a un contrato el primer mes.',
      'Ve a una tienda con el pasaporte.',
      'Cuando tengas el número, dáselo a la universidad y a la residencia.',
      'Guárdalo también en tus datos de contacto para tu familia.'
    ],
    queLlevar: ['Pasaporte']
  },
  {
    id: 'villavesa',
    titulo: 'Tarjeta de transporte (villavesa)',
    icono: '🚌',
    tipo: 'cita',
    resumen: 'La tarjeta del autobús urbano de Pamplona.',
    porQue: 'Con tarjeta el viaje sale bastante más barato que pagando al conductor, y la vas a usar todos los días.',
    plazo: 'La primera semana.',
    pasos: [
      'Pregúntale a Maite dónde se saca y qué tarifa te toca como estudiante.',
      'Lleva pasaporte y una foto si te la piden.',
      'Recárgala y comprueba que funciona en el primer viaje.'
    ],
    queLlevar: ['Pasaporte', 'Una foto tamaño carnet por si acaso']
  },
  {
    id: 'sos-nativo',
    titulo: 'Emergencia SOS de tu móvil',
    icono: '🆘',
    tipo: 'configuracion',
    resumen: 'Que tu móvil pueda pedir ayuda solo, aunque tú no puedas tocarlo.',
    porQue:
      'El botón SOS de esta app avisa a tu familia. El del móvil llama al 112 y manda tu ubicación aunque tengas la pantalla bloqueada. Son cosas distintas y hacen falta las dos.',
    pasos: [
      'iPhone: Ajustes → Emergencia SOS. Activa "Llamar manteniendo pulsado" y "Llamar con 5 pulsaciones".',
      'iPhone: Ajustes → Salud → Ficha médica → Crear ficha médica. Rellena tipo de sangre, alergias y medicación.',
      'iPhone: en esa misma ficha, activa "Mostrar con el móvil bloqueado" y añade contactos de emergencia.',
      'Android: Ajustes → Seguridad y emergencia. Configura Información médica, Contactos de emergencia y SOS de emergencia.',
      'Prueba que aparece la información en la pantalla de bloqueo, sin desbloquear.'
    ],
    aviso: 'Esto tarda cinco minutos y es lo único de la lista que funciona cuando tú no puedes hacer nada.'
  },
  {
    id: 'avisos-maite',
    titulo: 'Avisos de Maite en tu móvil',
    icono: '🔔',
    tipo: 'configuracion',
    resumen: 'Que la app pueda avisarte de estas citas.',
    porQue: 'Sin esto, los recordatorios de "mañana tienes la cita de la TIE" no llegan a ninguna parte.',
    pasos: [
      'Instala la app en tu pantalla de inicio. En iPhone tiene que ser desde Safari: Compartir → Añadir a pantalla de inicio.',
      'En Android, desde Chrome: los tres puntos → Instalar aplicación.',
      'Abre la app desde el icono nuevo, no desde el navegador.',
      'Ve a Ajustes → Notificaciones y dale a activar.',
      'Comprueba que pone "Suscrito".'
    ],
    aviso: 'En iPhone, una web abierta en el navegador NO puede mandar notificaciones. Tiene que estar instalada.'
  }
]

const KEY = 'tramites:estado'

export type MapaEstados = Record<string, EstadoGuardado>

export async function leerEstados(env: Env): Promise<MapaEstados> {
  const raw = await env.KV.get(KEY)
  return raw ? (JSON.parse(raw) as MapaEstados) : {}
}

export async function escribirEstados(env: Env, estados: MapaEstados): Promise<void> {
  await env.KV.put(KEY, JSON.stringify(estados))
}

export async function actualizarUno(
  env: Env,
  id: string,
  cambio: (previo: EstadoGuardado) => EstadoGuardado
): Promise<EstadoGuardado> {
  const estados = await leerEstados(env)
  const previo = estados[id] || { estado: 'pendiente' as EstadoTramite }
  const nuevo = cambio(previo)
  estados[id] = nuevo
  await escribirEstados(env, estados)
  return nuevo
}

// --- Fechas en hora de Pamplona -----------------------------------------------------------
//
// El Worker corre en UTC. A las 23:30 UTC de un martes ya es miércoles en Pamplona, así que
// comparar contra la fecha UTC mandaría el aviso de la víspera con un día de desfase la mitad del
// año. 'en-CA' se usa porque formatea como YYYY-MM-DD, que es lo que se guarda.

export function fechaEnPamplona(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(instante)
}

export function sumarDias(fechaISO: string, dias: number): string {
  // Se ancla a mediodía UTC para que sumar un día nunca caiga en el salto de horario de verano y
  // devuelva el mismo día otra vez.
  const base = new Date(`${fechaISO}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
}

export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const d = new Date(`${fecha}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha
}

export function esHoraValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
}
