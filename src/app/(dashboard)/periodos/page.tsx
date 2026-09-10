'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

type Periodo = {
  id: string
  anio: number
  numero: number
  modalidad: string
  fechaInicioEstimada?: string | null
  fechaFinEstimada?: string | null
  trimestres: string[]
  tabulador?: number
  resolucion?: string | null
  estado?: string
  _count?: { cronogramas: number }
}

const MODALIDAD_OPTS = ['PRESENCIAL', 'VIRTUAL', 'MULTIMODAL']
const TRIMESTRE_OPTS = ['Introductorio', 'I', 'II', 'III', 'IV', 'V']

function fmtFecha(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PeriodosPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [finalizarConfirm, setFinalizarConfirm] = useState<string | null>(null)
  const [finalizarError, setFinalizarError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingPeriodo, setEditingPeriodo] = useState<Periodo | null>(null)

  const fetchPeriodos = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/sistema/api/periodos')
    setPeriodos(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchPeriodos() }, [fetchPeriodos])

  const openNuevo = () => {
    setEditingPeriodo(null)
    setShowModal(true)
  }

  const openEdit = (p: Periodo) => {
    setEditingPeriodo(p)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    setDeleteError('')
    try {
      const res = await fetch(`/sistema/api/periodos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || 'Error al eliminar el periodo')
        return
      }
      await fetchPeriodos()
      setDeleteConfirm(null)
    } catch (e: any) {
      setDeleteError(e.message || 'Error al conectar')
    }
  }

  const handleFinalizar = async (id: string) => {
    setFinalizarError('')
    try {
      const res = await fetch(`/sistema/api/periodos/${id}/finalizar`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json()
        setFinalizarError(data.error || 'Error al finalizar el periodo')
        return
      }
      await fetchPeriodos()
      setFinalizarConfirm(null)
    } catch (e: any) {
      setFinalizarError(e.message || 'Error al conectar')
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={24} color="#2d6bc4" /> Periodos Académicos
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{periodos.length} periodo(s) registrado(s)</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNuevo}>
            <Plus size={16} /> Nuevo Periodo
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
          <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando periodos...
        </div>
      ) : periodos.length === 0 ? (
        <div className="empty-state card" style={{ padding: '60px 20px' }}>
          <Calendar size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
          <p style={{ marginTop: '12px', fontWeight: 600 }}>No hay periodos registrados</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openNuevo}>
              <Plus size={16} /> Crear primer periodo
            </button>
          )}
        </div>
      ) : !Array.isArray(periodos) ? (
        <div className="alert alert-error">Error al cargar los periodos. Asegúrate de reiniciar el servidor.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {periodos.map((p) => (
            <PeriodoCard
              key={p.id}
              periodo={p}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onFinalizar={(id) => setFinalizarConfirm(id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PeriodoModal 
          editing={editingPeriodo} 
          latestPeriodo={periodos.length > 0 ? periodos[0] : null}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchPeriodos() }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteError('') }}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Periodo</h3>
              <button className="btn-icon" onClick={() => { setDeleteConfirm(null); setDeleteError('') }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {deleteError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{deleteError}</div>}
              <p style={{ color: '#4a5568' }}>¿Eliminar este periodo académico? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDeleteConfirm(null); setDeleteError('') }}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {finalizarConfirm && (
        <div className="modal-overlay" onClick={() => { setFinalizarConfirm(null); setFinalizarError('') }}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#d97706' }}>Finalizar Periodo</h3>
              <button className="btn-icon" onClick={() => { setFinalizarConfirm(null); setFinalizarError('') }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {finalizarError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{finalizarError}</div>}
              <p style={{ color: '#4a5568' }}>¿Estás seguro de que deseas finalizar este periodo? Toda la información pasará al módulo de Expedientes y los módulos principales quedarán limpios para un nuevo periodo.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setFinalizarConfirm(null); setFinalizarError('') }}>Cancelar</button>
              <button className="btn" style={{ background: '#d97706', color: 'white' }} onClick={() => handleFinalizar(finalizarConfirm)}>
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PeriodoCard({ periodo, isAdmin, onEdit, onDelete, onFinalizar }: { periodo: Periodo, isAdmin: boolean, onEdit: (p: Periodo) => void, onDelete: (id: string) => void, onFinalizar: (id: string) => void }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ padding: '20px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
              Periodo {periodo.anio}-{periodo.numero}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#4a5568' }}>
                {periodo.modalidad}
              </span>
              <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: periodo.estado === 'CERRADO' ? '#fee2e2' : '#dcfce7', color: periodo.estado === 'CERRADO' ? '#991b1b' : '#166534' }}>
                {periodo.estado || 'ACTIVO'}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Inicio estimado:</span>
            <span style={{ fontWeight: 500 }}>{fmtFecha(periodo.fechaInicioEstimada)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Fin estimado:</span>
            <span style={{ fontWeight: 500 }}>{fmtFecha(periodo.fechaFinEstimada)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cronogramas / Secciones:</span>
            <span style={{ fontWeight: 500 }}>{periodo._count?.cronogramas || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tabulador:</span>
            <span style={{ fontWeight: 500 }}>${periodo.tabulador || 50}</span>
          </div>
          {periodo.resolucion && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Resolución:</span>
              <span style={{ fontWeight: 500 }}>{periodo.resolucion}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#718096', fontWeight: 600, marginBottom: '6px' }}>Trimestres Activos:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {(periodo.trimestres || []).length > 0 ? periodo.trimestres.map(t => (
              <span key={t} style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>
                {t}
              </span>
            )) : <span style={{ fontSize: '12px', color: '#a0aec0' }}>Ninguno definido</span>}
          </div>
        </div>
      </div>
      
      {isAdmin && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '8px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          {periodo.estado !== 'CERRADO' ? (
            <>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onEdit(periodo)}>
                <Pencil size={14} /> Editar
              </button>
              <button className="btn btn-sm" style={{ flex: 1, background: '#f59e0b', color: 'white' }} onClick={() => onFinalizar(periodo.id)}>
                Finalizar
              </button>
            </>
          ) : (
            <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#718096', fontWeight: 600 }}>Periodo Finalizado</div>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(periodo.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function PeriodoModal({ editing, latestPeriodo, onClose, onSaved }: { editing: Periodo | null, latestPeriodo?: Periodo | null, onClose: () => void, onSaved: () => void }) {
  const [form, setForm] = useState({
    anio: editing?.anio?.toString() || latestPeriodo?.anio?.toString() || new Date().getFullYear().toString(),
    numero: editing?.numero?.toString() || (latestPeriodo ? (latestPeriodo.numero + 1).toString() : '1'),
    modalidad: editing?.modalidad || 'MULTIMODAL',
    fechaInicioEstimada: editing?.fechaInicioEstimada ? new Date(editing.fechaInicioEstimada).toISOString().split('T')[0] : '',
    fechaFinEstimada: editing?.fechaFinEstimada ? new Date(editing.fechaFinEstimada).toISOString().split('T')[0] : '',
    trimestres: editing?.trimestres || [...TRIMESTRE_OPTS],
    tabulador: editing?.tabulador?.toString() || '50',
    resolucion: editing?.resolucion || ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Cargar resolución global si el periodo no tiene una
  useEffect(() => {
    if (!editing?.resolucion) {
      fetch('/sistema/api/configuracion')
        .then(r => r.json())
        .then(d => { if (d.resolucion) setForm(prev => ({ ...prev, resolucion: d.resolucion })) })
        .catch(() => {})
    }
  }, [])

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const url = editing ? `/sistema/api/periodos/${editing.id}` : '/sistema/api/periodos'
      const method = editing ? 'PUT' : 'POST'
      // Guardar periodo y resolución global en paralelo
      const [res] = await Promise.all([
        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
        fetch('/sistema/api/configuracion', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolucion: form.resolucion || null }),
        }),
      ])
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast.success(editing ? 'Periodo actualizado correctamente' : 'Periodo creado exitosamente')
      onSaved()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleTrimestre = (t: string) => {
    if (form.trimestres.includes(t)) {
      setForm({ ...form, trimestres: form.trimestres.filter(x => x !== t) })
    } else {
      setForm({ ...form, trimestres: [...form.trimestres, t] })
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editing ? 'Editar Periodo' : 'Nuevo Periodo'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Año *</label>
              <input className="form-input" type="number" min="2020" max="2040"
                value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value.replace(/^0+(?=\d)/, '') })} />
            </div>
            <div className="form-group">
              <label className="form-label">N° de Periodo *</label>
              <input className="form-input" type="number" min="1" max="4"
                value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value.replace(/^0+(?=\d)/, '') })} />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Modalidad *</label>
              <select className="form-select" value={form.modalidad}
                onChange={e => setForm({ ...form, modalidad: e.target.value })}>
                {MODALIDAD_OPTS.map(m => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha estimada de inicio</label>
              <input className="form-input" type="date" value={form.fechaInicioEstimada}
                onChange={e => setForm({ ...form, fechaInicioEstimada: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha estimada de finalización</label>
              <input className="form-input" type="date" value={form.fechaFinEstimada}
                onChange={e => setForm({ ...form, fechaFinEstimada: e.target.value })} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Tabulador Global ($) *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.tabulador}
                onChange={e => setForm({ ...form, tabulador: e.target.value.replace(/^0+(?=\d)/, '') })} placeholder="Ingrese una cantidad" />
            </div>

            <div className="form-group">
              <label className="form-label">Nro. de Resolución * <span style={{ fontSize: '11px', color: '#718096', fontWeight: 400 }}>(global)</span></label>
              <input className="form-input" type="text" placeholder="Ej: 2025-866" value={form.resolucion}
                onChange={e => setForm({ ...form, resolucion: e.target.value })} required />
              <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Se aplicará a todos los cronogramas del sistema.</p>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Trimestres / Contenido del Periodo *</label>
              <p style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>Selecciona los trimestres que estarán disponibles para crear cronogramas en este periodo.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {TRIMESTRE_OPTS.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', background: 'white', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <input type="checkbox" checked={form.trimestres.includes(t)} onChange={() => toggleTrimestre(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || form.trimestres.length === 0 || !form.resolucion.trim()}>
            {saving ? <Loader2 size={16} /> : null}
            {saving ? 'Guardando...' : 'Guardar Periodo'}
          </button>
        </div>
      </div>
    </div>
  )
}
