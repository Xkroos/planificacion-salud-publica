'use client'

import React, { useState, useEffect } from 'react'
import { X, Loader2, Layers, CheckSquare, Square, AlertCircle, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AgregarSeccionModalProps {
  cronogramaBase: {
    id: string
    periodoId?: string
    periodo?: { id?: string; anio: number; numero: number; modalidad?: string }
    aulaTerritorialId?: string
    aulaTerritorial?: { id?: string; nombre: string; regionId?: string; region?: { id?: string; nombre: string } }
    trimestre: string
    seccion: string
    modalidad?: string
    vocero?: string | null
    telefonoVocero?: string | null
    emailVocero?: string | null
    asignaciones?: { id: string; unidadId?: string }[]
  }
  onClose: () => void
  onSaved: () => void
}

export function AgregarSeccionModal({ cronogramaBase, onClose, onSaved }: AgregarSeccionModalProps) {
  const [unidades, setUnidades] = useState<any[]>([])
  const [seccionesExistentes, setSeccionesExistentes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const periodoId = cronogramaBase.periodoId || cronogramaBase.periodo?.id || ''
  const aulaTerritorialId = cronogramaBase.aulaTerritorialId || cronogramaBase.aulaTerritorial?.id || ''
  const trimestre = cronogramaBase.trimestre || ''

  const [form, setForm] = useState({
    seccion: '',
    modalidad: cronogramaBase.modalidad || 'PRESENCIAL',
    vocero: '',
    telefonoVocero: '',
    emailVocero: '',
  })

  const [selectedMateriasIds, setSelectedMateriasIds] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [uniRes, cronRes] = await Promise.all([
          fetch('/sistema/api/unidades').then(r => r.json()),
          fetch('/sistema/api/cronograma?all=true').then(r => r.json())
        ])

        const uniList = Array.isArray(uniRes) ? uniRes : []
        setUnidades(uniList)

        // Buscar cronogramas existentes en esta misma sede, período y trimestre para detectar secciones ya usadas
        const cronList: any[] = Array.isArray(cronRes?.data) ? cronRes.data : (Array.isArray(cronRes) ? cronRes : [])
        const sedeNombre = cronogramaBase.aulaTerritorial?.nombre?.trim().toUpperCase()
        
        const matchingCrons = cronList.filter(c => {
          const samePeriodo = (c.periodoId === periodoId || c.periodo?.id === periodoId)
          const sameTrim = (c.trimestre || '').trim().toUpperCase() === trimestre.trim().toUpperCase()
          const sameAula = (c.aulaTerritorialId === aulaTerritorialId || c.aulaTerritorial?.id === aulaTerritorialId) ||
            (sedeNombre && c.aulaTerritorial?.nombre?.trim().toUpperCase() === sedeNombre)
          return samePeriodo && sameTrim && sameAula
        })

        const existingSecs = matchingCrons.map(c => String(c.seccion).trim()).filter(Boolean)
        setSeccionesExistentes(existingSecs)

        // Sugerir automáticamente el siguiente número de sección
        // Si existen secciones como '1', '2', buscar el max número + 1
        const numericSecs = existingSecs.map(s => parseInt(s)).filter(n => !isNaN(n))
        let nextSecNum = 1
        if (numericSecs.length > 0) {
          nextSecNum = Math.max(...numericSecs) + 1
        } else if (cronogramaBase.seccion) {
          const baseNum = parseInt(cronogramaBase.seccion)
          nextSecNum = !isNaN(baseNum) ? baseNum + 1 : 2
        }
        setForm(prev => ({ ...prev, seccion: String(nextSecNum) }))

        // Preseleccionar materias correspondientes al trimestre
        const trimUnidades = uniList.filter(u => !trimestre || u.trimestre === trimestre)
        if (trimUnidades.length > 0) {
          setSelectedMateriasIds(trimUnidades.map(u => u.id))
        } else if (cronogramaBase.asignaciones && cronogramaBase.asignaciones.length > 0) {
          setSelectedMateriasIds(cronogramaBase.asignaciones.map(a => a.unidadId!).filter(Boolean))
        }
      } catch (err) {
        console.error('Error al cargar datos para agregar sección:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cronogramaBase, periodoId, aulaTerritorialId, trimestre])

  const materiasFiltradas = unidades.filter(u => !trimestre || u.trimestre === trimestre)

  const handleToggleMateria = (id: string) => {
    setSelectedMateriasIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const handleSelectAllMaterias = () => {
    setSelectedMateriasIds(materiasFiltradas.map(u => u.id))
  }

  const handleDeselectAllMaterias = () => {
    setSelectedMateriasIds([])
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanSec = form.seccion.trim()
    if (!cleanSec) {
      setError('Por favor ingrese el número o nombre de la sección.')
      toast.error('Por favor ingrese el número de sección.')
      return
    }

    if (seccionesExistentes.includes(cleanSec)) {
      setError(`La sección ${cleanSec} ya existe para esta sede y trimestre. Por favor elija otro número.`)
      toast.error(`La sección ${cleanSec} ya se encuentra registrada.`)
      return
    }

    if (selectedMateriasIds.length === 0) {
      setError('Debe seleccionar al menos una materia para la nueva sección.')
      toast.error('Seleccione al menos una materia.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const res = await fetch('/sistema/api/cronograma/agregar-seccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodoId,
          aulaTerritorialId,
          trimestre,
          seccion: cleanSec,
          modalidad: form.modalidad,
          vocero: form.vocero.trim(),
          telefonoVocero: form.telefonoVocero.trim(),
          emailVocero: form.emailVocero.trim(),
          materiasIds: selectedMateriasIds,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al agregar sección')
      }

      toast.success(`Sección ${cleanSec} creada con éxito`)
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al agregar la sección')
      toast.error(err.message || 'Error al agregar la sección')
    } finally {
      setSaving(false)
    }
  }

  const aulaNombre = cronogramaBase.aulaTerritorial?.nombre || 'Sede'
  const regionNombre = cronogramaBase.aulaTerritorial?.region?.nombre || ''
  const periodoLabel = cronogramaBase.periodo ? `${cronogramaBase.periodo.anio}-${cronogramaBase.periodo.numero}` : ''
  const trimestreLabel = trimestre === 'Introductorio' ? trimestre : `${trimestre}° Trimestre`

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#0f172a', margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Agregar Nueva Sección
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Crear una nueva sección para la misma sede, período y trimestre
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 className="spin" size={28} style={{ color: '#059669' }} />
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>Cargando información de la sede y materias...</p>
          </div>
        ) : (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CONTEXT BANNER */}
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '14px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Sede / Aula</span>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{aulaNombre}</div>
                {regionNombre && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{regionNombre}</span>}
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Período</span>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{periodoLabel}</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Trimestre</span>
                <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: '14px' }}>{trimestreLabel}</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Secciones Actuales</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {seccionesExistentes.length > 0 ? (
                    seccionesExistentes.map(s => (
                      <span key={s} className="badge badge-gray" style={{ fontSize: '11px', padding: '2px 6px' }}>
                        Sec. {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Sección {cronogramaBase.seccion}</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* SECCIÓN Y MODALIDAD */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                1. Datos de la Sección
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Número de Sección a crear *
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.seccion}
                    onChange={e => setForm({ ...form, seccion: e.target.value })}
                    placeholder="Ej: 2, 3, etc."
                    required
                    style={{ fontWeight: 600, fontSize: '15px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Indique el identificador o número (ej. 2 para Sección 2).
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Modalidad *
                  </label>
                  <select
                    className="form-select"
                    value={form.modalidad}
                    onChange={e => setForm({ ...form, modalidad: e.target.value })}
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="MULTIMODAL">Multimodal</option>
                    <option value="VIRTUAL">Virtual</option>
                  </select>
                </div>
              </div>
            </div>

            {/* VOCERÍA Y CONTACTO */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                2. Vocería y Contacto de la Sección
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Vocero / Delegado</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.vocero}
                    onChange={e => setForm({ ...form, vocero: e.target.value })}
                    placeholder="Nombre y apellido"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.telefonoVocero}
                    onChange={e => setForm({ ...form, telefonoVocero: e.target.value })}
                    placeholder="Ej: 0412-1234567"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gmail / Correo Electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.emailVocero}
                    onChange={e => setForm({ ...form, emailVocero: e.target.value })}
                    placeholder="ejemplo@gmail.com"
                  />
                </div>
              </div>
            </div>

            {/* SELECCIÓN DE MATERIAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  3. Materias a ver en esta Sección ({selectedMateriasIds.length} seleccionadas)
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={handleSelectAllMaterias}
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={handleDeselectAllMaterias}
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                Haga clic sobre cada unidad curricular para incluirla o excluirla de la nueva sección:
              </p>

              <div style={{ display: 'grid', gap: '8px' }}>
                {materiasFiltradas.length > 0 ? (
                  materiasFiltradas.map(u => {
                    const isChecked = selectedMateriasIds.includes(u.id)
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
                          borderRadius: '8px',
                          border: isChecked ? '1px solid #86efac' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isChecked ? '0 1px 3px rgba(34, 197, 94, 0.1)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ color: isChecked ? '#16a34a' : '#94a3b8' }}>
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: isChecked ? '#166534' : '#1e293b' }}>
                              {u.nombre}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              UC: {u.creditos} | Horas académicas: {u.horas}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`badge ${isChecked ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                            {isChecked ? 'Incluida en Sección' : 'No incluida'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
                    No hay unidades curriculares asignadas al trimestre {trimestreLabel}.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || loading || selectedMateriasIds.length === 0}
            style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
            {saving ? 'Creando Sección...' : 'Crear Sección'}
          </button>
        </div>

      </div>
    </div>
  )
}
