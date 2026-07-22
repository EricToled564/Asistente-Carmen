import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function DatosEmergenciaForm() {
  const [nombreLegal, setNombreLegal] = useState('')
  const [tipoSangre, setTipoSangre] = useState('')
  const [estado, setEstado] = useState('cargando') // cargando | listo | guardando | guardado | error

  useEffect(() => {
    api
      .emergenciaObtener()
      .then((datos) => {
        setNombreLegal(datos.nombreLegal || '')
        setTipoSangre(datos.tipoSangre === 'no proporcionado' ? '' : datos.tipoSangre || '')
        setEstado('listo')
      })
      .catch(() => setEstado('listo'))
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setEstado('guardando')
    try {
      await api.emergenciaGuardar({ nombreLegal, tipoSangre })
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 px-5">
      <p className="text-sm text-morado-900/60">
        Esto NUNCA lo ve Maite ni se sube a su Knowledge Base — solo lo usa la pantalla de
        emergencia del módulo SOS.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-morado-900/80">Nombre legal completo</span>
        <input
          value={nombreLegal}
          onChange={(e) => setNombreLegal(e.target.value)}
          className="rounded-xl border border-lavanda-100 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-morado-900/80">Tipo de sangre (opcional)</span>
        <select
          value={tipoSangre}
          onChange={(e) => setTipoSangre(e.target.value)}
          className="rounded-xl border border-lavanda-100 px-3 py-2 text-sm"
        >
          <option value="">Prefiero no decir / no lo sé</option>
          {TIPOS_SANGRE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={estado === 'guardando' || estado === 'cargando'}
        className="rounded-xl bg-lavanda-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
      </button>

      {estado === 'guardado' && <p className="text-sm font-medium text-green-700">Guardado ✓</p>}
      {estado === 'error' && <p className="text-sm text-red-700">No se pudo guardar. Intenta de nuevo.</p>}
    </form>
  )
}
