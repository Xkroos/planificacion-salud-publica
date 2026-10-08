'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { ClipboardList, Plus, Eye, Edit2, Trash2, X, Search, Loader2, ChevronRight, ChevronDown, MapPin, BookOpen, Users, ChevronLeft, Sparkles, CheckCircle2, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CronogramaEditModal } from '@/components/CronogramaEditModal'
import { AgregarSeccionModal } from '@/components/AgregarSeccionModal'

type Cronograma = {
  id: string
  periodoId?: string
  periodo: { id?: string; anio: number; numero: number; modalidad: string; trimestres?: string[] }
  trimestre: string
  seccion: string
  aulaTerritorialId?: string
  aulaTerritorial: { id?: string; nombre: string; coordinador: string | null; enlace?: string | null; region: { id?: string; nombre: string } }
  vocero: string | null
  telefonoVocero?: string | null
  emailVocero?: string | null
  resolucion?: string | null
  modalidad: string
  participantesFem: number
  participantesMasc: number
  asignaciones: { id: string; docente: any }[]
  _count: { participantes: number }
}

function CronogramaListContent() {
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<string[]>([])
  const [expandedAulas, setExpandedAulas] = useState<string[]>([])
  const [expandedTrimestres, setExpandedTrimestres] = useState<string[]>([])
  const [activePeriodo, setActivePeriodo] = useState<any>(null)
  
  const [showModal, setShowModal] = useState(false)
  const [editingCronograma, setEditingCronograma] = useState<Cronograma | null>(null)
  const [agregarSeccionCronograma, setAgregarSeccionCronograma] = useState<Cronograma | null>(null)
  const [cleaningDuplicados, setCleaningDuplicados] = useState(false)
  const [showCleanConfirm, setShowCleanConfirm] = useState(false)
  const [cleanMessage, setCleanMessage] = useState<string | null>(null)

  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const searchParams = useSearchParams()
  const router = useRouter()
  const nuevoParam = searchParams.get('nuevo')

  useEffect(() => {
    if (nuevoParam === 'true' || nuevoParam === '1') {
      setShowModal(true)
    }
  }, [nuevoParam])

  const handleCloseModal = () => {
    setShowModal(false)
    if (nuevoParam) {
      router.replace('/cronograma')
    }
  }

  const handleSavedModal = () => {
    setShowModal(false)
    if (nuevoParam) {
      router.replace('/cronograma')
    }
    fetch_()
  }

  const [config, setConfig] = useState<any>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  const [filterRegion, setFilterRegion] = useState('')
  const [filterAula, setFilterAula] = useState('')
  const [filterTrimestre, setFilterTrimestre] = useState('')
  const [regionesList, setRegionesList] = useState<any[]>([])

  const fetch_ = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterRegion) params.set('regionId', filterRegion)
    if (filterAula) params.set('aulaTerritorialId', filterAula)
    if (filterTrimestre) params.set('trimestre', filterTrimestre)
    params.set('page', page.toString())
    params.set('limit', '10')

    try {
      const [resCr, resConf, resPer, resReg] = await Promise.all([
        fetch(`/sistema/api/cronograma?${params}`),
        fetch('/sistema/api/configuracion'),
        fetch('/sistema/api/periodos'),
        fetch('/sistema/api/regiones')
      ])
      
      const crData = await resCr.json()
      if (crData && Array.isArray(crData.data)) {
        setCronogramas(crData.data)
        setTotalPages(crData.totalPages || 1)
        setTotalRecords(crData.total || 0)
      } else {
        setCronogramas([])
        setTotalPages(1)
        setTotalRecords(0)
      }

      setConfig(await resConf.json())
      const per = await resPer.json()
      setActivePeriodo(per.find((p: any) => p.estado === 'ACTIVO') || null)
      setRegionesList(await resReg.json())
    } catch {
      setCronogramas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch_() }, [page, search, filterRegion, filterAula, filterTrimestre])

  // Reset page to 1 when search changes
  useEffect(() => { setPage(1) }, [search, filterRegion, filterAula, filterTrimestre])

  const handleDelete = async (id: string) => {
    await fetch(`/sistema/api/cronograma/${id}`, { method: 'DELETE' })
    await fetch_()
    setDeleteConfirm(null)
  }

  const handleLimpiarDuplicados = async () => {
    setCleaningDuplicados(true)
    setShowCleanConfirm(false)
    try {
      const res = await fetch('/sistema/api/cronograma/limpiar-duplicados', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCleanMessage(`Limpieza completada: Se eliminaron ${data.cronogramasEliminados} cronograma(s) duplicado(s) y se unificaron ${data.sedesFusionadas || 0} sede(s).`)
        fetch_()
      } else {
        alert(data.error || 'Error al ejecutar limpieza de duplicados')
      }
    } catch {
      alert('Error de conexión al limpiar duplicados')
    } finally {
      setCleaningDuplicados(false)
    }
  }

  const filtered = cronogramas // Filtering is now server-side

  return (
    <div className="fade-in">
      {cleanMessage && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px' }}>
            <CheckCircle2 size={18} color="#16a34a" /> {cleanMessage}
          </div>
          <button className="btn-icon" onClick={() => setCleanMessage(null)} style={{ border: 'none', background: 'transparent', color: '#166534' }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={24} color="#2d6bc4" /> Cronogramas de Planificación
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{totalRecords} cronograma(s) registrado(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAdmin && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowCleanConfirm(true)} 
              disabled={cleaningDuplicados || loading}
              title="Detectar y eliminar automáticamente cronogramas repetidos en el sistema"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {cleaningDuplicados ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} color="#d97706" />}
              {cleaningDuplicados ? 'Limpiando...' : 'Limpiar Duplicados'}
            </button>
          )}
          {(!activePeriodo && !loading) ? (
            <div style={{ background: '#fffbeb', color: '#b45309', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #fde68a' }}>
              No hay Periodo academico activo
            </div>
          ) : (!isAdmin && config && !config.asignacionCargaAbierta) ? (
            <div style={{ background: '#fffbeb', color: '#b45309', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #fde68a' }}>
              Proceso de carga cerrado
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={!activePeriodo}>
              <Plus size={16} /> Nuevo Cronograma
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
            <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Buscar por período, sede, región..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <select className="form-select" value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterAula('') }}>
              <option value="">Todas las Regiones</option>
              {regionesList.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <select className="form-select" value={filterAula} onChange={e => setFilterAula(e.target.value)} disabled={!filterRegion}>
              <option value="">Todas las Sedes</option>
              {regionesList.find(r => r.id === filterRegion)?.aulas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <select className="form-select" value={filterTrimestre} onChange={e => setFilterTrimestre(e.target.value)}>
              <option value="">Todos los Trimestres</option>
              <option value="Introductorio">Introductorio</option>
              <option value="I">1° Trimestre (I)</option>
              <option value="II">2° Trimestre (II)</option>
              <option value="III">3° Trimestre (III)</option>
              <option value="IV">4° Trimestre (IV)</option>
              <option value="V">5° Trimestre (V)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
          : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <ClipboardList size={48} />
                <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px' }}>
                  {!activePeriodo ? 'No hay Periodo academico activo en este momento' : (search || filterRegion || filterTrimestre ? 'Sin resultados' : 'No hay cronogramas')}
                </p>
                {!search && activePeriodo && (isAdmin || (config && config.asignacionCargaAbierta)) && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>Generar primer cronograma</button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Período</th>
                    <th>Sede y Región</th>
                    <th>Trimestre y Sección</th>
                    <th>Participantes</th>
                    <th>Docentes</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const totalDocentes = c.asignaciones.filter((a: any) => a.docente).length
                    const totalMaterias = c.asignaciones.length
                    return (
                      <tr key={c.id}>
                        <td style={{ color: '#a0aec0', fontWeight: 500 }}>{(page - 1) * 10 + i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.periodo.anio}-{c.periodo.numero}</div>
                          <span className="badge badge-orange" style={{ fontSize: '10px' }}>{c.modalidad}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#2d3748' }}>{c.aulaTerritorial.nombre}</div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>{c.aulaTerritorial.region.nombre}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1a3a6b' }}>{c.trimestre === 'Introductorio' ? c.trimestre : `${c.trimestre}° Trimestre`}</div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>Sección {c.seccion}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                            <span style={{ color: '#d53f8c', fontWeight: 600 }}>♀ {c.participantesFem}</span>
                            <span style={{ color: '#3182ce', fontWeight: 600 }}>♂ {c.participantesMasc}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-blue">{totalDocentes} asignados</span>
                          <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>de {totalMaterias} materias</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Link href={`/cronograma/${c.id}`} className="btn-icon" title="Ver Detalle">
                              <Eye size={16} />
                            </Link>
                            {(isAdmin || (config && config.asignacionCargaAbierta)) && (
                              <>
                                <button 
                                  className="btn-icon" 
                                  style={{ color: '#059669', borderColor: '#a7f3d0' }} 
                                  title="Agregar Sección"
                                  onClick={() => setAgregarSeccionCronograma(c)}
                                >
                                  <PlusCircle size={16} />
                                </button>
                                <button 
                                  className="btn-icon" 
                                  style={{ color: '#2563eb', borderColor: '#bfdbfe' }} 
                                  title="Editar información del cronograma"
                                  onClick={() => setEditingCronograma(c)}
                                >
                                  <Edit2 size={16} />
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button className="btn-icon" style={{ color: '#dc2626' }} title="Eliminar" onClick={() => setDeleteConfirm(c.id)}>
                                <Trash2 size={16} />
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
          )
        }
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
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

      {showModal && (
        <CronogramaGeneratorModal
          onClose={handleCloseModal}
          onSaved={handleSavedModal}
        />
      )}

      {editingCronograma && (
        <CronogramaEditModal
          cronograma={editingCronograma}
          onClose={() => setEditingCronograma(null)}
          onSaved={() => {
            setEditingCronograma(null)
            fetch_()
          }}
        />
      )}

      {agregarSeccionCronograma && (
        <AgregarSeccionModal
          cronogramaBase={agregarSeccionCronograma}
          onClose={() => setAgregarSeccionCronograma(null)}
          onSaved={() => {
            setAgregarSeccionCronograma(null)
            fetch_()
          }}
        />
      )}

      {showCleanConfirm && (
        <div className="modal-overlay" onClick={() => setShowCleanConfirm(false)}>
          <div className="modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} /> Limpiar Cronogramas Repetidos
              </h3>
              <button className="btn-icon" onClick={() => setShowCleanConfirm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#374151' }}>
                ¿Desea buscar y eliminar automáticamente los cronogramas y sedes duplicadas?
              </p>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', marginTop: '12px' }}>
                <strong>Seguro y sin pérdida de datos:</strong> Si una sección repetida tiene docentes o estudiantes asignados, estos se consolidarán en la sección principal antes de eliminar la copia vacía.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCleanConfirm(false)} disabled={cleaningDuplicados}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleLimpiarDuplicados} disabled={cleaningDuplicados} style={{ background: '#d97706', borderColor: '#d97706' }}>
                {cleaningDuplicados ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {cleaningDuplicados ? 'Limpiando...' : 'Sí, Limpiar Duplicados'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>Eliminar Cronograma</h3>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>¿Eliminar este cronograma? Se eliminarán todas las asignaciones de docentes asociadas a esta sección.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 2000px; }
        }
      `}</style>
    </div>
  )
}

export default function CronogramaListPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>}>
      <CronogramaListContent />
    </Suspense>
  )
}

function CronogramaGeneratorModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [periodos, setPeriodos] = useState<any[]>([])
  const [regiones, setRegiones] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [allExistingCrons, setAllExistingCrons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    periodoId: '',
    regionId: '',
    aulaTerritorialId: '',
    trimestre: '',
    modalidad: 'PRESENCIAL',
    vocero: '',
    telefonoVocero: '',
    emailVocero: '',
    participantesFem: '0',
    participantesMasc: '0',
  })
  const [materias, setMaterias] = useState<{ [id: string]: number }>({})

  useEffect(() => {
    Promise.all([
      fetch('/sistema/api/periodos').then(r => r.json()),
      fetch('/sistema/api/regiones').then(r => r.json()),
      fetch('/sistema/api/unidades').then(r => r.json()),
      fetch('/sistema/api/cronograma?all=true').then(r => r.json())
    ]).then(([per, reg, uni, cronsRes]) => {
      setPeriodos(Array.isArray(per) ? per.filter((p: any) => p.estado !== 'CERRADO') : [])
      setRegiones(Array.isArray(reg) ? reg : [])
      setUnidades(Array.isArray(uni) ? uni : [])
      const list = Array.isArray(cronsRes?.data) ? cronsRes.data : (Array.isArray(cronsRes) ? cronsRes : [])
      setAllExistingCrons(list)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const selectedPeriodo = periodos.find(p => p.id === form.periodoId)
  const selectedRegion = regiones.find(r => r.id === form.regionId)
  const aulas = selectedRegion?.aulas || []
  const selectedAula = aulas.find((a: any) => a.id === form.aulaTerritorialId)
  
  const activeTrimestres = selectedPeriodo?.trimestres || []

  // Mapear combinaciones existentes tanto por ID de aula como por Nombre normalizado + Región
  const isComboRegistered = (trim: string, aulaId?: string) => {
    if (!form.periodoId || !trim) return false
    const targetAulaId = aulaId || form.aulaTerritorialId
    if (!targetAulaId) return false
    const aulaObj = aulas.find((a: any) => a.id === targetAulaId)
    const tClean = trim.trim().toUpperCase()

    return allExistingCrons.some(c => {
      if (c.periodoId !== form.periodoId && c.periodo?.id !== form.periodoId) return false
      const cTrim = (c.trimestre || '').trim().toUpperCase()
      if (cTrim !== tClean) return false

      if (c.aulaTerritorialId === targetAulaId || c.aulaTerritorial?.id === targetAulaId) return true

      if (aulaObj && c.aulaTerritorial) {
        const isSameName = (c.aulaTerritorial.nombre || '').trim().toUpperCase() === (aulaObj.nombre || '').trim().toUpperCase()
        const isSameReg = c.aulaTerritorial.regionId === aulaObj.regionId || c.aulaTerritorial.region?.id === aulaObj.regionId
        if (isSameName && isSameReg) return true
      }
      return false
    })
  }

  const handleMateriaChange = (id: string, num: string) => {
    const val = parseInt(num)
    if (isNaN(val) || val <= 0) {
      const copy = { ...materias }
      delete copy[id]
      setMaterias(copy)
    } else {
      setMaterias({ ...materias, [id]: val })
    }
  }

  const handleGenerate = async () => {
    if (!form.periodoId || !form.aulaTerritorialId || !form.trimestre || Object.keys(materias).length === 0) {
      setError('Por favor complete todos los campos obligatorios y asigne al menos una materia.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/sistema/api/cronograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, materias })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Error al generar cronogramas')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Generador de Cronogramas</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="spin" size={24} /></div>
        ) : (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {error && <div className="alert alert-error">{error}</div>}
            
            {/* UBICACION Y PERIODO */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>1. Periodo y Ubicación</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Periodo Académico *</label>
                  <select className="form-select" value={form.periodoId} onChange={e => {
                    setForm({ ...form, periodoId: e.target.value, trimestre: '' }) // reset trimestre on periodo change
                  }}>
                    <option value="">Seleccione...</option>
                    {periodos.map(p => <option key={p.id} value={p.id}>{p.anio}-{p.numero} ({p.modalidad})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trimestre *</label>
                  <select className="form-select" value={form.trimestre} onChange={e => setForm({ ...form, trimestre: e.target.value })} disabled={!form.periodoId}>
                    <option value="">Seleccione...</option>
                    {activeTrimestres.map((t: string) => {
                      const isDisabled = isComboRegistered(t)
                      return <option key={t} value={t} disabled={isDisabled}>{t} {isDisabled ? '(Ya registrado)' : ''}</option>
                    })}
                  </select>
                  {form.periodoId && activeTrimestres.length === 0 && <span style={{ fontSize: '11px', color: '#dc2626' }}>Este periodo no tiene trimestres configurados.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Estado (Región) *</label>
                  <select className="form-select" value={form.regionId} onChange={e => {
                    setForm({ ...form, regionId: e.target.value, aulaTerritorialId: '' })
                  }}>
                    <option value="">Seleccione...</option>
                    {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Aula Territorial *</label>
                  <select className="form-select" value={form.aulaTerritorialId} onChange={e => setForm({ ...form, aulaTerritorialId: e.target.value })} disabled={!form.regionId}>
                    <option value="">Seleccione...</option>
                    {aulas.map((a: any) => {
                      const isDisabled = form.trimestre ? isComboRegistered(form.trimestre, a.id) : false
                      return <option key={a.id} value={a.id} disabled={isDisabled}>{a.nombre} {isDisabled ? '(Ya registrado)' : ''}</option>
                    })}
                  </select>
                </div>
              </div>
              
              {selectedAula && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#4a5568', background: '#f8fafc', padding: '10px', borderRadius: '6px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div><strong>Coordinador Nacional:</strong> {selectedAula.coordinador || 'No asignado'}</div>
                  <div><strong>Coordinador Territorial:</strong> {selectedAula.enlace || 'No asignado'}</div>
                </div>
              )}
            </div>

            {/* DETALLES DE SECCION */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>2. Detalles de las Secciones a generar</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              </div>
            </div>

            {/* MATERIAS */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a6b', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>3. Asignación de Materias y Secciones</h4>
              <p style={{ fontSize: '12px', color: '#718096', marginBottom: '12px' }}>Indique cuántas secciones requiere para cada materia. El sistema generará el número máximo de secciones necesarias y asignará las materias según el número indicado.</p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {unidades.filter(u => !form.trimestre || u.trimestre === form.trimestre).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.nombre}</div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>UC: {u.creditos} | Horas: {u.horas}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#4a5568' }}>Secciones:</span>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input" 
                        style={{ width: '70px', padding: '4px 8px' }} 
                        value={materias[u.id] || ''}
                        onChange={e => handleMateriaChange(u.id, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={saving || loading}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {saving ? 'Generando...' : 'Generar Cronogramas'}
          </button>
        </div>
      </div>
    </div>
  )
}
