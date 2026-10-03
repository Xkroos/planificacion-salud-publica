'use client'

import React, { useState, useEffect } from 'react'
import { X, Edit2, Loader2, MapPin, User, Calendar, BookOpen, Hash } from 'lucide-react'
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
    periodo?: { id?: string; anio: number; numero: number; trimestres?: string[] }
    aulaTerritorialId?: string
    aulaTerritorial?: { id?: string; nombre: string; regionId?: string; region?: { id?: string; nombre: string } }
  }
  onClose: () => void
  onSaved: () => void
}

export function CronogramaEditModal({ cronograma, onClose, onSaved }: CronogramaEditModalProps) {
  const [saving, setSaving] = useState(false)
  const [regiones, setRegiones] = useState<any[]>([])
  const [loadingRegiones, setLoadingRegiones] = useState(true)

  const [form, setForm] = useState({
    seccion: cronograma.seccion || '',
    trimestre: cronograma.trimestre || '',
    modalidad: cronograma.modalidad || 'PRESENCIAL',
    regionId: cronograma.aulaTerritorial?.region?.id || cronograma.aulaTerritorial?.regionId || '',
    aulaTerritorialId: cronograma.aulaTerritorialId || cronograma.aulaTerritorial?.id || '',
    vocero: cronograma.vocero || '',
    telefonoVocero: cronograma.telefonoVocero || '',
    emailVocero: cronograma.emailVocero || '',
    resolucion: cronograma.resolucion || '',
    participantesFem: String(cronograma.participantesFem ?? 0),
    participantesMasc: String(cronograma.participantesMasc ?? 0),
  })

  useEffect(() => {
    fetch('/sistema/api/regiones')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setRegiones(d)
          // Si no teníamos regionId pero sí aulaTerritorialId, buscarla
          if (!form.regionId && form.aulaTerritorialId) {
            const foundRegion = d.find((r: any) => r.aulas?.some((a: any) => a.id === form.aulaTerritorialId))
            if (foundRegion) {
              setForm(prev => ({ ...prev, regionId: foundRegion.id }))
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRegiones(false))
  }, [])

  const selectedRegion = regiones.find(r => r.id === form.regionId)
  const aulasDisponibles = selectedRegion?.aulas || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.seccion.trim()) {
      toast.error('Debe indicar el número o identificador de la sección')
      return
    }

    if (!form.trimestre) {
      toast.error('Debe seleccionar el trimestre')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        seccion: form.seccion.trim(),
        trimestre: form.trimestre,
        modalidad: form.modalidad,
        vocero: form.vocero.trim(),
        telefonoVocero: form.telefonoVocero.trim(),
        emailVocero: form.emailVocero.trim(),
        resolucion: form.resolucion.trim(),
        participantesFem: parseInt(form.participantesFem) || 0,
        participantesMasc: parseInt(form.participantesMasc) || 0,
      }

      if (form.aulaTerritorialId) {
        payload.aulaTerritorialId = form.aulaTerritorialId
      }

      const res = await fetch(`/sistema/api/cronograma/${cronograma.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el cronograma')
      }

      toast.success('Datos del cronograma actualizados con éxito')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a6b' }}>
            <Edit2 size={18} color="#2563eb" /> Editar Información del Cronograma
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px' }}>
            
            {/* Header info badge */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>Período Académico</span>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                  {cronograma.periodo ? `${cronograma.periodo.anio}-${cronograma.periodo.numero}` : 'Actual'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>Sede Actual</span>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                  {cronograma.aulaTerritorial?.nombre || '—'}
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: IDENTIFICACIÓN ACADÉMICA */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a6b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={15} color="#2563eb" /> Datos Académicos y Sección
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Número de Sección *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.seccion}
                    onChange={e => setForm({ ...form, seccion: e.target.value })}
                    required
                    placeholder="Ej: 1, 2, A, U..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trimestre / Nivel *</label>
                  <select
                    className="form-select"
                    value={form.trimestre}
                    onChange={e => setForm({ ...form, trimestre: e.target.value })}
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="Introductorio">Introductorio</option>
                    <option value="1">1° Trimestre</option>
                    <option value="2">2° Trimestre</option>
                    <option value="3">3° Trimestre</option>
                    <option value="4">4° Trimestre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Modalidad *</label>
                  <select
                    className="form-select"
                    value={form.modalidad}
                    onChange={e => setForm({ ...form, modalidad: e.target.value })}
                    required
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="MULTIMODAL">Multimodal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: UBICACIÓN Y SEDE */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a6b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="#2563eb" /> Sede y Región
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Región</label>
                  <select
                    className="form-select"
                    value={form.regionId}
                    onChange={e => {
                      setForm({ ...form, regionId: e.target.value, aulaTerritorialId: '' })
                    }}
                    disabled={loadingRegiones}
                  >
                    <option value="">Seleccionar Región...</option>
                    {regiones.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sede / Aula Territorial</label>
                  <select
                    className="form-select"
                    value={form.aulaTerritorialId}
                    onChange={e => setForm({ ...form, aulaTerritorialId: e.target.value })}
                    disabled={!form.regionId || aulasDisponibles.length === 0}
                  >
                    <option value="">Seleccionar Sede...</option>
                    {aulasDisponibles.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: INFORMACIÓN DE VOCERÍA */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a6b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="#2563eb" /> Información del Vocero / Delegado
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Vocero</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.vocero}
                    onChange={e => setForm({ ...form, vocero: e.target.value })}
                    placeholder="Nombre y Apellido del vocero de sección"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono del Vocero</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.telefonoVocero}
                    onChange={e => setForm({ ...form, telefonoVocero: e.target.value })}
                    placeholder="Ej: 0414-1234567"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico del Vocero</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.emailVocero}
                    onChange={e => setForm({ ...form, emailVocero: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: RESOLUCIÓN Y CANTIDADES ESTIMADAS */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a6b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={15} color="#2563eb" /> Resolución y Participantes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">N° de Resolución</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.resolucion}
                    onChange={e => setForm({ ...form, resolucion: e.target.value })}
                    placeholder="Ej: 025-2026"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Participantes ♀ (Fem.)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.participantesFem}
                    onChange={e => setForm({ ...form, participantesFem: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Participantes ♂ (Masc.)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.participantesMasc}
                    onChange={e => setForm({ ...form, participantesMasc: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" /> Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
