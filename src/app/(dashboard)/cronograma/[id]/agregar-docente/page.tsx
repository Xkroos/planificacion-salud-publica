'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClipboardList, ArrowLeft, Calendar, X } from 'lucide-react'
import Link from 'next/link'

const TIME_OPTIONS = Array.from({ length: 16 * 4 + 1 }).map((_, i) => {
  const h = Math.floor(i / 4) + 6;
  const m = (i % 4) * 15;
  if (h > 21 && m > 0) return null;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}).filter(Boolean) as string[];

type Cronograma = {
  id: string
  periodo: { anio: number; numero: number; modalidad: string }
  trimestre: string
  seccion: string
  aulaTerritorial: { nombre: string; region: { nombre: string } }
  _meta?: { userRole: string; asignacionCargaAbierta: boolean }
}

type Docente = { id: string; nombre: string; categoria: string; dedicacion: string; cedula?: string; activo?: boolean }
type Unidad = { id: string; nombre: string; creditos: number; horas: number }

export default function AgregarDocentePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')


  // Form State
  const [asignacionId, setAsignacionId] = useState<string | null>(null)

  const [docenteId, setDocenteId] = useState('')
  const [docenteSearch, setDocenteSearch] = useState('')
  
  const [unidadId, setUnidadId] = useState('')
  const [lugar, setLugar] = useState('')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const [modalidad, setModalidad] = useState('PRESENCIAL')
  const [uc, setUc] = useState('3')
  const [cantHoras, setCantHoras] = useState('48')
  
  // Date State
  const [fechaInicial, setFechaInicial] = useState('')
  const [fechas, setFechas] = useState<string[]>([])
  const [nuevaFecha, setNuevaFecha] = useState('')

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const asigId = searchParams.get('asignacionId')

    Promise.all([
      fetch(`/api/cronograma/${id}`).then(r => r.json()),
      fetch('/api/docentes').then(r => r.json()),
      fetch('/api/unidades').then(r => r.json()),
    ]).then(([cron, docs, unis]) => {
      if (cron.error) {
        setError(cron.error)
      } else {
        setCronograma(cron)
        if (asigId) {
          const a = cron.asignaciones?.find((x: any) => x.id === asigId)
          if (a) {
            setAsignacionId(asigId)
            setDocenteId(a.docenteId || '')
            setUnidadId(a.unidadId || '')
            setLugar(a.lugar || '')
            setHoraInicio(a.horaInicio)
            setHoraFin(a.horaFin)
            setModalidad(a.modalidad)
            setUc(a.uc.toString())
            setCantHoras(a.cantHoras.toString())
            if (a.fechas) {
              setFechas(a.fechas.map((f: any) => f.fecha.split('T')[0]).sort())
            }
          }
        }
      }
      if (Array.isArray(docs)) {
        const activeDocs = docs.filter(d => d.activo !== false)
        setDocentes(activeDocs)
        
        if (asigId && cron.asignaciones) {
          const a = cron.asignaciones.find((x: any) => x.id === asigId)
          if (a && a.docenteId) {
            const d = activeDocs.find((doc: any) => doc.id === a.docenteId)
            if (d) setDocenteSearch(`${d.nombre} - CI: ${d.cedula || 'N/A'} (${d.dedicacion})`)
          }
        }
      }
      if (Array.isArray(unis)) setUnidades(unis)
      setLoading(false)
    }).catch(() => {
      setError('Error al cargar los datos')
      setLoading(false)
    })
  }, [id])

  const handleDocenteSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDocenteSearch(val)
    const match = docentes.find(d => `${d.nombre} - CI: ${d.cedula || 'N/A'} (${d.dedicacion})` === val)
    if (match) {
      setDocenteId(match.id)
    } else {
      setDocenteId('')
    }
  }

  const handleUnidadChange = (val: string) => {
    setUnidadId(val)
    const u = unidades.find(u => u.id === val)
    if (u) {
      setUc(u.creditos.toString())
      setCantHoras(u.horas.toString())
      if (fechaInicial) {
        generateFechas(fechaInicial, u.creditos.toString())
      }
    }
  }

  const generateFechas = (start: string, creditosStr: string) => {
    if (!start) return
    const creds = parseInt(creditosStr || uc)
    const totalClases = creds * 2
    if (isNaN(totalClases) || totalClases <= 0) return

    const generated: string[] = []
    const currentDate = new Date(start + 'T12:00:00')

    for (let j = 0; j < totalClases; j++) {
      generated.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 15)
    }
    setFechas(generated.sort())
  }

  const handleFechaInicialChange = (val: string) => {
    setFechaInicial(val)
    generateFechas(val, uc)
  }

  const addFechaManual = () => {
    if (!nuevaFecha || fechas.includes(nuevaFecha)) return
    setFechas([...fechas, nuevaFecha].sort())
    setNuevaFecha('')
  }

  const removeFecha = (fecha: string) => {
    setFechas(fechas.filter(f => f !== fecha))
  }

