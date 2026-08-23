'use client'

import React, { useState, useEffect } from 'react'
import { ClipboardList, Plus, Eye, Trash2, X, Search, Loader2, ChevronRight, ChevronDown, MapPin, BookOpen, Users } from 'lucide-react'
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
  const [expandedRegions, setExpandedRegions] = useState<string[]>([])
  const [expandedAulas, setExpandedAulas] = useState<string[]>([])
  const [expandedTrimestres, setExpandedTrimestres] = useState<string[]>([])
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
    `${c.periodo.anio}-${c.periodo.numero} ${c.aulaTerritorial.nombre} ${c.aulaTerritorial.region.nombre} ${c.trimestre}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // Nivel 1: Agrupar por Región
  const buildRegionGroups = () => {
    const regMap = filtered.reduce((acc, c) => {
      const rKey = c.aulaTerritorial.region.nombre
      if (!acc[rKey]) {
        acc[rKey] = { key: rKey, regionNombre: rKey, cronogramas: [] }
      }
      acc[rKey].cronogramas.push(c)
      return acc
    }, {} as Record<string, any>)
    return Object.values(regMap).sort((a: any, b: any) => a.regionNombre.localeCompare(b.regionNombre, 'es'))
  }

  // Nivel 2: Dentro de una región, agrupar por Aula Territorial
  const getAulaGroups = (cronogramasRegion: Cronograma[]) => {
    const aulaMap = cronogramasRegion.reduce((acc, c) => {
      const aKey = c.aulaTerritorial.nombre
      if (!acc[aKey]) {
        acc[aKey] = { key: aKey, aulaNombre: c.aulaTerritorial.nombre, coordinador: c.aulaTerritorial.coordinador, cronogramas: [] }
      }
      acc[aKey].cronogramas.push(c)
      return acc
    }, {} as Record<string, any>)
    return Object.values(aulaMap).sort((a: any, b: any) => a.aulaNombre.localeCompare(b.aulaNombre, 'es'))
  }

  // Nivel 3: Dentro de un aula, agrupar por Trimestre
  const getTrimestreGroups = (cronogramasAula: Cronograma[]) => {
    const groups = cronogramasAula.reduce((acc, c) => {
      const triKey = `${c.periodo.anio}-${c.periodo.numero}__${c.trimestre}`
      if (!acc[triKey]) {
        acc[triKey] = { key: triKey, periodo: c.periodo, trimestre: c.trimestre, modalidad: c.modalidad, cronogramas: [] }
      }
      acc[triKey].cronogramas.push(c)
      return acc
    }, {} as Record<string, any>)
    return Object.values(groups).sort((a: any, b: any) => {
      const orderA = a.trimestre === 'Introductorio' ? '0' : a.trimestre
      const orderB = b.trimestre === 'Introductorio' ? '0' : b.trimestre
      const periodoCompare = `${a.periodo.anio}-${a.periodo.numero}`.localeCompare(`${b.periodo.anio}-${b.periodo.numero}`)
      if (periodoCompare !== 0) return periodoCompare
      return orderA.localeCompare(orderB, 'es', { numeric: true })
    })
  }

  // Calcular totales
  const getTotals = (items: Cronograma[]) => {
    let totalDocentes = 0, totalFem = 0, totalMasc = 0, totalExtra = 0
    items.forEach(c => {
      totalDocentes += c.asignaciones.filter((a: any) => a.docente).length
      totalFem += c.participantesFem
      totalMasc += c.participantesMasc
      totalExtra += (c._count?.participantes || 0)
    })
    return { totalDocentes, totalFem, totalMasc, totalPart: totalFem + totalMasc + totalExtra }
  }

  const regionGroups = buildRegionGroups()

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
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Buscar por período, sede, región o trimestre..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
          : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <ClipboardList size={48} />
                <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px' }}>
                  {!activePeriodo ? 'No hay Periodo academico activo en este momento' : (search ? 'Sin resultados' : 'No hay cronogramas')}
                </p>
                {!search && activePeriodo && (isAdmin || (config && config.asignacionCargaAbierta)) && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>Generar primer cronograma</button>
                )}
              </div>
            </div>
          ) : regionGroups.map((region: any) => {
            const isRegionExpanded = expandedRegions.includes(region.key)
            const regionTotals = getTotals(region.cronogramas)
            const aulaGroups = getAulaGroups(region.cronogramas)

            return (
              <div key={region.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* ═══════ NIVEL 1: REGIÓN ═══════ */}
                <div
                  onClick={() => toggle(region.key, setExpandedRegions)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', cursor: 'pointer',
                    background: isRegionExpanded ? '#f0f5ff' : '#fff',
                    borderLeft: '4px solid #2d6bc4',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #2d6bc4, #1a3a6b)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MapPin size={20} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a3a6b' }}>
                        {region.regionNombre.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                        {aulaGroups.length} aula(s) territorial(es) · {region.cronogramas.length} sección(es) total(es)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#2d6bc4' }}>{regionTotals.totalDocentes}</div>
                      <div style={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Docentes</div>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#d53f8c', fontWeight: 600 }}>♀ {regionTotals.totalFem}</span>
                        <span style={{ color: '#3182ce', fontWeight: 600 }}>♂ {regionTotals.totalMasc}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Participantes ({regionTotals.totalPart})</div>
                    </div>
                    <div style={{
                      transform: isRegionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease', color: '#4a5568'
                    }}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* ═══════ NIVEL 2: AULAS TERRITORIALES ═══════ */}
                {isRegionExpanded && (
                  <div style={{ borderTop: '1px solid #e2e8f0', animation: 'slideDown 0.25s ease-out' }}>
                    {aulaGroups.map((aula: any) => {
                      const aulaFullKey = `${region.key}__${aula.key}`
                      const isAulaExpanded = expandedAulas.includes(aulaFullKey)
                      const aulaTotals = getTotals(aula.cronogramas)
                      const trimestreGroups = getTrimestreGroups(aula.cronogramas)

                      return (
                        <div key={aulaFullKey}>
                          <div
                            onClick={() => toggle(aulaFullKey, setExpandedAulas)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 20px 12px 32px', cursor: 'pointer',
                              background: isAulaExpanded ? '#f7f9fe' : '#f8fafc',
                              borderBottom: '1px solid #edf2f7',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '34px', height: '34px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Users size={16} color="white" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748' }}>
                                  {aula.aulaNombre.toUpperCase()}
                                </div>
                                <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '1px' }}>
                                  {aula.coordinador || 'Sin coordinador'} · {trimestreGroups.length} contenido(s) académico(s) · {aula.cronogramas.length} sección(es)
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span className="badge badge-blue" style={{ fontSize: '11px' }}>{aulaTotals.totalDocentes} doc.</span>
                              <div style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                                <span style={{ color: '#d53f8c' }}>♀ {aulaTotals.totalFem}</span>
                                <span style={{ color: '#3182ce' }}>♂ {aulaTotals.totalMasc}</span>
                              </div>
                              <div style={{
                                transform: isAulaExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease', color: '#a0aec0'
                              }}>
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          </div>

                          {/* ═══════ NIVEL 3: TRIMESTRES ═══════ */}
                          {isAulaExpanded && (
                            <div style={{ animation: 'slideDown 0.2s ease-out' }}>
                              {trimestreGroups.map((tri: any) => {
                                const triFullKey = `${aulaFullKey}__${tri.key}`
                                const isTriExpanded = expandedTrimestres.includes(triFullKey)
                                const triDocentes = tri.cronogramas.reduce((sum: number, c: Cronograma) => sum + c.asignaciones.filter((a: any) => a.docente).length, 0)
                                const triFem = tri.cronogramas.reduce((sum: number, c: Cronograma) => sum + c.participantesFem, 0)
                                const triMasc = tri.cronogramas.reduce((sum: number, c: Cronograma) => sum + c.participantesMasc, 0)
                                const sortedSecciones = [...tri.cronogramas].sort((a: Cronograma, b: Cronograma) => a.seccion.localeCompare(b.seccion, 'es', { numeric: true }))

                                return (
                                  <div key={triFullKey}>
                                    <div
                                      onClick={() => toggle(triFullKey, setExpandedTrimestres)}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 20px 10px 56px', cursor: 'pointer',
                                        background: isTriExpanded ? '#fafbfe' : '#fdfdfe',
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'background 0.15s ease',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '28px', height: '28px', borderRadius: '6px',
                                          background: tri.trimestre === 'Introductorio' ? 'linear-gradient(135deg, #ed8936, #dd6b20)' : 'linear-gradient(135deg, #38a169, #276749)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          flexShrink: 0
                                        }}>
                                          <BookOpen size={14} color="white" />
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748' }}>
                                            {tri.trimestre === 'Introductorio' ? 'Curso Introductorio' : `${tri.trimestre}° Trimestre`}
                                          </div>
                                          <div style={{ fontSize: '10px', color: '#a0aec0' }}>
                                            {tri.periodo.anio}-{tri.periodo.numero} · {tri.cronogramas.length} sección(es) · {tri.modalidad || 'PRESENCIAL'}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>{triDocentes} doc.</span>
                                        <div style={{ fontSize: '11px', display: 'flex', gap: '5px' }}>
                                          <span style={{ color: '#d53f8c' }}>♀ {triFem}</span>
                                          <span style={{ color: '#3182ce' }}>♂ {triMasc}</span>
                                        </div>
                                        <span className="badge badge-orange" style={{ fontSize: '9px', padding: '2px 6px' }}>{tri.modalidad || 'PRESENCIAL'}</span>
                                        <div style={{
                                          transform: isTriExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                          transition: 'transform 0.2s ease', color: '#cbd5e0'
                                        }}>
                                          <ChevronRight size={14} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* ═══════ NIVEL 4: SECCIONES ═══════ */}
                                    {isTriExpanded && (
                                      <div style={{ animation: 'slideDown 0.15s ease-out' }}>
                                        {sortedSecciones.map((c: Cronograma) => (
                                          <div
                                            key={c.id}
                                            style={{
                                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                              padding: '8px 20px 8px 86px',
                                              borderBottom: '1px solid #f7fafc',
                                              background: '#fff',
                                              transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <div style={{
                                                width: '24px', height: '24px', borderRadius: '5px',
                                                background: '#edf2f7',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '10px', fontWeight: 700, color: '#4a5568'
                                              }}>
                                                {c.seccion}
                                              </div>
                                              <div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2d3748' }}>
                                                  Sección {c.seccion}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#a0aec0' }}>
                                                  Vocero: {c.vocero || '—'}
                                                </div>
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                              <span className="badge" style={{ background: '#e2e8f0', color: '#4a5568', fontSize: '10px', padding: '2px 6px' }}>
                                                {c.asignaciones.filter((a: any) => a.docente).length} doc.
                                              </span>
                                              <div style={{ fontSize: '11px', display: 'flex', gap: '5px' }}>
                                                <span style={{ color: '#d53f8c' }}>♀ {c.participantesFem}</span>
                                                <span style={{ color: '#3182ce' }}>♂ {c.participantesMasc}</span>
                                              </div>
                                              <div style={{ display: 'flex', gap: '4px' }}>
                                                <Link href={`/cronograma/${c.id}`} className="btn-icon" style={{ padding: '5px' }} onClick={(e) => e.stopPropagation()}>
                                                  <Eye size={14} />
                                                </Link>
                                                {isAdmin && (
                                                  <button className="btn-icon" style={{ color: '#dc2626', padding: '5px' }} onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id) }}>
                                                    <Trash2 size={14} />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        }
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

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 2000px; }
        }
      `}</style>
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
