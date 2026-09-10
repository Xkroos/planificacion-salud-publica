'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Pencil, Trash2, X, Building2, ChevronDown, ChevronRight } from 'lucide-react'

type Aula = { id: string; nombre: string; coordinador: string | null; enlace: string | null; regionId: string; _count?: { cronogramas: number } }
type Region = { id: string; nombre: string; aulas: Aula[] }

export default function RegionesPage() {
  const [regiones, setRegiones] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)

  // Region modal
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [regionForm, setRegionForm] = useState({ nombre: '' })

  // Aula modal
  const [showAulaModal, setShowAulaModal] = useState(false)
  const [editingAula, setEditingAula] = useState<Aula | null>(null)
  const [aulaForm, setAulaForm] = useState({ nombre: '', coordinador: '', enlace: '', regionId: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'region' | 'aula'; id: string } | null>(null)

  const fetch_ = async () => {
    const res = await fetch('/sistema/api/regiones')
    setRegiones(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const saveRegion = async () => {
    setSaving(true)
    try {
      const url = editingRegion ? `/sistema/api/regiones/${editingRegion.id}` : '/sistema/api/regiones'
      await fetch(url, { method: editingRegion ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regionForm) })
      await fetch_()
      setShowRegionModal(false)
    } finally { setSaving(false) }
  }

  const saveAula = async () => {
    setSaving(true)
    try {
      const url = editingAula ? `/sistema/api/aulas/${editingAula.id}` : '/sistema/api/aulas'
      await fetch(url, { method: editingAula ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aulaForm) })
      await fetch_()
      setShowAulaModal(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const url = deleteConfirm.type === 'region' ? `/sistema/api/regiones/${deleteConfirm.id}` : `/sistema/api/aulas/${deleteConfirm.id}`
    await fetch(url, { method: 'DELETE' })
    await fetch_()
    setDeleteConfirm(null)
  }

  const openAddAula = (regionId: string) => {
    setEditingAula(null)
    setAulaForm({ nombre: '', coordinador: '', enlace: '', regionId })
    setShowAulaModal(true)
  }

  const openEditAula = (a: Aula) => {
    setEditingAula(a)
    setAulaForm({ 
      nombre: a.nombre, 
      coordinador: a.coordinador || '', 
      enlace: a.enlace || '', 
      regionId: a.regionId 
    })
    setShowAulaModal(true)
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={24} color="#2d6bc4" /> Regiones y Sedes
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{regiones.length} región(es) — {regiones.reduce((a, r) => a + r.aulas.length, 0)} aula(s) territorial(es)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingRegion(null); setRegionForm({ nombre: '' }); setShowRegionModal(true) }}>
          <Plus size={16} /> Nueva Región
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
        ) : regiones.length === 0 ? (
          <div className="card"><div className="empty-state"><MapPin size={48} /><p style={{ marginTop: '12px', fontWeight: 600 }}>No hay regiones registradas</p></div></div>
        ) : regiones.map(r => (
          <div key={r.id} className="card">
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}
              onClick={() => setExpandedRegion(expandedRegion === r.id ? null : r.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {expandedRegion === r.id ? <ChevronDown size={18} color="#2d6bc4" /> : <ChevronRight size={18} color="#718096" />}
                <div style={{ width: '36px', height: '36px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} color="#2d6bc4" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a3a6b' }}>{r.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>{r.aulas.length} aula(s) territorial(es)</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-secondary" onClick={() => { openAddAula(r.id) }}><Plus size={14} /> Agregar Aula</button>
                <button className="btn-icon" onClick={() => { setEditingRegion(r); setRegionForm({ nombre: r.nombre }); setShowRegionModal(true) }}><Pencil size={15} /></button>
                <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm({ type: 'region', id: r.id })}><Trash2 size={15} /></button>
              </div>
            </div>

            {expandedRegion === r.id && (
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {r.aulas.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '13px' }}>Sin aulas. Haz clic en &quot;Agregar Aula&quot; para añadir una.</div>
                ) : r.aulas.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 12px 68px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={16} color="#718096" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.nombre}</div>
                        {a.coordinador && <div style={{ fontSize: '12px', color: '#718096' }}>Coord: {a.coordinador}</div>}
                        {a.enlace && <div style={{ fontSize: '12px', color: '#718096' }}>Enlace: {a.enlace}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => openEditAula(a)}><Pencil size={14} /></button>
                      <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm({ type: 'aula', id: a.id })}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Region Modal */}
      {showRegionModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRegionModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingRegion ? 'Editar Región' : 'Nueva Región'}</h3>
              <button className="btn-icon" onClick={() => setShowRegionModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de la Región *</label>
                <input className="form-input" placeholder="Ej: CARABOBO" value={regionForm.nombre} onChange={e => setRegionForm({ nombre: e.target.value })} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRegionModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveRegion} disabled={saving}>{saving ? 'Guardando...' : editingRegion ? 'Actualizar' : 'Crear Región'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Aula Modal */}
      {showAulaModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAulaModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editingAula ? 'Editar Aula Territorial' : 'Nueva Aula Territorial'}</h3>
              <button className="btn-icon" onClick={() => setShowAulaModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del Aula *</label>
                <input className="form-input" placeholder="Ej: PUERTO CABELLO" value={aulaForm.nombre} onChange={e => setAulaForm({ ...aulaForm, nombre: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Coordinador Territorial</label>
                <input className="form-input" placeholder="Ej: DRA. MILDRE PÉREZ" value={aulaForm.coordinador} onChange={e => setAulaForm({ ...aulaForm, coordinador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Enlace Territorial</label>
                <input className="form-input" placeholder="Nombre del enlace" value={aulaForm.enlace} onChange={e => setAulaForm({ ...aulaForm, enlace: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAulaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveAula} disabled={saving}>{saving ? 'Guardando...' : editingAula ? 'Actualizar' : 'Crear Aula'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>Confirmar Eliminación</h3>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body"><p>¿Estás seguro? Esta acción no se puede deshacer.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={15} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
