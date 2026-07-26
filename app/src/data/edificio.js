// Plano interior del Edificio de Arquitectura, dibujado con nuestro propio código.
//
// Por qué no se usa el embed de Google My Maps: ese mapa vive dentro de un <iframe> de Google, y
// por la política de mismo-origen del navegador es IMPOSIBLE que nuestro JavaScript controle o
// arregle lo que pasa ahí dentro. En un video de uso real se comprobó que su selector de capas
// (cambiar de Planta -1 a 0 a 1) simplemente no responde dentro del embed — y no había forma de
// repararlo desde fuera. Por eso el plano se reconstruye aquí: cada click lo maneja nuestro
// propio código, así que sí se puede garantizar que funcione.
//
// Los datos (nombre, planta, orden oeste→este, lado del pasillo) son los mismos que usa el
// wayfinding del Worker (worker/src/data/edificioArquitectura.ts), sacados de las capturas reales
// del My Maps original. El plano es esquemático a propósito: una nave alargada con un pasillo
// central y salas a ambos lados, que es exactamente la forma real del edificio — no pretende ser
// una reproducción a escala, sino algo legible en la pantalla de un celular.

export const PLANTAS_INFO = [
  { id: -1, nombre: 'Planta -1', descripcion: 'Seminarios, taller laboratorio y sala multifunción' },
  { id: 0, nombre: 'Planta 0', descripcion: 'Acceso principal, aulas, cafetería y secretaría' },
  { id: 1, nombre: 'Planta 1', descripcion: 'Talleres, salas A/B/C y punto de atención' }
]

