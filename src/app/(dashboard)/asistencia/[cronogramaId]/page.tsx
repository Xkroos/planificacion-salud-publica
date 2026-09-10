'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Cronograma = {
  id: string
  periodo: { anio: number; numero: number; trimestre: string; seccion: string }
  aulaTerritorial: { nombre: string }
  asignaciones: {
    id: string
    docente: { nombre: string }
    unidad: { nombre: string }
    fechas: { id: string; fecha: string }[]
  }[]
  participantes: { id: string; nombre: string; cedula: string | null; genero: string }[]
}


export default function AsistenciaPage() {
  const { cronogramaId } = useParams<{ cronogramaId: string }>()
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFecha, setSelectedFecha] = useState<string>('')
  const [asistencias, setAsistencias] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const allFechas = cronograma?.asignaciones.flatMap(a =>
    a.fechas.map(f => ({ ...f, docente: a.docente.nombre, unidad: a.unidad.nombre }))
  ) || []



  useEffect(() => {
    fetch(`/sistema/api/cronograma/${cronogramaId}`)
      .then(r => r.json())
      .then(d => { setCronograma(d); setLoading(false) })
  }, [cronogramaId])

  useEffect(() => {
    if (selectedFecha && cronograma) {
      fetch(`/sistema/api/asistencia?cronogramaId=${cronogramaId}&fechaId=${selectedFecha}`)
        .then(r => r.json())
        .then(d => {
          const map: Record<string, string> = {}
          d.participantes.forEach((p: { id: string }) => { map[p.id] = 'AUSENTE' })
          d.asistencias.forEach((a: { participanteId: string; estado: string }) => { map[a.participanteId] = a.estado })
          setAsistencias(map)
        })
    }
  }, [selectedFecha, cronogramaId, cronograma])

  const handleSave = async () => {
    setSaving(true)
    const registros = Object.entries(asistencias).map(([participanteId, estado]) => ({
      participanteId, fechaEncuentroId: selectedFecha, estado
    }))
    await fetch('/sistema/api/asistencia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registros })
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const setEstado = (participanteId: string, estado: string) => {
    setAsistencias(prev => ({ ...prev, [participanteId]: estado }))
  }

  const estadoColor: Record<string, string> = {
    PRESENTE: '#16a34a',
    AUSENTE: '#dc2626',
    JUSTIFICADO: '#d97706',
  }
  const estadoBg: Record<string, string> = {
    PRESENTE: '#dcfce7',
    AUSENTE: '#fee2e2',
    JUSTIFICADO: '#fef3c7',
  }

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
  if (!cronograma) return <div style={{ padding: '60px', textAlign: 'center' }}>Cronograma no encontrado</div>

  const participantes = cronograma.participantes
  const presentes = Object.values(asistencias).filter(e => e === 'PRESENTE').length
  const ausentes = Object.values(asistencias).filter(e => e === 'AUSENTE').length
  const justificados = Object.values(asistencias).filter(e => e === 'JUSTIFICADO').length

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/cronograma/${cronogramaId}`} className="btn-icon"><ArrowLeft size={18} /></Link>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckSquare size={24} color="#2d6bc4" /> Control de Asistencia
          </h1>
          <p style={{ fontSize: '13px', color: '#718096' }}>
            {cronograma.periodo.anio}-{cronograma.periodo.numero} · {cronograma.aulaTerritorial.nombre}
          </p>
        </div>
      </div>

      {/* Selector de Fecha */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px 24px' }}>
        <div className="form-group" style={{ marginBottom: 0, maxWidth: '500px' }}>
          <label className="form-label">Seleccionar Fecha de Encuentro</label>
          <select className="form-select" value={selectedFecha} onChange={e => setSelectedFecha(e.target.value)}>
            <option value="">-- Seleccione una fecha --</option>
            {allFechas.map(f => (
              <option key={f.id} value={f.id}>
                {new Date(f.fecha).toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                {' — '}{f.unidad.slice(0, 40)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFecha && participantes.length > 0 && (
        <>
          {/* Stats */}
          {saved && <div className="alert alert-success" style={{ marginBottom: '16px' }}>✅ Asistencia guardada exitosamente</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{presentes}</div>
              <div style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>Presentes</div>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626' }}>{ausentes}</div>
              <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>Ausentes</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706' }}>{justificados}</div>
              <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>Justificados</div>
            </div>
          </div>

          {/* Lista de participantes */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h2 className="card-title">Lista de Participantes ({participantes.length})</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => { const m: Record<string, string> = {}; participantes.forEach(p => m[p.id] = 'PRESENTE'); setAsistencias(m) }}>Todos Presentes</button>
                <button className="btn btn-sm btn-secondary" onClick={() => { const m: Record<string, string> = {}; participantes.forEach(p => m[p.id] = 'AUSENTE'); setAsistencias(m) }}>Todos Ausentes</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Participante</th><th>Cédula</th><th>Género</th><th style={{ textAlign: 'center' }}>Estado</th></tr>
                </thead>
                <tbody>
                  {participantes.map((p, i) => {
                    const estado = asistencias[p.id] || 'AUSENTE'
                    return (
                      <tr key={p.id}>
                        <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                        <td>{p.cedula || '—'}</td>
                        <td><span className={`badge ${p.genero === 'FEMENINO' ? 'badge-red' : 'badge-blue'}`}>{p.genero === 'FEMENINO' ? '♀' : '♂'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {(['PRESENTE', 'AUSENTE', 'JUSTIFICADO'] as const).map(e => (
                              <button
                                key={e}
                                onClick={() => setEstado(p.id, e)}
                                style={{
                                  padding: '5px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                                  fontSize: '12px', fontWeight: 600,
                                  background: estado === e ? estadoBg[e] : '#f1f5f9',
                                  color: estado === e ? estadoColor[e] : '#718096',
                                  outline: estado === e ? `2px solid ${estadoColor[e]}` : 'none',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {e.charAt(0) + e.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link href={`/cronograma/${cronogramaId}`} className="btn btn-secondary">Volver</Link>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar Asistencia'}
            </button>
          </div>
        </>
      )}

      {selectedFecha && participantes.length === 0 && (
        <div className="card"><div className="empty-state" style={{ padding: '40px' }}>
          <p style={{ fontWeight: 600 }}>No hay participantes en este cronograma</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Agrega participantes desde la vista del cronograma primero.</p>
          <Link href={`/cronograma/${cronogramaId}`} className="btn btn-primary btn-sm" style={{ marginTop: '12px', display: 'inline-flex' }}>Ir al Cronograma</Link>
        </div></div>
      )}
    </div>
  )
}
