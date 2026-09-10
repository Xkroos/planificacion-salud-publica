'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Pencil, Trash2, X, Search,
  Phone, Mail, GraduationCap, Loader2, UserPlus,
  ArrowUpCircle, BookOpen, MapPin, Calendar, Clock, ChevronRight, AlertCircle,
  ChevronLeft
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

type UnidadCurricular = { id: string; nombre: string; creditos: number; trimestre: string | null }
type Seccion = { id: string; nombre: string }

type HistorialEntry = {
  id: string
  trimestreAnterior: string | null
  trimestreNuevo: string
  periodoId: string | null
  aulaTerritorial?: { nombre: string } | null
  cambiadoPor: string | null
  createdAt: string
}

type Participante = {
  id: string
  nombre: string
  apellido?: string | null
  cedula?: string | null
  telefono?: string | null
  email?: string | null
  genero: 'MASCULINO' | 'FEMENINO'
  unidad?: UnidadCurricular | null
  trimestre?: string | null
  seccion?: string | null
  region?: { nombre: string } | null
  aulaTerritorial?: { nombre: string } | null
  periodo?: { anio: number; numero: number } | null
  periodoId?: string | null
  cronogramas?: {
    cronograma: {
      trimestre: string
      seccion: string
      aulaTerritorial: { nombre: string }
      periodo: { anio: number; numero: number; fechaInicioEstimada?: string | null; fechaFinEstimada?: string | null }
    }
  }[]
  historial?: HistorialEntry[]
}

const TRIMESTRES = [
  { value: 'Introductorio', label: 'Introductorio' },
  { value: 'I', label: 'I Trimestre' },
  { value: 'II', label: 'II Trimestre' },
  { value: 'III', label: 'III Trimestre' },
  { value: 'IV', label: 'IV Trimestre' },
  { value: 'V', label: 'V Trimestre' },
]

function formatTrimestre(t: string | null | undefined) {
  if (!t) return 'Sin nivel'
  if (t === 'Introductorio') return 'Introductorio'
  return `${t}\u00b0 Trimestre`
}

function formatDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const trimColors: Record<string, { bg: string; color: string; border: string }> = {
  'Introductorio': { bg: '#f0f9ff', color: '#0369a1', border: '#7dd3fc' },
  'I': { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  'II': { bg: '#fefce8', color: '#a16207', border: '#fde047' },
  'III': { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  'IV': { bg: '#fdf4ff', color: '#9333ea', border: '#d8b4fe' },
  'V': { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
}

export default function ParticipantesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [unidades, setUnidades] = useState<UnidadCurricular[]>([])
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [regiones, setRegiones] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canRegister, setCanRegister] = useState(false)
  const [activePeriodo, setActivePeriodo] = useState<any>(null)

  const [searchNombre, setSearchNombre] = useState('')
  const [filterUnidad, setFilterUnidad] = useState('')
  const [filterGenero, setFilterGenero] = useState('')
  const [filterTrimestre, setFilterTrimestre] = useState('')

  const [selectedPeriodView, setSelectedPeriodView] = useState<string>('ACTUAL')
  
  // Pagination and Stats
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  
  const [stats, setStats] = useState<{
    total: number, 
    femenino: number, 
    masculino: number, 
    periodStats: { label: string, count: number, id: string | null, activo: boolean }[]
  }>({ total: 0, femenino: 0, masculino: 0, periodStats: [] })
  
  const [loadingStats, setLoadingStats] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Participante | null>(null)
  const [form, setForm] = useState({
    nombre: '', apellido: '', cedula: '', telefono: '',
    email: '', genero: 'MASCULINO', unidadId: '', trimestre: '',
    seccion: '', periodoId: '', regionId: '', aulaTerritorialId: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [showEstatusModal, setShowEstatusModal] = useState(false)
  const [estatusParticipante, setEstatusParticipante] = useState<Participante | null>(null)
  const [nuevoTrimestre, setNuevoTrimestre] = useState('')
  const [savingEstatus, setSavingEstatus] = useState(false)
  const [errorEstatus, setErrorEstatus] = useState('')

  const [showTrayecto, setShowTrayecto] = useState(false)
  const [trayectoParticipante, setTrayectoParticipante] = useState<Participante | null>(null)
  const [loadingTrayecto, setLoadingTrayecto] = useState(false)

  const aulasFiltradas = form.regionId ? regiones.find((r: any) => r.id === form.regionId)?.aulas || [] : []

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    const params = new URLSearchParams()
    if (searchNombre) params.set('nombre', searchNombre)
    if (filterUnidad) params.set('unidadId', filterUnidad)
    if (filterGenero) params.set('genero', filterGenero)
    if (filterTrimestre) params.set('trimestre', filterTrimestre)
    
    try {
      const res = await fetch(`/sistema/api/participantes/stats?${params}`)
      const data = await res.json()
      setStats(data)
    } catch { /* ignore */ }
    setLoadingStats(false)
  }, [searchNombre, filterUnidad, filterGenero, filterTrimestre])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchNombre) params.set('nombre', searchNombre)
    if (filterUnidad) params.set('unidadId', filterUnidad)
    if (filterGenero) params.set('genero', filterGenero)
    if (filterTrimestre) params.set('trimestre', filterTrimestre)
    params.set('page', page.toString())
    params.set('limit', '10')
    
    if (selectedPeriodView === 'ACTUAL' && activePeriodo) {
      params.set('periodoId', activePeriodo.id)
    } else if (selectedPeriodView !== 'ACTUAL' && selectedPeriodView !== 'TODOS') {
      const pId = stats.periodStats.find(p => p.label === selectedPeriodView)?.id
      if (pId) params.set('periodoId', pId)
    }

    const [partRes, unidRes, configRes, seccRes, regRes, perRes] = await Promise.all([
      fetch(`/sistema/api/participantes?${params}`),
      fetch('/sistema/api/unidades'),
      fetch('/sistema/api/configuracion'),
      fetch('/sistema/api/secciones'),
      fetch('/sistema/api/regiones'),
      fetch('/sistema/api/periodos'),
    ])
    const [partData, unidData, configData, seccData, regData, perData] = await Promise.all([
      partRes.json(), unidRes.json(), configRes.json(), seccRes.json(), regRes.json(), perRes.json()
    ])

    if (partData && Array.isArray(partData.data)) {
      setParticipantes(partData.data)
      setTotalPages(partData.totalPages || 1)
      setTotalRecords(partData.total || 0)
    } else {
      setParticipantes([])
      setTotalPages(1)
      setTotalRecords(0)
    }
    
    setUnidades(Array.isArray(unidData) ? unidData : [])
    setSecciones(Array.isArray(seccData) ? seccData : [])
    setRegiones(Array.isArray(regData) ? regData : [])
    const perArr = Array.isArray(perData) ? perData : []
    setPeriodos(perArr.filter((p: any) => p.estado !== 'CERRADO'))
    const active = perArr.find((p: any) => p.estado === 'ACTIVO') || null
    
    if (!activePeriodo && active) {
       setActivePeriodo(active)
    }
    
    setCanRegister(isAdmin || configData?.inscripcionParticipantesAbierta)
    setLoading(false)
  }, [searchNombre, filterUnidad, filterGenero, filterTrimestre, page, selectedPeriodView, activePeriodo, isAdmin, stats.periodStats])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchData() }, [fetchData])
  
  // Reset page when filters change
  useEffect(() => { setPage(1) }, [searchNombre, filterUnidad, filterGenero, filterTrimestre, selectedPeriodView])

  const openCreate = () => {
    setEditing(null)
    setForm({ nombre: '', apellido: '', cedula: '', telefono: '', email: '', genero: 'MASCULINO', unidadId: '', trimestre: '', seccion: '', periodoId: '', regionId: '', aulaTerritorialId: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (p: Participante) => {
    setEditing(p)
    setForm({
      nombre: p.nombre, apellido: p.apellido || '', cedula: p.cedula || '',
      telefono: p.telefono || '', email: p.email || '', genero: p.genero,
      unidadId: p.unidad?.id || '', trimestre: p.trimestre || '', seccion: p.seccion || '',
      periodoId: (p as any).periodoId || '', regionId: (p as any).regionId || '',
      aulaTerritorialId: (p as any).aulaTerritorialId || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const url = editing ? `/sistema/api/participantes/${editing.id}` : '/sistema/api/participantes'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(editing ? 'Participante actualizado' : 'Participante registrado exitosamente')
      setShowModal(false)
      await fetchData()
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/sistema/api/participantes/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchData()
  }

  const openEstatus = (p: Participante) => {
    setEstatusParticipante(p)
    setNuevoTrimestre(p.trimestre || '')
    setErrorEstatus('')
    setShowEstatusModal(true)
  }

  const handleGuardarEstatus = async () => {
    if (!estatusParticipante || !nuevoTrimestre) return
    setErrorEstatus('')
    setSavingEstatus(true)
    try {
      const res = await fetch(`/sistema/api/participantes/${estatusParticipante.id}/estatus`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trimestreNuevo: nuevoTrimestre }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`Estatus actualizado a ${formatTrimestre(nuevoTrimestre)}`)
      setShowEstatusModal(false)
      await fetchData()
    } catch (e: unknown) {
      setErrorEstatus((e as Error).message || 'Error al actualizar')
    } finally {
      setSavingEstatus(false)
    }
  }

  const openTrayecto = async (p: Participante) => {
    setShowTrayecto(true)
    setLoadingTrayecto(true)
    setTrayectoParticipante(p)
    try {
      const res = await fetch(`/sistema/api/participantes/${p.id}`)
      const data = await res.json()
      setTrayectoParticipante(data)
    } catch {
      // keep existing data
    } finally {
      setLoadingTrayecto(false)
    }
  }

  // Replaced local filtering with stats from server

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#2d6bc4" /> Participantes
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>Registro global de participantes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!activePeriodo && !loading && (
             <span className="badge badge-red" style={{ fontSize: '12px', padding: '6px 12px' }}>
               <AlertCircle size={14} style={{ marginRight: '4px' }} /> No hay Periodo academico activo
             </span>
          )}
          {canRegister && (
            <button className="btn btn-primary" onClick={openCreate} disabled={!activePeriodo}>
              <UserPlus size={16} /> Registrar Participante
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#2d6bc4' },
          { label: 'Femenino', value: stats.femenino, color: '#7c3aed' },
          { label: 'Masculino', value: stats.masculino, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px', textAlign: 'center' }}>
            {loadingStats ? (
              <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : (
              <div style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</div>
            )}
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
            <input type="text" placeholder="Buscar nombre o cedula..." className="form-input"
              style={{ paddingLeft: '38px', borderRadius: '20px' }} value={searchNombre}
              onChange={(e) => setSearchNombre(e.target.value)} />
          </div>

          <select className="form-select" style={{ flex: '1', minWidth: '140px' }} value={filterTrimestre} onChange={e => { setFilterTrimestre(e.target.value); setFilterUnidad(''); }}>
            <option value="">Todos los niveles</option>
            {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select className="form-select" style={{ flex: '1', minWidth: '160px' }} value={filterUnidad} onChange={e => setFilterUnidad(e.target.value)} disabled={filterTrimestre !== '' && unidades.filter(u => u.trimestre === filterTrimestre).length === 0}>
            <option value="">Todas las asignaturas</option>
            {unidades.filter(u => !filterTrimestre || u.trimestre === filterTrimestre).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>

          <select className="form-select" style={{ flex: '1', minWidth: '130px' }} value={filterGenero} onChange={e => setFilterGenero(e.target.value)}>
            <option value="">Todos los generos</option>
            <option value="FEMENINO">Femenino</option>
            <option value="MASCULINO">Masculino</option>
          </select>

          {(searchNombre || filterUnidad || filterGenero || filterTrimestre) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearchNombre(''); setFilterUnidad(''); setFilterGenero(''); setFilterTrimestre(''); }}>
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', paddingLeft: '4px' }}>
            Periodos Académicos
          </h3>
          <button
            onClick={() => setSelectedPeriodView('ACTUAL')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: selectedPeriodView === 'ACTUAL' ? '#eff6ff' : 'white',
              color: selectedPeriodView === 'ACTUAL' ? '#1d4ed8' : '#475569',
              fontWeight: selectedPeriodView === 'ACTUAL' ? 700 : 500,
              boxShadow: selectedPeriodView === 'ACTUAL' ? '0 0 0 1px #bfdbfe' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Periodo Actual
            </div>
            <span style={{ fontSize: '11px', background: selectedPeriodView === 'ACTUAL' ? '#bfdbfe' : '#e2e8f0', color: selectedPeriodView === 'ACTUAL' ? '#1e3a8a' : '#64748b', padding: '2px 8px', borderRadius: '10px' }}>
              {stats.periodStats.find(p => p.id === activePeriodo?.id)?.count || 0}
            </span>
          </button>

          {stats.periodStats.filter(p => p.id !== activePeriodo?.id).length > 0 && (
            <>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
              <button
                onClick={() => setSelectedPeriodView('TODOS')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: selectedPeriodView === 'TODOS' ? '#f8fafc' : 'white',
                  color: selectedPeriodView === 'TODOS' ? '#0f172a' : '#475569',
                  fontWeight: selectedPeriodView === 'TODOS' ? 700 : 500,
                  boxShadow: selectedPeriodView === 'TODOS' ? '0 0 0 1px #cbd5e1' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s', marginBottom: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} /> Todos los Históricos
                </div>
              </button>
              {stats.periodStats.filter(p => p.id !== activePeriodo?.id).map((pStat) => (
                <button
                  key={pStat.label}
                  onClick={() => setSelectedPeriodView(pStat.label)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: selectedPeriodView === pStat.label ? '#f8fafc' : 'white',
                    color: selectedPeriodView === pStat.label ? '#0f172a' : '#475569',
                    fontWeight: selectedPeriodView === pStat.label ? 700 : 500,
                    boxShadow: selectedPeriodView === pStat.label ? '0 0 0 1px #cbd5e1' : '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> {pStat.label}
                  </div>
                  <span style={{ fontSize: '11px', background: selectedPeriodView === pStat.label ? '#e2e8f0' : '#f1f5f9', color: selectedPeriodView === pStat.label ? '#334155' : '#94a3b8', padding: '2px 8px', borderRadius: '10px' }}>
                    {pStat.count}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
                <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando participantes...
              </div>
            ) : (() => {
              if (participantes.length === 0) {
                return (
                  <div className="empty-state" style={{ padding: '60px 20px' }}>
                    <Users size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
                    <p style={{ marginTop: '12px', fontWeight: 600 }}>
                      {!activePeriodo && selectedPeriodView === 'ACTUAL' ? 'No hay Periodo academico activo en este momento' : (searchNombre || filterUnidad || filterGenero ? 'No hay resultados para los filtros aplicados' : 'No hay participantes en este periodo')}
                    </p>
                    {canRegister && activePeriodo && selectedPeriodView === 'ACTUAL' && !searchNombre && !filterUnidad && (
                      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openCreate}>
                        <UserPlus size={16} /> Registrar primero
                      </button>
                    )}
                  </div>
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedPeriodView === 'ACTUAL' ? <Users size={18} color="#2d6bc4" /> : <Calendar size={18} color="#64748b" />}
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a3a6b', margin: 0 }}>
                        {selectedPeriodView === 'ACTUAL' ? 'Participantes del Periodo Actual' : (selectedPeriodView === 'TODOS' ? 'Todos los Históricos' : `Participantes del Periodo ${selectedPeriodView}`)}
                      </h3>
                    </div>
                    <table className="data-table" style={{ margin: 0, border: 'none' }}>
                      <thead>
                        <tr>
                          <th>Participante</th>
                          <th>Cedula</th>
                          <th>Contacto</th>
                          <th>Genero</th>
                          <th>Nivel Actual</th>
                          <th>Inscrito en</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantes.map((p, i) => {
                        const tc = trimColors[p.trimestre || ''] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                        return (
                          <tr key={p.id}>
                            <td style={{ color: '#a0aec0', fontWeight: 500 }}>{(page - 1) * 10 + i + 1}</td>
                            <td><div style={{ fontWeight: 600, color: '#1a3a6b' }}>{p.apellido}, {p.nombre}</div></td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{p.cedula || '\u2014'}</span></td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {p.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4a5568' }}><Phone size={11} /> {p.telefono}</div>}
                                {p.email && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4a5568' }}><Mail size={11} /> {p.email}</div>}
                                {!p.telefono && !p.email && <span style={{ color: '#a0aec0', fontSize: '12px' }}>\u2014</span>}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${p.genero === 'FEMENINO' ? 'badge-purple' : 'badge-green'}`}>
                                {p.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}
                              </span>
                            </td>
                            <td>
                              {p.trimestre ? (
                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                                  {formatTrimestre(p.trimestre)}
                                </span>
                              ) : <span style={{ color: '#a0aec0', fontSize: '12px' }}>Sin nivel</span>}
                            </td>
                            <td>
                              {p.cronogramas && p.cronogramas.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {p.cronogramas.map((rel: any, i: number) => (
                                    <span key={i} className="badge badge-gray" style={{ fontSize: '11px' }}>
                                      {rel.cronograma.periodo.anio}-{rel.cronograma.periodo.numero} \u00b7 {rel.cronograma.aulaTerritorial?.nombre || 'Sin aula'}
                                    </span>
                                  ))}
                                </div>
                              ) : <span style={{ color: '#a0aec0', fontSize: '12px' }}>No inscrito</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button className="btn-icon" style={{ color: '#7c3aed', borderColor: '#e9d5ff' }} onClick={() => openTrayecto(p)} title="Ver trayecto academico">
                                  <BookOpen size={14} />
                                </button>
                                {canRegister && (
                                  <button className="btn-icon" style={{ color: '#0369a1', borderColor: '#bae6fd' }} onClick={() => openEstatus(p)} title="Actualizar nivel">
                                    <ArrowUpCircle size={14} />
                                  </button>
                                )}
                                {canRegister && <button className="btn-icon" onClick={() => openEdit(p)} title="Editar"><Pencil size={14} /></button>}
                                {canRegister && (
                                  <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteConfirm(p.id)} title="Eliminar">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Mostrando {(page - 1) * 10 + 1} - {Math.min(page * 10, totalRecords)} de {totalRecords}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          <ChevronLeft size={16} /> Anterior
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', fontWeight: 600 }}>
                          Página {page} de {totalPages}
                        </div>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          disabled={page >= totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          Siguiente <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {!canRegister && !isAdmin && (
        <div className="alert alert-warning" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GraduationCap size={16} /> El proceso de inscripcion de participantes esta cerrado. Contacte al administrador.
        </div>
      )}

      {showEstatusModal && estatusParticipante && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEstatusModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a6b' }}>
                <ArrowUpCircle size={18} color="#0369a1" /> Actualizar Nivel del Estudiante
              </h3>
              <button className="btn-icon" onClick={() => setShowEstatusModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {errorEstatus && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{errorEstatus}</div>}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GraduationCap size={18} color="#0369a1" />
                <div>
                  <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '14px' }}>{estatusParticipante.apellido}, {estatusParticipante.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Nivel actual: <strong>{formatTrimestre(estatusParticipante.trimestre)}</strong></div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nuevo Nivel / Trimestre *</label>
                <select className="form-select" value={nuevoTrimestre} onChange={e => setNuevoTrimestre(e.target.value)}>
                  <option value="">— Seleccionar nivel —</option>
                  {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {nuevoTrimestre && nuevoTrimestre !== estatusParticipante.trimestre && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginTop: '12px', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChevronRight size={14} />
                  Pasara de <strong style={{ margin: '0 4px' }}>{formatTrimestre(estatusParticipante.trimestre)}</strong>
                  a <strong style={{ marginLeft: '4px' }}>{formatTrimestre(nuevoTrimestre)}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEstatusModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarEstatus}
                disabled={savingEstatus || !nuevoTrimestre || nuevoTrimestre === estatusParticipante.trimestre}>
                {savingEstatus && <Loader2 size={14} />}
                {savingEstatus ? 'Guardando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrayecto && trayectoParticipante && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTrayecto(false)}>
          <div className="modal" style={{ maxWidth: '620px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a6b' }}>
                <BookOpen size={18} color="#7c3aed" /> Trayecto Academico
              </h3>
              <button className="btn-icon" onClick={() => setShowTrayecto(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #2d6bc4 100%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', color: 'white' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                  {trayectoParticipante.apellido}, {trayectoParticipante.nombre}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', opacity: 0.9 }}>
                  {trayectoParticipante.cedula && <span>CI: {trayectoParticipante.cedula}</span>}
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '12px', fontWeight: 600 }}>
                    Nivel actual: {formatTrimestre(trayectoParticipante.trimestre)}
                  </span>
                  {trayectoParticipante.region?.nombre && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {trayectoParticipante.region.nombre}</span>
                  )}
                </div>
              </div>

              {loadingTrayecto ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
                  <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
                  Cargando trayecto...
                </div>
              ) : (
                <>
                  {trayectoParticipante.cronogramas && trayectoParticipante.cronogramas.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} /> Inscripciones en Periodos
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {trayectoParticipante.cronogramas.map((rel: any, i: number) => {
                          const crono = rel.cronograma
                          const tc2 = trimColors[crono.trimestre] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                          const fechaInicio = formatDate(crono.periodo?.fechaInicioEstimada)
                          const fechaFin = formatDate(crono.periodo?.fechaFinEstimada)
                          return (
                            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: tc2.bg, border: `2px solid ${tc2.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: tc2.color, textAlign: 'center', lineHeight: 1.2 }}>
                                {crono.trimestre === 'Introductorio' ? 'INT' : `T${crono.trimestre}`}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '14px', marginBottom: '4px' }}>
                                  {formatTrimestre(crono.trimestre)} \u2014 Seccion {crono.seccion}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4a5568' }}>
                                    <Calendar size={11} /> Periodo {crono.periodo?.anio}-{crono.periodo?.numero}
                                  </span>
                                  {crono.aulaTerritorial?.nombre && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4a5568' }}>
                                      <MapPin size={11} /> {crono.aulaTerritorial.nombre}
                                    </span>
                                  )}
                                  {(fechaInicio || fechaFin) && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#718096' }}>
                                      <Clock size={11} /> {fechaInicio || '?'} \u2014 {fechaFin || '?'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {trayectoParticipante.historial && trayectoParticipante.historial.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpCircle size={14} /> Historial de Cambios de Nivel
                      </div>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '19px', top: '0', bottom: '0', width: '2px', background: '#e2e8f0', zIndex: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {trayectoParticipante.historial.map((h, i) => {
                            const tc3 = trimColors[h.trimestreNuevo] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                            return (
                              <div key={h.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: tc3.bg, border: `2px solid ${tc3.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: tc3.color }}>
                                  {i + 1}
                                </div>
                                <div style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    {h.trimestreAnterior
                                      ? <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>{formatTrimestre(h.trimestreAnterior)}</span>
                                      : <span style={{ fontSize: '12px', color: '#94a3b8' }}>Inicio</span>
                                    }
                                    <ChevronRight size={12} color="#94a3b8" />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: tc3.color, background: tc3.bg, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${tc3.border}` }}>
                                      {formatTrimestre(h.trimestreNuevo)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={10} />
                                      {new Date(h.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {h.aulaTerritorial?.nombre && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={10} /> {h.aulaTerritorial.nombre}</span>
                                    )}
                                    {h.cambiadoPor && <span>por: <strong>{h.cambiadoPor}</strong></span>}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {(!trayectoParticipante.cronogramas || trayectoParticipante.cronogramas.length === 0) &&
                    (!trayectoParticipante.historial || trayectoParticipante.historial.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ fontWeight: 600 }}>Sin trayecto registrado</p>
                        <p style={{ fontSize: '13px', marginTop: '6px' }}>Este participante aun no tiene inscripciones ni cambios de nivel registrados.</p>
                      </div>
                    )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTrayecto(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a6b' }}>
                <UserPlus size={18} color="#2d6bc4" /> {editing ? 'Editar Participante' : 'Registrar Participante'}
              </h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input className="form-input" placeholder="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cedula *</label>
                  <input className="form-input" placeholder="Ej: V-12345678" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefono</label>
                  <input className="form-input" placeholder="Ej: 0414-1234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Correo electronico</label>
                  <input className="form-input" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Genero *</label>
                  <select className="form-select" value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
                    <option value="FEMENINO">Femenino</option>
                    <option value="MASCULINO">Masculino</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nivel / Trimestre</label>
                  <select className="form-select" value={form.trimestre} onChange={e => setForm({ ...form, trimestre: e.target.value })}>
                    <option value="">— Seleccionar —</option>
                    {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Periodo Academico</label>
                  <select className="form-select" value={form.periodoId} onChange={e => setForm({ ...form, periodoId: e.target.value })}>
                    <option value="">— Seleccionar —</option>
                    {periodos.map(p => <option key={p.id} value={p.id}>{p.anio}-{p.numero}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.regionId} onChange={e => setForm({ ...form, regionId: e.target.value, aulaTerritorialId: '' })}>
                    <option value="">— Seleccionar —</option>
                    {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aula Territorial</label>
                  <select className="form-select" value={form.aulaTerritorialId} disabled={!form.regionId} onChange={e => setForm({ ...form, aulaTerritorialId: e.target.value })}>
                    <option value="">— Seleccionar —</option>
                    {aulasFiltradas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} />}
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Participante</h3>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#4a5568' }}>Eliminar este participante? Se perderan tambien sus inscripciones y trayecto.</p>
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

      {success && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, background: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', animation: 'slideUp 0.3s ease' }}>
          <GraduationCap size={16} /> {success}
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '4px' }}><X size={14} /></button>
        </div>
      )}
    </div>
  )
}
