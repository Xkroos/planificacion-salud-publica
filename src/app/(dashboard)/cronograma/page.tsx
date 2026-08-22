'use client'

import React, { useState, useEffect } from 'react'
import { ClipboardList, Plus, Eye, Trash2, X, Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

type Cronograma = {
  id: string
  periodo: { anio: number; numero: number; modalidad: string; trimestres: string[] }
  trimestre: string
  seccion: string
  aulaTerritorial: { nombre: string; coordinador: string | null; region: { nombre: string } }
  vocero: string | null
  modalidad: string
  participantesFem: number
  participantesMasc: number
  asignaciones: { id: string; docente: any }[]
  _count: { participantes: number }
}

export default function CronogramaListPage() {
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [activePeriodo, setActivePeriodo] = useState<any>(null)
  
  const [showModal, setShowModal] = useState(false)
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [config, setConfig] = useState<any>(null)

  const fetch_ = async () => {
    const [resCr, resConf, resPer] = await Promise.all([
      fetch('/api/cronograma'),
      fetch('/api/configuracion'),
      fetch('/api/periodos')
    ])
    setCronogramas(await resCr.json())
    setConfig(await resConf.json())
    const per = await resPer.json()
    setActivePeriodo(per.find((p: any) => p.estado === 'ACTIVO') || null)
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  const handleDelete = async (id: string) => {
    await fetch(`/api/cronograma/${id}`, { method: 'DELETE' })
    await fetch_()
    setDeleteConfirm(null)
  }

  const filtered = cronogramas.filter(c =>
    `${c.periodo.anio}-${c.periodo.numero} ${c.aulaTerritorial.nombre} ${c.aulaTerritorial.region.nombre}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const groupsObj = filtered.reduce((acc, c) => {
    const key = `${c.periodo.anio}-${c.periodo.numero}-${c.trimestre}-${c.aulaTerritorial.nombre}`
    if (!acc[key]) {
      acc[key] = {
        key,
        periodo: c.periodo,
        trimestre: c.trimestre,
        aulaTerritorial: c.aulaTerritorial,
        modalidad: c.modalidad,
        cronogramas: [],
        totalDocentes: 0,
        totalFem: 0,
        totalMasc: 0,
        totalExtra: 0
      }
    }
    acc[key].cronogramas.push(c)
    acc[key].totalDocentes += c.asignaciones.filter((a: any) => a.docente).length
    acc[key].totalFem += c.participantesFem
    acc[key].totalMasc += c.participantesMasc
    acc[key].totalExtra += (c._count?.participantes || 0)
    return acc
  }, {} as Record<string, any>)

  const grouped = Object.values(groupsObj).sort((a: any, b: any) => a.key.localeCompare(b.key))

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={24} color="#2d6bc4" /> Cronogramas de Planificación
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{cronogramas.length} cronograma(s) registrado(s)</p>
        </div>
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

      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Buscar por período, sede o región..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
            : filtered.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={48} />
                <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px' }}>
                  {!activePeriodo ? 'No hay Periodo academico activo en este momento' : (search ? 'Sin resultados' : 'No hay cronogramas')}
                </p>
                {!search && activePeriodo && (isAdmin || (config && config.asignacionCargaAbierta)) && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>Generar primer cronograma</button>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Región / Sede</th>
                    <th>Coordinador</th>
                    <th>Vocero</th>
                    <th>Docentes</th>
                    <th>Participantes</th>
                    <th>Modalidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(group => {
                    const isExpanded = expandedGroups.includes(group.key)
                    const totalPart = group.totalFem + group.totalMasc + group.totalExtra
                    
                    return (
                      <React.Fragment key={group.key}>
                        {/* Group Header Row */}
                        <tr style={{ background: '#f8fafc', cursor: 'pointer', borderLeft: '4px solid #2d6bc4' }} onClick={() => toggleGroup(group.key)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isExpanded ? <ChevronDown size={16} color="#4a5568"/> : <ChevronRight size={16} color="#4a5568"/>}
                              <div>
                                <div style={{ fontWeight: 700, color: '#1a3a6b' }}>{group.periodo.anio}-{group.periodo.numero}</div>
                                <div style={{ fontSize: '12px', color: '#718096' }}>{group.trimestre === 'Introductorio' ? group.trimestre : `${group.trimestre}° Trim.`} — {group.cronogramas.length} secc.</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{group.aulaTerritorial.nombre}</div>
                            <div style={{ fontSize: '12px', color: '#718096' }}>{group.aulaTerritorial.region.nombre}</div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{group.aulaTerritorial.coordinador || '—'}</td>
                          <td style={{ fontSize: '13px', color: '#718096' }}>Varios</td>
                          <td><span className="badge badge-blue">{group.totalDocentes}</span></td>
                          <td>
                            <div style={{ fontSize: '12px', display: 'flex', gap: '8px' }}>
                              <span style={{ color: '#d53f8c' }}>♀ {group.totalFem}</span>
                              <span style={{ color: '#3182ce' }}>♂ {group.totalMasc}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#718096' }}>Total: {totalPart}</div>
                          </td>
                          <td><span className="badge badge-orange">{group.modalidad || 'PRESENCIAL'}</span></td>
                          <td></td>
                        </tr>
                        
                        {/* Expanded Rows */}
                        {isExpanded && group.cronogramas.sort((a: Cronograma, b: Cronograma) => a.seccion.localeCompare(b.seccion)).map((c: Cronograma) => (
                          <tr key={c.id} style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ paddingLeft: '40px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568' }}>Sección {c.seccion}</div>
                            </td>
                            <td></td>
                            <td></td>
                            <td style={{ fontSize: '13px' }}>{c.vocero || '—'}</td>
                            <td><span className="badge" style={{ background: '#e2e8f0', color: '#4a5568' }}>{c.asignaciones.filter((a: any) => a.docente).length} doc.</span></td>
                            <td>
                              <div style={{ fontSize: '12px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#d53f8c' }}>♀ {c.participantesFem}</span>
                                <span style={{ color: '#3182ce' }}>♂ {c.participantesMasc}</span>
                              </div>
                            </td>
                            <td></td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Link href={`/cronograma/${c.id}`} className="btn-icon" onClick={(e) => e.stopPropagation()}>
                                  <Eye size={16} />
                                </Link>
                                {isAdmin && (
                                  <button className="btn-icon" style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id) }}>
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {showModal && <CronogramaGeneratorModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetch_(); }} existingCronogramas={cronogramas} />}

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
    </div>
  )
}

function CronogramaGeneratorModal({ onClose, onSaved, existingCronogramas }: { onClose: () => void, onSaved: () => void, existingCronogramas: any[] }) {
  const [periodos, setPeriodos] = useState<any[]>([])
  const [regiones, setRegiones] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
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
      fetch('/api/periodos').then(r => r.json()),
      fetch('/api/regiones').then(r => r.json()),
      fetch('/api/unidades').then(r => r.json())
    ]).then(([per, reg, uni]) => {
      setPeriodos(per.filter((p: any) => p.estado !== 'CERRADO'))
      setRegiones(reg)
      setUnidades(uni)
      setLoading(false)
    })
  }, [])

  const selectedPeriodo = periodos.find(p => p.id === form.periodoId)
  const selectedRegion = regiones.find(r => r.id === form.regionId)
  const aulas = selectedRegion?.aulas || []
  const selectedAula = aulas.find((a: any) => a.id === form.aulaTerritorialId)
  
  const activeTrimestres = selectedPeriodo?.trimestres || []

  const existingCombos = new Set(existingCronogramas.map(c => `${c.periodo.id}-${c.trimestre}-${c.aulaTerritorial.id}`))

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
      const res = await fetch('/api/cronograma', {
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
                      const isDisabled = form.aulaTerritorialId ? existingCombos.has(`${form.periodoId}-${t}-${form.aulaTerritorialId}`) : false
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
                      const isDisabled = form.trimestre ? existingCombos.has(`${form.periodoId}-${form.trimestre}-${a.id}`) : false
                      return <option key={a.id} value={a.id} disabled={isDisabled}>{a.nombre} {isDisabled ? '(Ya registrado)' : ''}</option>
                    })}
                  </select>
                </div>
              </div>
              
              {selectedAula && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#4a5568', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <strong>Coordinador Territorial:</strong> {selectedAula.coordinador || 'No asignado'}
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