// tipo: 'aula' | 'servicio' | 'escalera' | 'ascensor'
// lado: 'norte' | 'sur' (de qué lado del pasillo cae) — los conectores van en el eje del pasillo
export const LUGARES = [
  // --- Planta -1 (oeste → este) ---
  { id: 'p-1-seminario5', nombre: 'Seminario 5', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-seminario4', nombre: 'Seminario 4', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-seminario3', nombre: 'Seminario 3', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-escalera', nombre: 'Escalera', planta: -1, tipo: 'escalera' },
  { id: 'p-1-multifuncion', nombre: 'Sala Multifunción', planta: -1, tipo: 'servicio', lado: 'norte', nota: 'Con microondas' },
  { id: 'p-1-s180', nombre: 'S180', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-materiales', nombre: 'Aula de Materiales', planta: -1, tipo: 'aula', lado: 'norte' },
  { id: 'p-1-taller-laboratorio', nombre: 'Taller Laboratorio', planta: -1, tipo: 'aula', lado: 'sur', nota: 'Nave grande al sur' },

  // --- Planta 0 (oeste → este) ---
  { id: 'p0-lab-etsaun', nombre: 'Laboratorio ETSAUN', planta: 0, tipo: 'aula', lado: 'norte', salas: '0380 · 0382 · 0360 · 0370 · 0390' },
  { id: 'p0-escalera-oeste', nombre: 'Escalera oeste', planta: 0, tipo: 'escalera' },
  { id: 'p0-impresora', nombre: 'Autoservicio impresora', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-aula06', nombre: 'Aula 06', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-aula05', nombre: 'Aula 05', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-aula04', nombre: 'Aula 04', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-taller-moda', nombre: 'Taller de Moda', planta: 0, tipo: 'aula', lado: 'norte', salas: '0340 · 0330 · 0341 · 0342' },
  { id: 'p0-aula0', nombre: 'Aula 0', planta: 0, tipo: 'aula', lado: 'norte', salas: '0230' },
  { id: 'p0-biblioteca', nombre: 'Biblioteca', planta: 0, tipo: 'servicio', lado: 'norte', salas: '0270' },
  { id: 'p0-aula02', nombre: 'Aula 02', planta: 0, tipo: 'aula', lado: 'sur', salas: '0490 · 0500' },
  { id: 'p0-pasillo-escaleras', nombre: 'Escaleras centro', planta: 0, tipo: 'escalera' },
  { id: 'p0-ascensor', nombre: 'Ascensor', planta: 0, tipo: 'ascensor' },
  { id: 'p0-conserjeria', nombre: 'Conserjería', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-aula-magna', nombre: 'Aula Magna', planta: 0, tipo: 'aula', lado: 'sur' },
  { id: 'p0-cafeteria', nombre: 'Cafetería', planta: 0, tipo: 'servicio', lado: 'sur' },
  { id: 'p0-microondas', nombre: 'Zona de microondas', planta: 0, tipo: 'servicio', lado: 'sur' },
  { id: 'p0-escaleras-cafeteria', nombre: 'Escaleras cafetería', planta: 0, tipo: 'escalera' },
  { id: 'p0-oratorio', nombre: 'Oratorio', planta: 0, tipo: 'servicio', lado: 'sur', salas: '0530 · 0550 · 0555 · 0570' },
  { id: 'p0-atelier-lorda', nombre: 'Atelier Lorda', planta: 0, tipo: 'aula', lado: 'sur', nota: 'Con terraza' },
  { id: 'p0-direccion-tecnica', nombre: 'Dirección Arq. Técnica', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-secretaria', nombre: 'Secretaría', planta: 0, tipo: 'servicio', lado: 'norte', salas: '0010 · 0030 · 0050 · 0060 · 0070' },
  { id: 'p0-aseo-masculino-ne', nombre: 'Aseo masculino', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-innovation-factory', nombre: 'Innovation Factory', planta: 0, tipo: 'servicio', lado: 'norte' },
  { id: 'p0-seminario01', nombre: 'Seminario 01', planta: 0, tipo: 'aula', lado: 'norte', salas: '0130 · 0140 · 0150 · 0170 · 0180' },

  // --- Planta 1 (oeste → este) ---
  { id: 'p1-punto-atencion', nombre: 'Punto de atención', planta: 1, tipo: 'servicio', lado: 'sur' },
  { id: 'p1-sala-c', nombre: 'Sala C — Teoría de Proyectos', planta: 1, tipo: 'aula', lado: 'sur', salas: '1075 · 1080 · 1082 · 1084' },
  { id: 'p1-escalera-oeste', nombre: 'Escalera oeste', planta: 1, tipo: 'escalera' },
  { id: 'p1-taller06', nombre: 'Taller 06', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller05', nombre: 'Taller 05', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller04', nombre: 'Taller 04', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller03', nombre: 'Taller 03', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-taller02', nombre: 'Taller 02', planta: 1, tipo: 'aula', lado: 'norte' },
  { id: 'p1-aseo-masculino', nombre: 'Aseo masculino', planta: 1, tipo: 'servicio', lado: 'sur' },
  { id: 'p1-escalera-centro', nombre: 'Escaleras centro', planta: 1, tipo: 'escalera' },
  { id: 'p1-ascensor', nombre: 'Ascensor', planta: 1, tipo: 'ascensor' },
  { id: 'p1-sala-b', nombre: 'Sala B1 y B2', planta: 1, tipo: 'aula', lado: 'sur', salas: '1101 · 1103 · 1105 · 1107' },
  { id: 'p1-escalera-este', nombre: 'Escaleras este', planta: 1, tipo: 'escalera' },
  { id: 'p1-sala-a', nombre: 'Sala A — Construcción', planta: 1, tipo: 'aula', lado: 'sur', salas: '1111 · 1113 · 1114 · 1116' },
  { id: 'p1-taller01', nombre: 'Taller 01', planta: 1, tipo: 'aula', lado: 'norte' }
]

export const ESTILO_TIPO = {
  aula: { color: '#7C4DBC', fondo: '#EFE4F9', emoji: '📚' },
  servicio: { color: '#E8813F', fondo: '#FFE9D6', emoji: '📍' },
  escalera: { color: '#442A54', fondo: '#DCD3E4', emoji: '🪜' },
  ascensor: { color: '#2B6CB0', fondo: '#D6E6F7', emoji: '🛗' }
}

export function lugaresDePlanta(planta) {
  return LUGARES.filter((l) => l.planta === planta)
}