const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docenteId || !unidadId) {
      setError('Seleccione un docente válido de la lista y una unidad curricular')
      return
    }
    if (fechas.length === 0) {
      setError('Debe asignar al menos una fecha de encuentro')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = asignacionId ? `/api/asignaciones/${asignacionId}` : '/api/asignaciones'
      const method = asignacionId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cronogramaId: id,
          docenteId,
          unidadId,
          lugar,
          horaInicio,
          horaFin,
          modalidad,
          uc,
          cantHoras,
          fechas
        })
      })
      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Error al guardar asignación')
      }
      router.push(`/cronograma/${id}`)
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar')
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando datos...</div>
  if (error && !cronograma) return <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
  if (!cronograma) return <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>Cronograma no encontrado</div>

  const canModify = true // Permitir siempre a los operadores asignar docentes

  if (!canModify) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Acceso Denegado</h2>
        <p style={{ color: '#718096', marginBottom: '20px' }}>El proceso de asignación de carga horaria está cerrado o no tiene permisos de modificación.</p>
        <Link href={`/cronograma/${id}`} className="btn btn-secondary">Volver al Cronograma</Link>
      </div>
    )
  }

  const trimLabel = cronograma.trimestre === 'Introductorio' ? 'Introductorio' : `${cronograma.trimestre}° Trim.`

  return (
    <div className="fade-in">
      <datalist id="time-options">
        {TIME_OPTIONS.map(t => <option key={t} value={t} />)}
      </datalist>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/cronograma/${id}`} className="btn-icon"><ArrowLeft size={18} /></Link>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={24} color="#2d6bc4" /> Agregar Docente a Carga Horaria
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
            Cronograma {cronograma.periodo.anio}-{cronograma.periodo.numero} · Sección {cronograma.seccion} · {trimLabel} · {cronograma.aulaTerritorial.nombre}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSave} className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Docente *</label>
            <input 
              className="form-input" 
              list="docentes-datalist"
              value={docenteSearch} 
              onChange={handleDocenteSearchChange} 
              placeholder="Buscar por nombre o cédula..." 
              required 
            />
            <datalist id="docentes-datalist">
              {docentes.map(d => (
                <option key={d.id} value={`${d.nombre} - CI: ${d.cedula || 'N/A'} (${d.dedicacion})`} />
              ))}
            </datalist>
            {!docenteId && docenteSearch && (
              <span style={{ fontSize: '12px', color: '#e53e3e', marginTop: '4px', display: 'block' }}>
                Seleccione una opción válida de la lista.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Unidad Curricular *</label>
            <select className="form-select" value={unidadId} onChange={e => handleUnidadChange(e.target.value)} required disabled={!!asignacionId} style={{ opacity: asignacionId ? 0.7 : 1 }}>
              <option value="">Seleccionar unidad...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Lugar / Aula</label>
            <input className="form-input" placeholder="Ej: Aula 2" value={lugar} onChange={e => setLugar(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Modalidad *</label>
            <select className="form-select" value={modalidad} onChange={e => setModalidad(e.target.value)}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="MULTIMODAL">Multimodal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Hora Inicio *</label>
            <input className="form-input" type="text" list="time-options" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} placeholder="Ingrese la hora HH:MM" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" required />
          </div>

          <div className="form-group">
            <label className="form-label">Hora Fin *</label>
            <input className="form-input" type="text" list="time-options" value={horaFin} onChange={e => setHoraFin(e.target.value)} placeholder="Ingrese la hora HH:MM" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" required />
          </div>

          <div className="form-group">
            <label className="form-label">Unidades de Crédito (U.C.)</label>
            <input className="form-input" type="number" value={uc} readOnly style={{ background: '#f8fafc', color: '#718096' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Horas Académicas</label>
            <input className="form-input" type="number" value={cantHoras} readOnly style={{ background: '#f8fafc', color: '#718096' }} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px' }}>
            Fechas de Encuentros (Total calculado: {parseInt(uc) * 2 || 0})
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', color: '#4a5568' }}>
                1. Fecha Inicial (Autogenera encuentros cada 15 días)
              </label>
              <input className="form-input" type="date" value={fechaInicial} onChange={e => handleFechaInicialChange(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', color: '#4a5568' }}>
                2. Agregar fecha individual extra
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={addFechaManual}>
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {fechas.map(f => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                <Calendar size={12} />
                {new Date(f + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                <button type="button" onClick={() => removeFecha(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: '0', marginLeft: '2px', display: 'flex', alignItems: 'center' }}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {fechas.length === 0 && (
              <span style={{ fontSize: '12px', color: '#a0aec0' }}>Seleccione una fecha inicial para autogenerar o agregue fechas individualmente.</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <Link href={`/cronograma/${id}`} className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Asignar Docente'}
          </button>
        </div>
      </form>
    </div>
  )
}
