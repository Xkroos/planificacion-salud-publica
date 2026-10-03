'use client'

import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface CronogramaEditModalProps {
  cronograma: {
    id: string
    seccion: string
    trimestre: string
    modalidad?: string
    vocero?: string | null
    telefonoVocero?: string | null
    emailVocero?: string | null
    resolucion?: string | null
    participantesFem?: number
    participantesMasc?: number
    periodoId?: string
    periodo?: { id?: string; anio: number; numero: number; modalidad: string; trimestres?: string[] }
    aulaTerritorialId?: string
    aulaTerritorial?: { id?: string; nombre: string; regionId?: string; region?: { id?: string; nombre: string } }
    asignaciones?: { id: string; unidadId?: string; docente?: { nombre: string } | null; unidad?: { nombre: string } }[]
  }
  onClose: () => void
  onSaved: () => void
}

export function CronogramaEditModal({ cronograma, onClose, onSaved }: CronogramaEditModalProps) {
  const [periodos, setPeriodos] = useState<any[]>([])
  const [regiones, setRegiones] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    periodoId: cronograma.periodoId || cronograma.periodo?.id || '',
    regionId: cronograma.aulaTerritorial?.region?.id || cronograma.aulaTerritorial?.regionId || '',
    aulaTerritorialId: cronograma.aulaTerritorialId || cronograma.aulaTerritorial?.id || '',
    trimestre: cronograma.trimestre || '',
    seccion: cronograma.seccion || '',
    modalidad: cronograma.modalidad || 'PRESENCIAL',
    vocero: cronograma.vocero || '',
    telefonoVocero: cronograma.telefonoVocero || '',
    emailVocero: cronograma.emailVocero || '',
    resolucion: cronograma.resolucion || '',
    participantesFem: String(cronograma.participantesFem ?? 0),
    participantesMasc: String(cronograma.participantesMasc ?? 0),
  })

  // Materias asignadas
  const [selectedMateriasIds, setSelectedMateriasIds] = useState<string[]>([])

  useEffect(() => {
    const hasUnidadIds = cronograma.asignaciones && cronograma.asignaciones.some(a => a.unidadId)
    if (hasUnidadIds) {
      setSelectedMateriasIds(cronograma.asignaciones!.map(a => a.unidadId!).filter(Boolean))
    } else {
      // Buscar asignaciones de este cronograma si no venían con unidadId
      fetch(`/sistema/api/cronograma/${cronograma.id}`)
        .then(r => r.json())
        .then(d => {
          if (d && Array.isArray(d.asignaciones)) {
            setSelectedMateriasIds(d.asignaciones.map((a: any) => a.unidadId).filter(Boolean))
          }
        })
        .catch(console.error)
    }

    Promise.all([
      fetch('/sistema/api/periodos').then(r => r.json()),
      fetch('/sistema/api/regiones').then(r => r.json()),
      fetch('/sistema/api/unidades').then(r => r.json())
    ]).then(([per, reg, uni]) => {
      const perList = Array.isArray(per) ? per : []
      setPeriodos(perList)
      setRegiones(Array.isArray(reg) ? reg : [])
      setUnidades(Array.isArray(uni) ? uni : [])

      // Si falta regionId, deducirla del aula
      const targetAulaId = cronograma.aulaTerritorialId || cronograma.aulaTerritorial?.id
      if (targetAulaId && Array.isArray(reg)) {
        const found = reg.find((r: any) => r.aulas?.some((a: any) => a.id === targetAulaId))
        if (found) {
          setForm(prev => ({
            ...prev,
            regionId: prev.regionId || found.id,
            aulaTerritorialId: targetAulaId
          }))
        }
      }
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [cronograma])

  const selectedPeriodo = periodos.find(p => p.id === form.periodoId)
  const selectedRegion = regiones.find(r => r.id === form.regionId)
  const aulas = selectedRegion?.aulas || []
  const selectedAula = aulas.find((a: any) => a.id === form.aulaTerritorialId)
  
  const activeTrimestres = selectedPeriodo?.trimestres?.length > 0 
    ? selectedPeriodo.trimestres 
    : ['Introductorio', '1', '2', '3', '4']

  const handleToggleMateria = (id: string) => {
    setSelectedMateriasIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!form.periodoId || !form.aulaTerritorialId || !form.trimestre || !form.seccion.trim()) {
      setError('Por favor complete todos los campos obligatorios.')
      toast.error('Por favor complete todos los campos obligatorios.')
      return
    }

    if (selectedMateriasIds.length === 0) {
      setError('Debe tener al menos una materia asignada a la sección.')
      toast.error('Debe tener al menos una materia asignada a la sección.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/sistema/api/cronograma/${cronograma.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodoId: form.periodoId,
          aulaTerritorialId: form.aulaTerritorialId,
          trimestre: form.trimestre,
          seccion: form.seccion.trim(),
          modalidad: form.modalidad,
          vocero: form.vocero.trim(),
          telefonoVocero: form.telefonoVocero.trim(),
          emailVocero: form.emailVocero.trim(),
          resolucion: form.resolucion.trim(),
          participantesFem: parseInt(form.participantesFem) || 0,
          participantesMasc: parseInt(form.participantesMasc) || 0,
          materiasIds: selectedMateriasIds
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar cronograma')

      toast.success('Cronograma actualizado con éxito')
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al actualizar cronograma')
      toast.error(e.message || 'Error al actualizar cronograma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Actualizar Cronograma</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="spin" size={24} /></div>
        ) : (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {error && <div className="alert alert-error">{error}</div>}
            
            {/* 1. PERIODO Y UBICACION */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                1. Periodo y Ubicación
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Periodo Académico *</label>
                  <select 
                    className="form-select" 
                    value={form.periodoId} 
                    onChange={e => setForm({ ...form, periodoId: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    {periodos.map(p => (
                      <option key={p.id} value={p.id}>{p.anio}-{p.numero} ({p.modalidad})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trimestre *</label>
                  <select 
                    className="form-select" 
                    value={form.trimestre} 
                    onChange={e => setForm({ ...form, trimestre: e.target.value })} 
                    disabled={!form.periodoId}
                  >
                    <option value="">Seleccione...</option>
                    {activeTrimestres.map((t: string) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado (Región) *</label>
                  <select 
                    className="form-select" 
                    value={form.regionId} 
                    onChange={e => setForm({ ...form, regionId: e.target.value, aulaTerritorialId: '' })}
                  >
                    <option value="">Seleccione...</option>
                    {regiones.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aula Territorial *</label>
                  <select 
                    className="form-select" 
                    value={form.aulaTerritorialId} 
                    onChange={e => setForm({ ...form, aulaTerritorialId: e.target.value })} 
                    disabled={!form.regionId}
                  >
                    <option value="">Seleccione...</option>
                    {aulas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {selectedAula && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#4a5568', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <strong>Coordinador Territorial:</strong> {selectedAula.coordinador || 'No asignado'}
                </div>
              )}
            </div>

            {/* 2. DETALLES DE LAS SECCIONES A GENERAR */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                2. Detalles de las Secciones a generar
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Número de Sección *</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    value={form.seccion} 
                    onChange={e => setForm({ ...form, seccion: e.target.value })} 
                    placeholder="Ej: 1, 2, A..." 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Modalidad *</label>
                  <select className="form-select" value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="MULTIMODAL">Multimodal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del Vocero</label>
                  <input className="form-input" type="text" value={form.vocero} onChange={e => setForm({ ...form, vocero: e.target.value })} placeholder="Ingrese el nombre del vocero" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono Vocero</label>
                  <input className="form-input" type="text" value={form.telefonoVocero} onChange={e => setForm({ ...form, telefonoVocero: e.target.value })} placeholder="Ingrese el teléfono del vocero" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Vocero</label>
                  <input className="form-input" type="email" value={form.emailVocero} onChange={e => setForm({ ...form, emailVocero: e.target.value })} placeholder="Ingrese el correo del vocero" />
                </div>
                <div className="form-group">
                  <label className="form-label">N° de Resolución</label>
                  <input className="form-input" type="text" value={form.resolucion} onChange={e => setForm({ ...form, resolucion: e.target.value })} placeholder="Ingrese el número de resolución" />
                </div>
              </div>
            </div>

            {/* 3. ASIGNACION DE MATERIAS */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                3. Asignación de Materias y Secciones
              </h4>
              <p style={{ fontSize: '12px', color: '#718096', marginBottom: '12px' }}>
                Seleccione las materias que pertenecen a esta sección. Puede activar o desactivar materias para este cronograma.
              </p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {unidades.filter(u => !form.trimestre || u.trimestre === form.trimestre).map(u => {
                  const isChecked = selectedMateriasIds.includes(u.id)
                  const asignacionActual = cronograma.asignaciones?.find(a => a.unidadId === u.id)

                  return (
                    <div 
                      key={u.id} 
                      onClick={() => handleToggleMateria(u.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '10px 14px', 
                        background: isChecked ? '#f0fdf4' : '#f8fafc', 
                        borderRadius: '6px', 
                        border: isChecked ? '1px solid #86efac' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: isChecked ? '#166534' : '#1e293b' }}>
                            {u.nombre}
                          </div>
                          <div style={{ fontSize: '11px', color: '#718096' }}>
                            UC: {u.creditos} | Horas: {u.horas}
                            {asignacionActual?.docente && (
                              <span style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 500 }}>
                                · Docente: {asignacionActual.docente.nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className={`badge ${isChecked ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                          {isChecked ? 'Asignada a Sección' : 'No Asignada'}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {unidades.filter(u => !form.trimestre || u.trimestre === form.trimestre).length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#718096', fontSize: '13px' }}>
                    No hay unidades curriculares registradas para este trimestre.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
