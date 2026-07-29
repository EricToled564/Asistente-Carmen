import type { Env } from '../types.js'

// Los trámites de los primeros 30 días, con cita agendable y recordatorios.
//
// Antes esto era una lista de casillas en localStorage. Servía para no olvidarse de que existían,
// pero no para hacerlos: "Agenda cita de empadronamiento" no dice dónde, ni qué llevar, ni por qué
// va primero, ni avisa el día antes. Y viviendo en el navegador, ningún cron podía recordarle nada
// — que es justo lo que hace falta cuando la cita se pidió hace tres semanas.
//
// Carmen tiene pasaporte español. Eso quita de esta lista el trámite que más pesaba —la T-I-E, con
// su plazo de un mes y su cita de extranjería— y cambia varios de los que quedan: el banco y el
// centro de salud dejan de pedirle papeles de extranjera. Lo que aparece en su lugar es el DNI, que
// es lo que le van a pedir aquí en todas partes. Si algún día vuelve a haber aquí una palabra como
// TIE, NIE o extranjería aplicada a ella, está mal.
//
// Por eso el estado vive aquí, en KV: es la única forma de que el Worker pueda mandar el aviso de
// la víspera y el del mismo día.
//
// El contenido de los pasos sale de KB6 (trámites de llegada), que es el documento verificado.
// Donde KB6 avisa de que los requisitos exactos cambian —tasas, documentos, horarios de oficina—
// aquí NO se inventa un dato concreto: se dan los pasos y se manda a confirmarlo. Un dato
// inventado en este módulo es el que más caro sale de toda la app: significa presentarse a una
// cita sin un papel.

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
    porQue: 'Va primero porque varios de los demás trámites lo piden. Sin esto, el DNI, el banco y el centro de salud se atascan. El empadronamiento lo hace todo el mundo que vive aquí, seas española o no.',
    plazo: 'Cuanto antes. Es el que desbloquea a los demás.',
    pasos: [
      'Pide cita previa en el Ayuntamiento de Pamplona. Pregúntale a Maite cómo se pide ahora mismo, que cambia.',
      'Reúne tu documento de identidad —DNI o pasaporte español— y un papel que demuestre dónde vives.',
      'En CampusHome pide una carta o el contrato: eso es lo que vale como comprobante de domicilio.',
      'Ve a la cita y guarda el volante de empadronamiento que te den.',
      'Hazle una foto al volante y súbela en Ajustes → Actualizar mi info, para que Maite lo sepa.'
    ],
    queLlevar: ['DNI o pasaporte español', 'Contrato o carta de CampusHome', 'La cita (impresa o en el móvil)']
  },
  {
    id: 'dni',
    titulo: 'DNI español',
    icono: '🪪',
    tipo: 'cita',
    resumen: 'Tu documento de identidad español. Si ya lo tienes, márcalo como hecho y sigue.',
    porQue:
      'Con pasaporte español eres española a todos los efectos: nada de TIE, nada de NIE, nada de extranjería. Lo que sí te va a pedir todo el mundo aquí es el DNI: el banco, el centro de salud, la universidad y cualquier gestión por internet. El pasaporte sirve para identificarte, pero el número que te piden en los formularios es el del DNI.',
    plazo: 'Si no lo tienes, cuanto antes: te lo van a pedir para casi todo lo demás.',
    pasos: [
      'Si ya tienes DNI español y está en vigor, no tienes que hacer nada: márcalo como hecho.',
      'Si no lo tienes o está caducado, pide cita previa en una Comisaría de Policía Nacional de Pamplona. Pregúntale a Maite cómo se pide ahora mismo, que el sistema de cita cambia.',
      'Reúne el certificado literal de nacimiento español (el del Registro Civil, no el mexicano traducido) y una foto reciente tamaño carnet con fondo claro.',
      'Lleva también el volante de empadronamiento si ya lo tienes: es lo que fija tu domicilio en el DNI.',
      'Ve a la cita. El DNI te lo dan en el momento.',
      'Cuando lo tengas, súbelo en Ajustes → Actualizar mi info para que Maite lo sepa.'
    ],
    queLlevar: [
      'Pasaporte español',
      'Certificado literal de nacimiento español',
      'Una foto tamaño carnet, fondo claro',
      'Volante de empadronamiento (si ya lo tienes)'
    ],
    aviso:
      'Los documentos exactos y la tasa cambian, y no es lo mismo el primer DNI que una renovación. Confírmalo al pedir la cita: presentarte sin un papel significa volver otro día. Si te dicen algo distinto de esto, hazles caso a ellos.'
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
      'Pregunta en la universidad qué banco tiene mejores condiciones para estudiantes.',
      'Pide cita en la sucursal que elijas.',
      'Lleva el DNI y el volante de empadronamiento. Con DNI español el trámite es el normal de cualquiera: no te pueden pedir NIE ni papeles de extranjería.',
      'Pregunta por la cuenta de estudiante, que suele no tener comisiones de mantenimiento.'
    ],
    queLlevar: ['DNI (o pasaporte español si aún no lo tienes)', 'Volante de empadronamiento']
  },
  {
    id: 'sanidad',
    titulo: 'Tarjeta sanitaria',
    icono: '🩺',
    tipo: 'cita',
    resumen: 'La tarjeta de Osasunbidea, el servicio de salud de Navarra.',
    porQue: 'Siendo española tienes derecho a la sanidad pública como cualquiera: no necesitas seguro privado ni el seguro del visado. Con la tarjeta te atienden en tu centro de salud sin pagar. El día que te haga falta no vas a estar para averiguar cómo funciona.',
    plazo: 'Cuando tengas el empadronamiento.',
    pasos: [
      'Localiza tu centro de salud: te toca por la dirección donde estás empadronada.',
      'Pide cita en el mostrador de tu centro de salud para darte de alta y pedir la tarjeta (la T-I-S).',
      'Lleva el DNI y el volante de empadronamiento. Eso es todo lo que hace falta.',
      'Mientras te llega la tarjeta te atienden igual: guarda el resguardo que te den.',
      'Apunta el teléfono de tu centro de salud donde lo encuentres rápido.'
    ],
    queLlevar: ['DNI (o pasaporte español)', 'Volante de empadronamiento']
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
      'Ve a una tienda con el DNI o el pasaporte español.',
      'Cuando tengas el número, dáselo a la universidad y a la residencia.',
      'Guárdalo también en tus datos de contacto para tu familia.'
    ],
    queLlevar: ['DNI o pasaporte español']
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
    porQue: 'Sin esto, los recordatorios de "mañana tienes la cita del DNI" no llegan a ninguna parte.',
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
