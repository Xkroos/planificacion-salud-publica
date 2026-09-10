'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, Trash2, X, Shield, Eye, EyeOff } from 'lucide-react'

type Usuario = { id: string; nombre: string; email: string; rol: 'ADMIN' | 'OPERADOR'; activo: boolean; createdAt: string }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'OPERADOR', activo: true })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetch_ = async () => {
    const res = await fetch('/sistema/api/usuarios')
    setUsuarios(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const openCreate = () => { setEditing(null); setForm({ nombre: '', email: '', password: '', rol: 'OPERADOR', activo: true }); setError(''); setShowModal(true) }
  const openEdit = (u: Usuario) => { setEditing(u); setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.nombre || !form.email) { setError('Nombre y email son requeridos'); return }
    if (!editing && !form.password) { setError('La contraseña es requerida para nuevos usuarios'); return }
    setSaving(true)
    try {
      const url = editing ? `/sistema/api/usuarios/${editing.id}` : '/sistema/api/usuarios'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetch_()
      setShowModal(false)
    } catch (e: unknown) { setError((e as Error).message || 'Error al guardar') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/sistema/api/usuarios/${id}`, { method: 'DELETE' })
    await fetch_()
    setDeleteConfirm(null)
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#2d6bc4" /> Gestión de Usuarios
          </h1>

        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nuevo Usuario</button>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div> : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Registrado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: u.rol === 'ADMIN' ? '#dbeafe' : '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield size={14} color={u.rol === 'ADMIN' ? '#2d6bc4' : '#7c3aed'} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                      </div>
                    </td>
                    <td style={{ color: '#718096' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.rol === 'ADMIN' ? 'badge-blue' : 'badge-purple'}`}>
                        {u.rol === 'ADMIN' ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ color: '#718096', fontSize: '13px' }}>{new Date(u.createdAt).toLocaleDateString('es-VE')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                        <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm(u.id)}><Trash2 size={15} /></button>
                      </div>
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
              <h3 className="modal-title">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input className="form-input" placeholder="Nombre del usuario" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Correo Electrónico *</label>
                <input className="form-input" type="email" placeholder="usuario@unerg.edu.ve" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{editing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Rol *</label>
                  <select className="form-select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                    <option value="OPERADOR">Operador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.activo ? 'true' : 'false'} onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Usuario'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Usuario</h3><button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button></div>
            <div className="modal-body"><p>¿Eliminar este usuario? No podrá iniciar sesión.</p></div>
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
