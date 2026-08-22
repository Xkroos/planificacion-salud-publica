'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { BookOpen, Plus, Pencil, Trash2, X, Search, Lock } from 'lucide-react'

type Unidad = { id: string; nombre: string; creditos: number; horas: number; trimestre: string | null; _count?: { asignaciones: number } }

export default function UnidadesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Unidad | null>(null)
  const [form, setForm] = useState({ nombre: '', creditos: '3', horas: '48', trimestre: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetch_ = async () => {
    const res = await fetch('/api/unidades')
    setUnidades(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const openCreate = () => { setEditing(null); setForm({ nombre: '', creditos: '3', horas: '48', trimestre: '' }); setError(''); setShowModal(true) }
  const openEdit = (u: Unidad) => { setEditing(u); setForm({ nombre: u.nombre, creditos: u.creditos.toString(), horas: u.horas.toString(), trimestre: u.trimestre || '' }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/unidades/${editing.id}` : '/api/unidades'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      await fetch_()
      setShowModal(false)
    } catch { setError('Error al guardar') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/unidades/${id}`, { method: 'DELETE' })
    await fetch_()
    setDeleteConfirm(null)
  }

  const filtered = unidades.filter(u => u.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="#2d6bc4" /> Unidades Curriculares
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{unidades.length} unidad(es) registrada(s)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isAdmin && (
            <span className="badge badge-orange" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <Lock size={14} style={{ marginRight: '4px' }} /> Solo lectura
            </span>
          )}
          {isAdmin && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nueva Unidad</button>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Buscar unidad curricular..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
            : filtered.length === 0 ? <div className="empty-state"><BookOpen size={48} /><p style={{ marginTop: '12px', fontWeight: 600 }}>No hay unidades curriculares</p></div>
              : (
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Nombre de la Unidad Curricular</th><th>Trimestre</th><th>U.C.</th><th>Horas</th><th>Asignaciones</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id}>
                        <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                        <td><div style={{ fontWeight: 600, color: '#1a3a6b', maxWidth: '400px' }}>{u.nombre}</div></td>
                        <td>
                          {u.trimestre ? <span className="badge badge-purple">{u.trimestre === 'Introductorio' ? u.trimestre : `${u.trimestre}° Trim.`}</span> : <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>}
                        </td>
                        <td><span className="badge badge-blue">{u.creditos} UC</span></td>
                        <td><span className="badge badge-green">{u.horas}hr</span></td>
                        <td><span className="badge badge-gray">{u._count?.asignaciones || 0}</span></td>
                        <td>
                          {isAdmin ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn-icon" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                              <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm(u.id)}><Trash2 size={15} /></button>
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e0', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Unidad Curricular' : 'Nueva Unidad Curricular'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Nombre de la Unidad Curricular *</label>
                <input className="form-input" placeholder="Ej: DISEÑO, EJECUCIÓN Y EVALUACIÓN DE PROYECTOS EN SALUD PÚBLICA" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Unidades de Crédito (U.C.) *</label>
                  <input className="form-input" type="number" min="1" max="10" value={form.creditos} onChange={e => setForm({ ...form, creditos: e.target.value.replace(/^0+(?=\d)/, '') })} placeholder="Ingrese una cantidad" />
                </div>
                <div className="form-group">
                  <label className="form-label">Horas Totales *</label>
                  <input className="form-input" type="number" min="1" value={form.horas} onChange={e => setForm({ ...form, horas: e.target.value.replace(/^0+(?=\d)/, '') })} placeholder="Ingrese una cantidad" />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Trimestre</label>
                <select className="form-select" value={form.trimestre} onChange={e => setForm({ ...form, trimestre: e.target.value })}>
                  <option value="">— Sin Trimestre Especificado —</option>
                  <option value="Introductorio">Introductorio</option>
                  <option value="I">I Trimestre</option>
                  <option value="II">II Trimestre</option>
                  <option value="III">III Trimestre</option>
                  <option value="IV">IV Trimestre</option>
                  <option value="V">V Trimestre</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Unidad'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Unidad</h3><button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button></div>
            <div className="modal-body"><p>¿Eliminar esta unidad curricular?</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}><Trash2 size={15} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
