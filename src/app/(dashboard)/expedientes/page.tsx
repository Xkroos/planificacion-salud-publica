'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderArchive, ArrowLeft, Loader2, BookOpen, Users, FileText, ChevronRight, ChevronDown, MapPin, Building } from 'lucide-react'
import { generateCronogramaPDF } from '@/lib/pdfCronograma'

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
      const res = await fetch('/api/periodos')
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

function ExpedienteDetalle({ periodo, onBack }: { periodo: Periodo, onBack: () => void }) {
  const [tab, setTab] = useState<'cronogramas' | 'participantes'>('cronogramas')
  const [cronogramas, setCronogramas] = useState<any[]>([])
  const [participantes, setParticipantes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Acordeones
  const [expandedRegiones, setExpandedRegiones] = useState<Record<string, boolean>>({})
  const [expandedAulas, setExpandedAulas] = useState<Record<string, boolean>>({})
  const [expandedTrimestres, setExpandedTrimestres] = useState<Record<string, boolean>>({})

  const toggleRegion = (id: string) => setExpandedRegiones(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleAula = (id: string) => setExpandedAulas(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleTrimestre = (key: string) => setExpandedTrimestres(prev => ({ ...prev, [key]: !prev[key] }))

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


  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [resCr, resPa] = await Promise.all([
          fetch(`/api/cronograma?periodoId=${periodo.id}`),
          fetch(`/api/participantes?periodoId=${periodo.id}`)
        ])
        setCronogramas(await resCr.json())
        setParticipantes(await resPa.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [periodo.id])

  const handleGenPDF = async (cronograma: any) => {
    setGenerating(true)
    try {
      await generateCronogramaPDF([cronograma], `Expediente_Cronograma_${cronograma.seccion}`)
    } finally {
      setGenerating(false)
    }
  }

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
          <Users size={16} /> Estudiantes ({participantes.length})
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
                                            <button className="btn btn-primary btn-sm" onClick={() => handleGenPDF(c)} disabled={generating}>
                                              {generating ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Generar PDF
                                            </button>
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
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#4a5568', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Cédula</th>
                    <th style={{ padding: '12px 16px' }}>Nombres y Apellidos</th>
                    <th style={{ padding: '12px 16px' }}>Aula Territorial</th>
                    <th style={{ padding: '12px 16px' }}>Trimestre/Sección</th>
                  </tr>
                </thead>
                <tbody>
                  {participantes.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>No hay estudiantes registrados</td></tr>
                  ) : participantes.map((p: any) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a3a6b' }}>{p.cedula}</td>
                      <td style={{ padding: '12px 16px' }}>{p.nombre} {p.apellido}</td>
                      <td style={{ padding: '12px 16px' }}>{p.aulaTerritorial?.nombre || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.trimestre || '-'} / {p.seccion ? `Sec ${p.seccion}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
