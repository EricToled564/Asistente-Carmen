import { useEffect, useMemo, useRef, useState } from 'react'
import { PLANTAS_INFO, ESTILO_TIPO } from '../../data/edificio.js'
import { geometriaDePlanta } from '../../data/planoGeometria.js'

// Plano interior dibujado en SVG con nuestro propio código.
//
// Por qué no el embed de Google My Maps: ese plano vive dentro de un <iframe> de Google y su
// selector de plantas simplemente no respondía (comprobado en video: 14 segundos de clicks sin
// que pasara nada). Por la política de mismo-origen del navegador es imposible arreglar algo
// dentro de un iframe ajeno desde nuestro código — así que el plano se redibuja aquí, donde cada
// click sí lo controlamos.
//
// El edificio real es una nave larga en diagonal, con salas al norte, pasillo al centro y salas
// al sur (ver planoGeometria.js). El SVG se dibuja "recto" y se rota el grupo entero para darle
// esa diagonal, igual que se ve en el plano original.

const ANGULO = 22 // grados: la inclinación real del edificio respecto al norte

function radianes(g) {
  return (g * Math.PI) / 180
}

export default function PlanoEdificio({ onClose, onIrARuta }) {
  const [planta, setPlanta] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [zoom, setZoom] = useState(1.6)
  const contenedorRef = useRef(null)

  const geo = useMemo(() => geometriaDePlanta(planta), [planta])

  // Caja que contiene al edificio ya rotado — el viewBox del SVG.
  const { W, H, cos, sin } = useMemo(() => {
    const c = Math.abs(Math.cos(radianes(ANGULO)))
    const s = Math.abs(Math.sin(radianes(ANGULO)))
    return {
      cos: Math.cos(radianes(ANGULO)),
      sin: Math.sin(radianes(ANGULO)),
      W: geo.largo * c + geo.alto * s,
      H: geo.largo * s + geo.alto * c
    }
  }, [geo])

  const todas = useMemo(() => [...geo.salas, ...geo.conectores], [geo])

  // Dónde cae el centro de una sala DESPUÉS de la rotación — para poder desplazar el plano
  // hasta ella cuando se elige desde el menú.
  function centroRotado(item) {
    const dx = item.x + item.w / 2 - geo.largo / 2
    const dy = item.y + item.h / 2 - geo.alto / 2
    return { x: dx * cos - dy * sin + W / 2, y: dx * sin + dy * cos + H / 2 }
  }

  // Al abrir o cambiar de planta, centrar el plano (si no, arranca pegado a la esquina superior
  // izquierda y el edificio se ve cortado).
  useEffect(() => {
    const cont = contenedorRef.current
    if (!cont || seleccionado) return
    cont.scrollTo({
      left: (cont.scrollWidth - cont.clientWidth) / 2,
      top: (cont.scrollHeight - cont.clientHeight) / 2
    })
  }, [planta, zoom, seleccionado])

  // Al elegir un lugar (del menú o tocándolo), centrar el plano en él.
  useEffect(() => {
    if (!seleccionado || !contenedorRef.current) return
    const item = todas.find((t) => t.id === seleccionado.id)
    if (!item) return
    const cont = contenedorRef.current
    const escala = (cont.clientWidth * zoom) / W
    const c = centroRotado(item)
    cont.scrollTo({
      left: c.x * escala - cont.clientWidth / 2,
      top: c.y * escala - cont.clientHeight / 2,
      behavior: 'smooth'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado, zoom, planta])

  function elegirLugar(lugar) {
    setSeleccionado(lugar)
    setMenuAbierto(false) // el menú se cierra solo al seleccionar
  }

  const info = PLANTAS_INFO.find((p) => p.id === planta)

  return (
    <div className="flex h-full flex-col bg-lavanda-50">
      <div className="flex items-center justify-between bg-gradient-to-b from-morado-800 to-morado-900 px-4 py-3">
        <button onClick={onClose} className="text-2xl leading-none text-crema-50" aria-label="Cerrar">
          ←
        </button>
        <p className="text-sm font-semibold text-crema-50">🏛️ Plano interior — Arquitectura</p>
        <div className="w-8" />
      </div>

      {/* Selector de plantas */}
      <div className="flex gap-2 px-4 py-3">
        {PLANTAS_INFO.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPlanta(p.id)
              setSeleccionado(null)
              setMenuAbierto(false)
            }}
            className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold shadow-soft transition-transform active:scale-95 ${
              planta === p.id ? 'bg-gradient-to-r from-lavanda-700 to-lavanda-600 text-white' : 'bg-white text-morado-900/70'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {/* Menú colapsable con todos los lugares de la planta activa */}
      <div className="px-4">
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft"
        >
          <span className="text-sm font-semibold text-morado-900">
            {seleccionado ? seleccionado.nombre : `Lugares en ${info?.nombre}`}
          </span>
          <span className={`text-lavanda-700 transition-transform ${menuAbierto ? 'rotate-180' : ''}`}>⌄</span>
        </button>

        {menuAbierto && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white p-2 shadow-soft">
            {todas.map((l) => (
              <button
                key={l.id}
                onClick={() => elegirLugar(l)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left active:bg-lavanda-50 ${
                  seleccionado?.id === l.id ? 'bg-lavanda-50' : ''
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: ESTILO_TIPO[l.tipo].fondo }}
                >
                  {ESTILO_TIPO[l.tipo].emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-morado-900">{l.nombre}</span>
                  {l.salas && <span className="block truncate text-[11px] text-morado-900/45">{l.salas}</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* El plano */}
      <div className="relative mt-3 flex-1 overflow-hidden px-4 pb-4">
        <div className="absolute right-6 top-2 z-10 flex flex-col gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.4))}
            className="h-8 w-8 rounded-full bg-white text-lg font-bold text-lavanda-800 shadow-soft"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.4))}
            className="h-8 w-8 rounded-full bg-white text-lg font-bold text-lavanda-800 shadow-soft"
          >
            −
          </button>
        </div>

        <div ref={contenedorRef} className="h-full overflow-auto rounded-3xl bg-white shadow-soft">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: `${zoom * 100}%`, display: 'block' }}
            role="img"
            aria-label={`Plano de ${info?.nombre}`}
          >
            <g transform={`translate(${W / 2} ${H / 2}) rotate(${ANGULO}) translate(${-geo.largo / 2} ${-geo.alto / 2})`}>
              {/* Pasillo */}
              <rect x={geo.pasillo.x} y={geo.pasillo.y} width={geo.pasillo.w} height={geo.pasillo.h} fill="#F3ECE3" />
              <text
                x={geo.pasillo.w / 2}
                y={geo.pasillo.y + geo.pasillo.h / 2 + 5}
                textAnchor="middle"
                fontSize="15"
                fill="#2B1B3D"
                opacity="0.35"
                letterSpacing="3"
              >
                PASILLO
              </text>

              {[...geo.salas, ...geo.conectores].map((s) => {
                const activo = seleccionado?.id === s.id
                const estilo = ESTILO_TIPO[s.tipo]
                return (
                  <g key={s.id} onClick={() => elegirLugar(s)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={s.x}
                      y={s.y}
                      width={s.w}
                      height={s.h}
                      rx="4"
                      fill={activo ? estilo.color : estilo.fondo}
                      stroke={activo ? '#2B1B3D' : estilo.color}
                      strokeWidth={activo ? 4 : 1.5}
                      opacity={activo ? 1 : 0.95}
                    />
                    <text
                      x={s.x + s.w / 2}
                      y={s.y + s.h / 2}
                      textAnchor="middle"
                      fontSize={s.w < 90 ? 11 : 14}
                      fontWeight="600"
                      fill={activo ? '#FFFFFF' : estilo.color}
                    >
                      {partirTexto(s.nombre, s.w).map((linea, i, arr) => (
                        <tspan key={i} x={s.x + s.w / 2} dy={i === 0 ? -(arr.length - 1) * 7 : 15}>
                          {linea}
                        </tspan>
                      ))}
                    </text>
                    {s.salas && s.h > 100 && (
                      <text
                        x={s.x + s.w / 2}
                        y={s.y + s.h - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill={activo ? '#FFFFFF' : estilo.color}
                        opacity="0.7"
                      >
                        {s.salas}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      {seleccionado && (
        <div className="mx-4 mb-4 rounded-3xl bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
              style={{ background: ESTILO_TIPO[seleccionado.tipo].fondo }}
            >
              {ESTILO_TIPO[seleccionado.tipo].emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-morado-900">{seleccionado.nombre}</p>
              <p className="text-xs text-morado-900/50">
                {info?.nombre}
                {seleccionado.lado ? ` · lado ${seleccionado.lado}` : ' · sobre el pasillo'}
              </p>
              {seleccionado.salas && <p className="mt-1 text-xs text-morado-900/60">Salas: {seleccionado.salas}</p>}
            </div>
          </div>
          {onIrARuta && (
            <button
              onClick={onIrARuta}
              className="mt-3 w-full rounded-full bg-gradient-to-r from-lavanda-700 to-lavanda-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
            >
              🧭 Guíame hasta aquí
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Parte un nombre largo en varias líneas para que quepa dentro de su sala en el plano.
function partirTexto(texto, anchoSala) {
  const maxCaracteres = Math.max(8, Math.floor(anchoSala / 7))
  if (texto.length <= maxCaracteres) return [texto]
  const palabras = texto.split(' ')
  const lineas = []
  let actual = ''
  for (const palabra of palabras) {
    if ((actual + ' ' + palabra).trim().length <= maxCaracteres) {
      actual = (actual + ' ' + palabra).trim()
    } else {
      if (actual) lineas.push(actual)
      actual = palabra
    }
  }
  if (actual) lineas.push(actual)
  return lineas.slice(0, 3)
}
