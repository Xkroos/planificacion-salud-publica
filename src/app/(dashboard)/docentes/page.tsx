'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { UserCheck, Plus, Pencil, Trash2, Search, X, AlertCircle, Mail, Phone, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

type AulaTerritorial = {
  id: string
  nombre: string
  region?: { nombre: string }
}

type Docente = {
  id: string
  nombre: string
  cedula: string
  contacto: string | null
  email: string | null
  numeroCuenta: string | null
  categoria: 'CONTRATADO' | 'ORDINARIO'
  dedicacion: 'HP' | 'MT' | 'TC' | 'DE'
  aulaOrigenId: string | null
  aulaOrigen?: AulaTerritorial | null
  activo: boolean
  regionId: string | null
  region?: { nombre: string } | null
  _count?: { asignaciones: number }
}

type FormData = {
  nombre: string
  cedula: string
  contacto: string
  email: string
  numeroCuenta: string
  categoria: string
  dedicacion: string
  aulaOrigenId: string
  activo: boolean
  regionId: string
}

const categoriaLabels: Record<string, string> = {
  CONTRATADO: 'Contratado',
  ORDINARIO: 'Ordinario',
}

const dedicacionLabels: Record<string, string> = {
  HP: 'Honorarios Profesionales (HP)',
  MT: 'Medio Tiempo (MT)',
  TC: 'Tiempo Completo (TC)',
  DE: 'Dedicación Exclusiva (DE)',
}

const dedicacionBadge: Record<string, string> = {
  HP: 'badge-blue',
  MT: 'badge-green',
  TC: 'badge-orange',
  DE: 'badge-purple',
}

const emptyForm: FormData = {
  nombre: '',
  cedula: '',
  contacto: '',
  email: '',
  numeroCuenta: '',
  categoria: 'CONTRATADO',
  dedicacion: 'HP',
  aulaOrigenId: '',
  regionId: '',
  activo: true,
}

