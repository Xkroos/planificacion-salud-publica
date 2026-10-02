'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderArchive, ArrowLeft, Loader2, BookOpen, Users, FileText,
  ChevronRight, ChevronDown, MapPin, Building, DollarSign, Search,
  Phone, Mail, GraduationCap, X, ChevronLeft, User, Calendar,
  ArrowUpCircle, Clock
} from 'lucide-react'
import { generateCronogramaPDF } from '@/lib/pdfCronograma'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { PlantillaCostosPDF } from '@/components/PlantillaCostosPDF'
import { determinarTipoViatico } from '@/lib/viaticos'
import toast from 'react-hot-toast'

type Periodo = {
  id: string
  anio: number
  numero: number
  modalidad: string
  estado: string
}

export default function ExpedientesPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<Periodo | null>(null)

  const fetchPeriodos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/sistema/api/periodos')
      const data = await res.json()
      // Filtrar solo los cerrados
      setPeriodos(data.filter((p: Periodo) => p.estado === 'CERRADO'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPeriodos() }, [fetchPeriodos])

  return (
    <div className="fade-in">
      {!selectedPeriod ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FolderArchive size={24} color="#d97706" /> Expedientes Históricos
            </h1>
            <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
              Accede a la información de los periodos académicos ya finalizados.
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
              <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              Cargando expedientes...
            </div>
          ) : periodos.length === 0 ? (
            <div className="empty-state card" style={{ padding: '60px 20px' }}>
              <FolderArchive size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
              <p style={{ marginTop: '12px', fontWeight: 600 }}>No hay expedientes históricos</p>
              <p style={{ fontSize: '13px', color: '#718096' }}>Los periodos finalizados aparecerán aquí.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {periodos.map(p => (
                <div key={p.id} className="card" style={{ padding: '20px', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'all 0.2s' }} 
                     onClick={() => setSelectedPeriod(p)}
                     onMouseOver={(e) => (e.currentTarget.style.borderColor = '#d97706')}
                     onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px', color: '#d97706' }}>
                      <FolderArchive size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c' }}>Periodo {p.anio}-{p.numero}</h3>
                      <p style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{p.modalidad}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <ExpedienteDetalle periodo={selectedPeriod} onBack={() => setSelectedPeriod(null)} />
      )}
    </div>
  )
}

function ExpedienteDetalle({ periodo, onBack }: { periodo: Periodo; onBack: () => void }) {
  const [tab, setTab] = useState<'cronogramas' | 'participantes'>('cronogramas')
  const [cronogramas, setCronogramas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Acordeones secciones
  const [expandedRegiones, setExpandedRegiones] = useState<Record<string, boolean>>({})
  const [expandedAulas, setExpandedAulas] = useState<Record<string, boolean>>({})
  const [expandedTrimestres, setExpandedTrimestres] = useState<Record<string, boolean>>({})

  const toggleRegion = (id: string) => setExpandedRegiones(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleAula = (id: string) => setExpandedAulas(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleTrimestre = (key: string) => setExpandedTrimestres(prev => ({ ...prev, [key]: !prev[key] }))

  // Participantes — paginación y búsqueda server-side
  const [participantes, setParticipantes] = useState<any[]>([])
  const [loadingPart, setLoadingPart] = useState(false)
  const [searchPart, setSearchPart] = useState('')
  const [pagePart, setPagePart] = useState(1)
  const [totalPartPages, setTotalPartPages] = useState(1)
  const [totalPart, setTotalPart] = useState(0)
  const LIMIT = 20

  // Trayectoria modal
  const [trayectoParticipante, setTrayectoParticipante] = useState<any | null>(null)
  const [loadingTrayecto, setLoadingTrayecto] = useState(false)

  const trimColors: Record<string, { bg: string; color: string; border: string }> = {
    'Introductorio': { bg: '#f0f9ff', color: '#0369a1', border: '#7dd3fc' },
    'I':  { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    'II': { bg: '#fefce8', color: '#a16207', border: '#fde047' },
    'III':{ bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
    'IV': { bg: '#fdf4ff', color: '#9333ea', border: '#d8b4fe' },
    'V':  { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    'Comisión Técnica': { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
    'Finalizado': { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  }

  function formatTrimestre(t: string | null | undefined) {
    if (!t) return 'Sin nivel'
    if (t === 'Introductorio') return 'Introductorio'
    if (t === 'Comisión Técnica') return 'Comisión Técnica'
    if (t === 'Finalizado') return 'Finalizado'
    return `${t}° Trimestre`
  }

  // Agrupar cronogramas por región, aula y trimestre
  const groupedData = cronogramas.reduce((acc, c) => {
    const reg = c.aulaTerritorial?.region
    const aula = c.aulaTerritorial
    const trim = c.trimestre || 'Sin Trimestre'
    if (!reg || !aula) return acc

    if (!acc[reg.id]) acc[reg.id] = { id: reg.id, nombre: reg.nombre, aulas: {} }
    if (!acc[reg.id].aulas[aula.id]) acc[reg.id].aulas[aula.id] = { id: aula.id, nombre: aula.nombre, trimestres: {} }
    if (!acc[reg.id].aulas[aula.id].trimestres[trim]) acc[reg.id].aulas[aula.id].trimestres[trim] = { nombre: trim, cronogramas: [] }
    
    acc[reg.id].aulas[aula.id].trimestres[trim].cronogramas.push(c)
    return acc
  }, {} as any)


  const [resolucion, setResolucion] = useState('')
  const [refDocumento, setRefDocumento] = useState('')
  const [activeCronogramaForPDF, setActiveCronogramaForPDF] = useState<any>(null)
  const pdfRef = useRef<HTMLDivElement>(null)

  // Carga inicial: solo cronogramas y config
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [resCr, resConf, resBcv] = await Promise.all([
          fetch(`/sistema/api/cronograma?periodoId=${periodo.id}`),
          fetch('/sistema/api/configuracion'),
          fetch('https://ve.dolarapi.com/v1/dolares/oficial').catch(() => null)
        ])
        const crData = await resCr.json()
        setCronogramas(Array.isArray(crData) ? crData : (Array.isArray(crData?.data) ? crData.data : []))
        const conf = await resConf.json()
        if (conf.resolucion) setResolucion(conf.resolucion)
        if (resBcv && resBcv.ok) {
          const bcvData = await resBcv.json()
          if (bcvData.promedio) setRefDocumento(bcvData.promedio.toFixed(2).replace('.', ','))
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    loadData()
  }, [periodo.id])

  // Carga paginada de participantes (cuando se cambia a esa tab o cambia búsqueda/página)
  const fetchParticipantes = useCallback(async () => {
    setLoadingPart(true)
    try {
      const params = new URLSearchParams({
        periodoId: periodo.id,
        page: pagePart.toString(),
        limit: LIMIT.toString(),
      })
      if (searchPart) params.set('nombre', searchPart)
      const res = await fetch(`/sistema/api/participantes?${params}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      setParticipantes(arr)
      setTotalPartPages(data.totalPages || 1)
      setTotalPart(data.total || arr.length)
    } catch (e) { console.error(e) }
    finally { setLoadingPart(false) }
  }, [periodo.id, pagePart, searchPart])

  useEffect(() => {
    if (tab === 'participantes') fetchParticipantes()
  }, [tab, fetchParticipantes])

  // Reset página al buscar
  useEffect(() => { setPagePart(1) }, [searchPart])

  // Abrir trayectoria con todos los datos del participante
  const openTrayecto = async (p: any) => {
    setTrayectoParticipante(p)
    setLoadingTrayecto(true)
    try {
      const res = await fetch(`/sistema/api/participantes/${p.id}`)
      const data = await res.json()
      setTrayectoParticipante(data)
    } catch { /* mantener datos básicos */ }
    finally { setLoadingTrayecto(false) }
  }

  const handleGenPDF = async (cronograma: any) => {
    setGenerating(true)
    try {
      await generateCronogramaPDF([cronograma], `Expediente_Cronograma_${cronograma.seccion}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenCostosPDF = async (cronograma: any) => {
    if (!resolucion) {
      toast.error('No se ha configurado la resolución en el sistema.')
      return
    }
    
    setActiveCronogramaForPDF(cronograma)
    setGenerating(true)
    
    // Allow React to render the hidden component before capturing
    setTimeout(async () => {
      try {
        if (!pdfRef.current) return
        const canvas = await html2canvas(pdfRef.current, { scale: 2 })
        const imgData = canvas.toDataURL('image/png')
        
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        })
        
        doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
        doc.save(`Estructura_Costos_${cronograma.seccion}.pdf`)
        toast.success('PDF generado exitosamente')
      } catch (err) {
        console.error('Error generando PDF:', err)
        toast.error('Hubo un error al generar el PDF')
      } finally {
        setGenerating(false)
        setActiveCronogramaForPDF(null)
      }
    }, 200)
  }

  // Prepara las asignaciones del cronograma activo para el componente PlantillaCostosPDF
  const activeAsignaciones = activeCronogramaForPDF ? activeCronogramaForPDF.asignaciones.map((a: any) => {
    const tipoViatico = determinarTipoViatico(a.docente?.region?.nombre, activeCronogramaForPDF.aulaTerritorial?.region?.nombre)
    let defaultViatico = 0
    if (tipoViatico === 'SEDE') defaultViatico = activeCronogramaForPDF.aulaTerritorial?.viatico || 0
    if (tipoViatico === 'ZONA') defaultViatico = activeCronogramaForPDF.aulaTerritorial?.viaticoZona || 0

    const viaticoFinal = tipoViatico === 'NO_APLICA' ? 0 : (a.viatico || defaultViatico || 0)

    return {
      id: a.id,
      hp: parseFloat(a.hp || activeCronogramaForPDF.periodo?.tabulador || 50),
      viatico: viaticoFinal
    }
  }) : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn-icon" onClick={onBack} style={{ background: 'white', border: '1px solid #e2e8f0', width: '40px', height: '40px', borderRadius: '8px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a3a6b', margin: 0 }}>
            Expediente: Periodo {periodo.anio}-{periodo.numero}
          </h2>
          <span style={{ fontSize: '12px', color: '#718096', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {periodo.modalidad}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <button 
          className={`btn ${tab === 'cronogramas' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setTab('cronogramas')}
        >
          <BookOpen size={16} /> Secciones ({cronogramas.length})
        </button>
        <button 
          className={`btn ${tab === 'participantes' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setTab('participantes')}
        >
          <Users size={16} /> Estudiantes ({totalPart > 0 ? totalPart : '…'})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
          <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando datos del expediente...
        </div>
      ) : (
        <>
          {tab === 'cronogramas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cronogramas.length === 0 ? (
                <div className="alert">No hay secciones en este periodo.</div>
              ) : Object.values(groupedData).map((region: any) => (
                <div key={region.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                  {/* Cabecera Región */}
                  <div 
                    onClick={() => toggleRegion(region.id)}
                    style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: expandedRegiones[region.id] ? '#f8fafc' : 'white', cursor: 'pointer', borderBottom: expandedRegiones[region.id] ? '1px solid #e2e8f0' : 'none', transition: 'background 0.2s' }}
                  >
                    {expandedRegiones[region.id] ? <ChevronDown size={20} color="#718096" /> : <ChevronRight size={20} color="#718096" />}
                    <MapPin size={20} color="#2d6bc4" />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a3a6b', margin: 0 }}>
                      Región {region.nombre}
                    </h3>
                  </div>

                  {/* Aulas */}
                  {expandedRegiones[region.id] && (
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.values(region.aulas).map((aula: any) => (
                        <div key={aula.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          {/* Cabecera Aula */}
                          <div 
                            onClick={() => toggleAula(aula.id)}
                            style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', cursor: 'pointer', borderBottom: expandedAulas[aula.id] ? '1px solid #e2e8f0' : 'none' }}
                          >
                            {expandedAulas[aula.id] ? <ChevronDown size={18} color="#718096" /> : <ChevronRight size={18} color="#718096" />}
                            <Building size={18} color="#4a5568" />
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', margin: 0 }}>
                              {aula.nombre} <span style={{ color: '#a0aec0', fontWeight: 400, marginLeft: '8px' }}>({Object.values(aula.trimestres).reduce((acc: number, t: any) => acc + t.cronogramas.length, 0)} secciones)</span>
                            </h4>
                          </div>

                          {/* Trimestres del Aula */}
                          {expandedAulas[aula.id] && (
                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                              {Object.values(aula.trimestres).map((trimestre: any) => {
                                const trimKey = `${aula.id}-${trimestre.nombre}`
                                return (
                                  <div key={trimKey} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    {/* Cabecera Trimestre */}
                                    <div 
                                      onClick={() => toggleTrimestre(trimKey)}
                                      style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f5f9', cursor: 'pointer', borderBottom: expandedTrimestres[trimKey] ? '1px solid #e2e8f0' : 'none' }}
                                    >
                                      {expandedTrimestres[trimKey] ? <ChevronDown size={16} color="#718096" /> : <ChevronRight size={16} color="#718096" />}
                                      <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', margin: 0 }}>
                                        Trimestre {trimestre.nombre} <span style={{ color: '#a0aec0', fontWeight: 400, marginLeft: '8px' }}>({trimestre.cronogramas.length} secciones)</span>
                                      </h5>
                                    </div>

                                    {/* Secciones del Trimestre */}
                                    {expandedTrimestres[trimKey] && (
                                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'white' }}>
                                        {trimestre.cronogramas.map((c: any) => (
                                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                            <div>
                                              <h6 style={{ fontWeight: 600, color: '#1a202c', fontSize: '14px', margin: 0 }}>
                                                Sección {c.seccion}
                                              </h6>
                                              <p style={{ fontSize: '12px', color: '#718096', margin: '2px 0 0 0' }}>
                                                Modalidad: {c.modalidad}
                                              </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                              <button className="btn btn-secondary btn-sm" onClick={() => handleGenCostosPDF(c)} disabled={generating}>
                                                {generating && activeCronogramaForPDF?.id === c.id ? <Loader2 size={14} className="spin" /> : <DollarSign size={14} />} Estructura Costos
                                              </button>
                                              <button className="btn btn-primary btn-sm" onClick={() => handleGenPDF(c)} disabled={generating}>
                                                {generating && activeCronogramaForPDF?.id !== c.id ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Cronograma
                                              </button>
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
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'participantes' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Búsqueda y contador */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '36px', borderRadius: '20px' }}
                    placeholder="Buscar por nombre, apellido o cédula..."
                    value={searchPart}
                    onChange={e => setSearchPart(e.target.value)}
                  />
                </div>
                <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {totalPart} participante{totalPart !== 1 ? 's' : ''} registrado{totalPart !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Tabla */}
              {loadingPart ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
                  <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
                  Cargando participantes...
                </div>
              ) : participantes.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600 }}>{searchPart ? 'Sin resultados para la búsqueda' : 'No hay participantes en este periodo'}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, border: 'none', tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '42px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '14%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ padding: '11px 8px 11px 16px' }}>#</th>
                          <th>Cédula</th>
                          <th>Nombre y Apellido</th>
                          <th>Contacto</th>
                          <th>Aula Territorial</th>
                          <th>Género</th>
                          <th>Nivel</th>
                          <th>Inscrito en</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantes.map((p: any, i: number) => {
                          const tc = trimColors[p.trimestre || ''] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                          return (
                            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openTrayecto(p)} title="Ver trayectoria completa">
                              <td style={{ color: '#a0aec0', fontWeight: 500, padding: '11px 8px 11px 16px' }}>{(pagePart - 1) * LIMIT + i + 1}</td>
                              <td><span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#1a3a6b' }}>{p.cedula || '—'}</span></td>
                              <td><div style={{ fontWeight: 600, color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.apellido}, {p.nombre}</div></td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {p.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Phone size={11} /> {p.telefono}</div>}
                                  {p.email && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail size={11} /> {p.email}</div>}
                                  {!p.telefono && !p.email && <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>}
                                </div>
                              </td>
                              <td><span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.aulaTerritorial?.nombre || <span style={{ color: '#a0aec0' }}>—</span>}</span></td>
                              <td><span className={`badge ${p.genero === 'FEMENINO' ? 'badge-purple' : 'badge-green'}`}>{p.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}</span></td>
                              <td>
                                {p.trimestre ? (
                                  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, whiteSpace: 'nowrap' }}>
                                    {formatTrimestre(p.trimestre)}
                                  </span>
                                ) : <span style={{ color: '#a0aec0', fontSize: '12px' }}>Sin nivel</span>}
                              </td>
                              <td>
                                {p.cronogramas && p.cronogramas.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {p.cronogramas.slice(0, 2).map((rel: any, idx: number) => (
                                      <span key={idx} className="badge badge-gray" style={{ fontSize: '11px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {rel.cronograma?.aulaTerritorial?.nombre || '—'}
                                      </span>
                                    ))}
                                    {p.cronogramas.length > 2 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>+{p.cronogramas.length - 2} más</span>}
                                  </div>
                                ) : <span style={{ color: '#a0aec0', fontSize: '12px' }}>No inscrito</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {totalPartPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Mostrando {(pagePart - 1) * LIMIT + 1}–{Math.min(pagePart * LIMIT, totalPart)} de {totalPart}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" disabled={pagePart === 1} onClick={() => setPagePart(p => p - 1)}>
                          <ChevronLeft size={15} /> Anterior
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', fontWeight: 600 }}>
                          {pagePart} / {totalPartPages}
                        </div>
                        <button className="btn btn-secondary btn-sm" disabled={pagePart >= totalPartPages} onClick={() => setPagePart(p => p + 1)}>
                          Siguiente <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* PDF oculto */}
      {activeCronogramaForPDF && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PlantillaCostosPDF 
            ref={pdfRef} 
            cronograma={activeCronogramaForPDF} 
            asignaciones={activeAsignaciones} 
            refDocumento={refDocumento}
            resolucion={resolucion}
            coordinadorNacional={(activeCronogramaForPDF as any)._meta?.coordinadorNacional || ''}
          />
        </div>
      )}

      {/* ── MODAL TRAYECTORIA ── */}
      {trayectoParticipante && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTrayectoParticipante(null)}>
          <div className="modal" style={{ maxWidth: '660px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a6b' }}>
                <User size={18} color="#2d6bc4" /> Expediente del Participante
              </h3>
              <button className="btn-icon" onClick={() => setTrayectoParticipante(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              {loadingTrayecto ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
                  Cargando trayectoria...
                </div>
              ) : (
                <>
                  {/* Datos personales */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Datos Personales</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Nombre y Apellido</div>
                        <div style={{ fontWeight: 700, color: '#1a202c', fontSize: '15px' }}>{trayectoParticipante.apellido}, {trayectoParticipante.nombre}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Cédula</div>
                        <div style={{ fontWeight: 700, color: '#1a3a6b', fontFamily: 'monospace', fontSize: '15px' }}>{trayectoParticipante.cedula || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Género</div>
                        <span className={`badge ${trayectoParticipante.genero === 'FEMENINO' ? 'badge-purple' : 'badge-green'}`}>
                          {trayectoParticipante.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Nivel Actual</div>
                        {trayectoParticipante.trimestre ? (() => {
                          const tc = trimColors[trayectoParticipante.trimestre] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                          return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{formatTrimestre(trayectoParticipante.trimestre)}</span>
                        })() : <span style={{ color: '#a0aec0', fontSize: '12px' }}>Sin nivel</span>}
                      </div>
                      {trayectoParticipante.telefono && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Teléfono</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4a5568' }}><Phone size={13} /> {trayectoParticipante.telefono}</div>
                        </div>
                      )}
                      {trayectoParticipante.email && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Correo</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4a5568' }}><Mail size={13} /> {trayectoParticipante.email}</div>
                        </div>
                      )}
                      {trayectoParticipante.aulaTerritorial?.nombre && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Aula Territorial</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{trayectoParticipante.aulaTerritorial.nombre}</div>
                        </div>
                      )}
                      {trayectoParticipante.periodo && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Periodo Inscrito</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{trayectoParticipante.periodo.anio}-{trayectoParticipante.periodo.numero}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secciones */}
                  {trayectoParticipante.cronogramas && trayectoParticipante.cronogramas.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GraduationCap size={13} /> Secciones en las que participó
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {trayectoParticipante.cronogramas.map((rel: any, i: number) => {
                          const crono = rel.cronograma
                          if (!crono) return null
                          return (
                            <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '14px', marginBottom: '4px' }}>
                                {formatTrimestre(crono.trimestre)} — Sección {crono.seccion}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4a5568' }}><Calendar size={11} /> Periodo {crono.periodo?.anio}-{crono.periodo?.numero}</span>
                                {crono.aulaTerritorial?.nombre && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4a5568' }}><MapPin size={11} /> {crono.aulaTerritorial.nombre}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Historial */}
                  {trayectoParticipante.historial && trayectoParticipante.historial.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowUpCircle size={13} /> Historial de Cambios de Nivel
                      </div>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '19px', top: 0, bottom: 0, width: '2px', background: '#e2e8f0', zIndex: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {trayectoParticipante.historial.map((h: any, i: number) => {
                            const tc3 = trimColors[h.trimestreNuevo] || { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' }
                            return (
                              <div key={h.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: tc3.bg, border: `2px solid ${tc3.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: tc3.color }}>{i + 1}</div>
                                <div style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    {h.trimestreAnterior ? <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>{formatTrimestre(h.trimestreAnterior)}</span> : <span style={{ fontSize: '12px', color: '#94a3b8' }}>Inicio</span>}
                                    <ChevronRight size={12} color="#94a3b8" />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: tc3.color, background: tc3.bg, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${tc3.border}` }}>{formatTrimestre(h.trimestreNuevo)}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} />{new Date(h.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    {h.aulaTerritorial?.nombre && <span><MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />{h.aulaTerritorial.nombre}</span>}
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
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      <GraduationCap size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                      <p style={{ fontWeight: 600 }}>Sin trayectoria registrada</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTrayectoParticipante(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