export default function DocentesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [docentes, setDocentes] = useState<Docente[]>([])
  const [aulas, setAulas] = useState<AulaTerritorial[]>([])
  const [regiones, setRegiones] = useState<{id: string, nombre: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterAula, setFilterAula] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Docente | null>(null)
  const [form, setForm] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState<boolean | null>(null)
  const [activePeriodo, setActivePeriodo] = useState<any>(null)

  const fetchDocentes = async () => {
    const res = await fetch('/api/docentes')
    const data = await res.json()
    setDocentes(data)
    setLoading(false)
  }

  const fetchAulas = async () => {
    try {
      const res = await fetch('/api/regiones')
      const regionesData = await res.json()
      setRegiones(regionesData)
      
      const allAulas: AulaTerritorial[] = []
      for (const r of regionesData) {
        for (const a of r.aulas || []) {
          allAulas.push({ ...a, region: { nombre: r.nombre } })
        }
      }
      setAulas(allAulas)
    } catch { /* ignore */ }
  }

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/configuracion')
      const data = await res.json()
      setConfigOpen(data.registroDocentesAbierto)
    } catch { /* ignore */ }
  }

  const fetchPeriodos = async () => {
    try {
      const res = await fetch('/api/periodos')
      const data = await res.json()
      setActivePeriodo(data.find((p: any) => p.estado === 'ACTIVO') || null)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchDocentes()
    fetchAulas()
    fetchConfig()
    fetchPeriodos()
  }, [])

  const canCreate = isAdmin || configOpen === true
  const canEdit = isAdmin
  const canDelete = isAdmin

  const openCreate = () => {
    if (!canCreate) {
      setError('El registro de docentes está cerrado actualmente. Contacte al administrador.')
      return
    }
    setEditing(null)
    setForm({ ...emptyForm })
    setError('')
    setShowModal(true)
  }

  const openEdit = (d: Docente) => {
    if (!canEdit) {
      setError('Solo el administrador puede modificar datos de docentes.')
      return
    }
    setEditing(d)
    setForm({
      nombre: d.nombre,
      cedula: d.cedula,
      contacto: d.contacto || '',
      email: d.email || '',
      numeroCuenta: d.numeroCuenta || '',
      categoria: d.categoria,
      dedicacion: d.dedicacion,
      aulaOrigenId: d.aulaOrigenId || '',
      regionId: d.regionId || '',
      activo: d.activo ?? true,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!form.cedula.trim()) { setError('La cédula es requerida'); return }
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/docentes/${editing.id}` : '/api/docentes'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      await fetchDocentes()
      setShowModal(false)
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar. Intente nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/docentes/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await fetchDocentes()
      setDeleteConfirm(null)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error al eliminar el docente')
    }
  }

  const handleToggleEstado = async (d: Docente) => {
    if (!canEdit) {
      toast.error('Solo el administrador puede cambiar el estado de los docentes.')
      return
    }
    try {
      // Optimistic update
      setDocentes(prev => prev.map(doc => doc.id === d.id ? { ...doc, activo: !doc.activo } : doc))
      
      const res = await fetch(`/api/docentes/${d.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: d.nombre,
          cedula: d.cedula,
          contacto: d.contacto || '',
          email: d.email || '',
          numeroCuenta: d.numeroCuenta || '',
          categoria: d.categoria,
          dedicacion: d.dedicacion,
          aulaOrigenId: d.aulaOrigenId || '',
          regionId: d.regionId || '',
          activo: !d.activo
        })
      })
      if (!res.ok) {
        // Revert on error
        setDocentes(prev => prev.map(doc => doc.id === d.id ? { ...doc, activo: d.activo } : doc))
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar')
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error al cambiar el estado del docente')
    }
  }

  const filtered = docentes.filter(d => {
    const matchSearch = d.nombre.toLowerCase().includes(search.toLowerCase()) || d.cedula.includes(search)
    const matchEstado = filterEstado === 'TODOS' ? true : (filterEstado === 'ACTIVO' ? d.activo : !d.activo)
    const matchAula = filterAula === '' ? true : d.aulaOrigenId === filterAula
    return matchSearch && matchEstado && matchAula
  })

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text('Listado de Docentes', 14, 15)
    
    const tableData = filtered.map((d, index) => [
      index + 1,
      d.nombre,
      d.cedula,
      d.email || 'N/A',
      d.contacto || 'N/A',
      categoriaLabels[d.categoria],
      dedicacionLabels[d.dedicacion],
      d.region?.nombre || 'N/A',
      d.activo ? 'Activo' : 'Inactivo',
      d._count?.asignaciones || 0
    ])

    ;(doc as any).autoTable({
      startY: 20,
      head: [['#', 'Nombre', 'Cédula', 'Email', 'Teléfono', 'Categoría', 'Dedicación', 'Región', 'Estado', 'Asignaciones']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 58, 107] }
    })

    doc.save('listado-docentes.pdf')
    toast.success('PDF descargado exitosamente')
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={24} color="#2d6bc4" /> Docentes
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
            {docentes.length} docente{docentes.length !== 1 ? 's' : ''} registrado{docentes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!activePeriodo && !loading ? (
             <span className="badge badge-red" style={{ fontSize: '12px', padding: '6px 12px' }}>
               <AlertCircle size={14} style={{ marginRight: '4px' }} /> No hay Periodo academico activo
             </span>
          ) : !isAdmin && configOpen === false && (
            <span className="badge badge-red" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <AlertCircle size={14} style={{ marginRight: '4px' }} /> Registro Cerrado
            </span>
          )}
          <button className="btn btn-secondary" onClick={exportToPDF} disabled={filtered.length === 0}>
            <Download size={16} /> Descargar PDF
          </button>
          <button className="btn btn-primary" onClick={openCreate} disabled={!canCreate || !activePeriodo}>
            <Plus size={16} /> Nuevo Docente
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && !showModal && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 0 200px' }}>
          <select className="form-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
        <div style={{ flex: '0 0 250px' }}>
          <select className="form-select" value={filterAula} onChange={e => setFilterAula(e.target.value)}>
            <option value="">Todas las AAT</option>
            {aulas.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} {a.region ? `(${a.region.nombre})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <UserCheck size={48} />
              <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px' }}>
                {!activePeriodo ? 'No hay Periodo academico activo en este momento' : 'No hay docentes'}
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                {!activePeriodo ? '' : (search ? 'No se encontraron resultados' : 'Comienza agregando el primer docente')}
              </p>
              {!search && canCreate && activePeriodo && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={openCreate}>
                  <Plus size={14} /> Agregar Docente
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre del Docente</th>
                  <th>Cédula</th>
                  <th>Contacto</th>
                  <th>Categoría</th>
                  <th>Dedicación</th>
                  <th>Estado</th>
                  <th>Estado (Región)</th>
                  <th>Asignaciones</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{ color: '#a0aec0', fontWeight: 500 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1a3a6b' }}>{d.nombre}</div>
                      {d.email && (
                        <div style={{ fontSize: '12px', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Mail size={11} /> {d.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{d.cedula}</span>
                    </td>
                    <td>
                      {d.contacto ? (
                        <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color="#718096" /> {d.contacto}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e0', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${d.categoria === 'CONTRATADO' ? 'badge-blue' : 'badge-navy'}`}>
                        {categoriaLabels[d.categoria]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${dedicacionBadge[d.dedicacion]}`}>
                        {dedicacionLabels[d.dedicacion]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                          <input 
                            type="checkbox" 
                            checked={!!d.activo}
                            onChange={() => handleToggleEstado(d)}
                            disabled={!canEdit}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', cursor: canEdit ? 'pointer' : 'not-allowed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: d.activo ? '#10b981' : '#cbd5e0', transition: '.4s', borderRadius: '20px'
                          }}>
                            <span style={{
                              position: 'absolute', content: '""', height: '14px', width: '14px', left: '3px', bottom: '3px',
                              backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                              transform: d.activo ? 'translateX(16px)' : 'translateX(0)'
                            }}></span>
                          </span>
                        </label>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: d.activo ? '#059669' : '#718096' }}>
                          {d.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {d.region ? (
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{d.region.nombre}</div>
                      ) : (
                        <span style={{ color: '#cbd5e0', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">{d._count?.asignaciones || 0}</span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canEdit && (
                            <button className="btn-icon" onClick={() => openEdit(d)} title="Editar">
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn-icon"
                              style={{ color: '#dc2626', borderColor: '#fecaca' }}
                              onClick={() => setDeleteConfirm(d.id)}
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Docente' : 'Nuevo Docente'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              {/* Nombre */}
              <div className="form-group">
                <label className="form-label">Nombres y Apellidos *</label>
                <input
                  className="form-input"
                  placeholder="Ej: JUAN CARLOS PÉREZ RODRÍGUEZ"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Cedula + Contacto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Número de Cédula *</label>
                  <input
                    className="form-input"
                    placeholder="Ej: 12345678"
                    value={form.cedula}
                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Contacto</label>
                  <input
                    className="form-input"
                    placeholder="Ej: 0412-1234567"
                    value={form.contacto}
                    onChange={e => setForm({ ...form, contacto: e.target.value })}
                  />
                </div>
              </div>

              {/* Email + Cuenta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="Ej: docente@correo.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Cuenta (Opcional)</label>
                  <input
                    className="form-input"
                    placeholder="Ej: 0102-0000-00-0000000"
                    value={form.numeroCuenta}
                    onChange={e => setForm({ ...form, numeroCuenta: e.target.value })}
                  />
                </div>
              </div>

              {/* Categoria + Dedicacion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                  >
                    <option value="CONTRATADO">Contratado</option>
                    <option value="ORDINARIO">Ordinario</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dedicación *</label>
                  <select
                    className="form-select"
                    value={form.dedicacion}
                    onChange={e => setForm({ ...form, dedicacion: e.target.value })}
                  >
                    <option value="HP">HP — Honorarios Profesionales</option>
                    <option value="MT">MT — Medio Tiempo</option>
                    <option value="TC">TC — Tiempo Completo</option>
                    <option value="DE">DE — Dedicación Exclusiva</option>
                  </select>
                </div>
              </div>

              {/* AAT Origen + Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Estado (Región) *</label>
                  <select
                    className="form-select"
                    value={form.regionId}
                    onChange={e => setForm({ ...form, regionId: e.target.value, aulaOrigenId: '' })}
                  >
                    <option value="">— Seleccione un estado —</option>
                    {regiones.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aula Territorial (Origen)</label>
                  <select
                    className="form-select"
                    value={form.aulaOrigenId}
                    onChange={e => setForm({ ...form, aulaOrigenId: e.target.value })}
                    disabled={!form.regionId}
                  >
                    <option value="">— Sin aula origen —</option>
                    {aulas.filter(a => {
                      const selectedRegionName = regiones.find(r => r.id === form.regionId)?.nombre;
                      return a.region?.nombre === selectedRegionName;
                    }).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado del Docente *</label>
                  <select
                    className="form-select"
                    value={form.activo ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}
                  >
                    <option value="true">Activo (Asignable)</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Docente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Docente</h3>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#4a5568' }}>
                ¿Estás seguro de que deseas eliminar este docente?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
