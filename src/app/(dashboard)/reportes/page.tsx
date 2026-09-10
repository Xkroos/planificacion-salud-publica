'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Search, ChevronRight, ChevronDown, Users, Building, MapPin, Loader2, BookOpen } from 'lucide-react'
import { generateCronogramaPDF } from '@/lib/pdfCronograma'

type CronogramaResumen = {
  id: string
  seccion: string
  periodo: { id: string; anio: number; numero: number; modalidad: string }
  trimestre: string
  aulaTerritorial: { id: string; nombre: string; coordinador: string | null; enlace: string | null; costo: number; region: { id: string; nombre: string } }
  vocero: string | null; telefonoVocero: string | null; emailVocero: string | null
  participantesFem: number; participantesMasc: number
  asignaciones: {
    id: string
    docente: { id: string; nombre: string; categoria: string; dedicacion: string; cedula: string; contacto?: string }
    unidad: { nombre: string }
    lugar: string | null; horaInicio: string; horaFin: string
    modalidad: string; uc: number; cantHoras: number
    fechas: { fecha: string; modalidad: string }[]
  }[]
}

export default function ReportesPage() {
  const [cronogramas, setCronogramas] = useState<CronogramaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Acordeones
  const [expandedRegiones, setExpandedRegiones] = useState<Record<string, boolean>>({})
  const [expandedAulas, setExpandedAulas] = useState<Record<string, boolean>>({})
  const [expandedTrimestres, setExpandedTrimestres] = useState<Record<string, boolean>>({})

  // Filtros Docentes
  const [profRegion, setProfRegion] = useState('')
  const [profAula, setProfAula] = useState('')
  const [profTrimestre, setProfTrimestre] = useState('')
  const [profSeccion, setProfSeccion] = useState('')

  useEffect(() => {
    fetch('/sistema/api/cronograma').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setCronogramas(d)
      } else {
        console.error('API Error:', d)
        setCronogramas([])
      }
      setLoading(false)
    })
  }, [])

  // Agrupar cronogramas
  const groupedData = cronogramas.reduce((acc, c) => {
    const regId = c.aulaTerritorial.region.id
    if (!acc[regId]) acc[regId] = { id: regId, nombre: c.aulaTerritorial.region.nombre, aulas: {} }
    
    const aulId = c.aulaTerritorial.id
    if (!acc[regId].aulas[aulId]) acc[regId].aulas[aulId] = { id: aulId, nombre: c.aulaTerritorial.nombre, trimestres: {} }
    
    const trim = c.trimestre
    if (!acc[regId].aulas[aulId].trimestres[trim]) acc[regId].aulas[aulId].trimestres[trim] = { nombre: trim, cronogramas: [] }
    
    acc[regId].aulas[aulId].trimestres[trim].cronogramas.push(c)
    return acc
  }, {} as any)

  const toggleRegion = (id: string) => setExpandedRegiones(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleAula = (id: string) => setExpandedAulas(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleTrimestre = (key: string) => setExpandedTrimestres(prev => ({ ...prev, [key]: prev[key] === false ? true : false }))

  // ===================== GENERADOR PDF CRONOGRAMA =====================
  const handleGenerateCronogramaPDF = async (cohortCronogramas: CronogramaResumen[], filename: string) => {
    if (cohortCronogramas.length === 0) return
    setGenerating(true)

    try {
      await generateCronogramaPDF(cohortCronogramas, filename)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  // ===================== LISTADO DE ESTUDIANTES =====================
  const handleGenerateEstudiantes = async (cronograma: CronogramaResumen) => {
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const res = await fetch(`/sistema/api/participantes?aulaTerritorialId=${cronograma.aulaTerritorial.id}&periodoId=${cronograma.periodo.id}`)
      const allParts = await res.json()
      
      const enrolled = allParts.filter((p: any) => p.cronogramas?.some((cp: any) => cp.cronogramaId === cronograma.id))

      const doc = new jsPDF()
      doc.setFont('times', 'bold')
      doc.setFontSize(14)
      doc.text(`Listado de Estudiantes`, 14, 15)
      
      doc.setFontSize(10)
      doc.setFont('times', 'normal')
      doc.text(`Estado: ${cronograma.aulaTerritorial.region.nombre}`, 14, 22)
      doc.text(`Aula Territorial: ${cronograma.aulaTerritorial.nombre}`, 14, 27)
      doc.text(`Sección: ${cronograma.seccion} (${cronograma.trimestre === 'Introductorio' ? cronograma.trimestre : cronograma.trimestre + '° Trim.'})`, 14, 32)

      autoTable(doc, {
        startY: 38,
        styles: { font: 'times', fontSize: 9 },
        headStyles: { fillColor: [156, 194, 229], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['N°', 'Cédula', 'Apellidos y Nombres', 'Teléfono', 'Correo']],
        body: enrolled.map((p: any, i: number) => [
          i + 1,
          p.cedula || 'N/A',
          `${p.apellido || ''}, ${p.nombre}`,
          p.telefono || 'N/A',
          p.email || 'N/A'
        ])
      })
      doc.save(`Listado_Estudiantes_Secc_${cronograma.seccion}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  // ===================== LISTADO DE PROFESORES =====================
  const handleGenerateProfesores = async () => {
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      let filteredCrons = cronogramas
      if (profRegion) filteredCrons = filteredCrons.filter(c => c.aulaTerritorial.region.id === profRegion)
      if (profAula) filteredCrons = filteredCrons.filter(c => c.aulaTerritorial.id === profAula)
      if (profTrimestre) filteredCrons = filteredCrons.filter(c => c.trimestre === profTrimestre)
      if (profSeccion) filteredCrons = filteredCrons.filter(c => c.id === profSeccion)

      const teacherMap = new Map()
      filteredCrons.forEach(c => {
        c.asignaciones.forEach(a => {
          if (!a.docente) return
          const id = a.docente.id
          if (!teacherMap.has(id)) {
             teacherMap.set(id, {
               cedula: a.docente.cedula,
               nombre: a.docente.nombre,
               telefono: a.docente.contacto || 'N/A',
               dedicacion: a.docente.dedicacion,
               horas: 0,
               asignaturas: new Set()
             })
          }
          const t = teacherMap.get(id)
          t.horas += a.cantHoras
          t.asignaturas.add(`${a.unidad.nombre} (Secc. ${c.seccion})`)
        })
      })

      const teachers = Array.from(teacherMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFont('times', 'bold')
      doc.setFontSize(14)
      doc.text('Listado General de Profesores', 14, 15)

      let subtitle = 'Filtro: Todos los profesores'
      if (profRegion) subtitle = `Estado: ${groupedData[profRegion]?.nombre}`
      if (profAula) subtitle += ` | Aula: ${groupedData[profRegion]?.aulas[profAula]?.nombre}`
      if (profTrimestre) subtitle += ` | Trimestre: ${profTrimestre}`
      if (profSeccion) subtitle += ` | Sección: ${cronogramas.find(c => c.id === profSeccion)?.seccion}`
      
      doc.setFontSize(10)
      doc.setFont('times', 'normal')
      doc.text(subtitle, 14, 22)

      autoTable(doc, {
        startY: 28,
        styles: { font: 'times', fontSize: 9 },
        headStyles: { fillColor: [156, 194, 229], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Cédula', 'Nombres y Apellidos', 'Teléfono', 'Dedicación', 'Horas Totales', 'Asignaturas que dicta']],
        body: teachers.map(t => [
          t.cedula,
          t.nombre,
          t.telefono,
          t.dedicacion,
          t.horas.toString(),
          Array.from(t.asignaturas).join('\n')
        ])
      })
      doc.save(`Listado_Profesores.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const getAllFromAula = (aula: any) => {
    return Object.values(aula.trimestres).flatMap((t: any) => t.cronogramas)
  }

  const getAllFromRegion = (region: any) => {
    return Object.values(region.aulas).flatMap((a: any) => getAllFromAula(a))
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} color="#2d6bc4" /> Centro de Reportes
        </h1>
        <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>Genera cronogramas y listados PDF para tu gestión académica</p>
      </div>

      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
          <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando datos...
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          {/* TARJETA DE DOCENTES */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Listado de Profesores</h2></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select className="form-select" style={{ flex: 1, minWidth: '150px' }} value={profRegion} onChange={e => { setProfRegion(e.target.value); setProfAula(''); setProfTrimestre(''); setProfSeccion('') }}>
                  <option value="">Todos los Estados (Global)</option>
                  {Object.values(groupedData).map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <select className="form-select" style={{ flex: 1, minWidth: '150px' }} value={profAula} onChange={e => { setProfAula(e.target.value); setProfTrimestre(''); setProfSeccion('') }} disabled={!profRegion}>
                  <option value="">Todas las Aulas del Estado</option>
                  {profRegion && groupedData[profRegion] && Object.values(groupedData[profRegion].aulas).map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                <select className="form-select" style={{ flex: 1, minWidth: '150px' }} value={profTrimestre} onChange={e => { setProfTrimestre(e.target.value); setProfSeccion('') }} disabled={!profAula}>
                  <option value="">Todos los Trimestres</option>
                  {profAula && profRegion && Object.keys(groupedData[profRegion]?.aulas[profAula]?.trimestres || {}).map((t: string) => <option key={t} value={t}>{t === 'Introductorio' ? t : `${t}° Trimestre`}</option>)}
                </select>
                <select className="form-select" style={{ flex: 1, minWidth: '150px' }} value={profSeccion} onChange={e => setProfSeccion(e.target.value)} disabled={!profTrimestre && !profAula}>
                  <option value="">Todas las Secciones</option>
                  {profAula && profRegion && (profTrimestre 
                    ? groupedData[profRegion]?.aulas[profAula]?.trimestres[profTrimestre]?.cronogramas 
                    : getAllFromAula(groupedData[profRegion]?.aulas[profAula])
                  )?.map((c: any) => <option key={c.id} value={c.id}>Sección {c.seccion} {profTrimestre ? '' : `(${c.trimestre})`}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleGenerateProfesores} disabled={generating}>
                  {generating ? <Loader2 size={16} className="spin" /> : <Download size={16}/>} Descargar Reporte
                </button>
              </div>
            </div>
          </div>

          {/* ACORDEON PRINCIPAL: CRONOGRAMAS Y ESTUDIANTES */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">Reportes por Aula Territorial y Sección (Cronogramas y Estudiantes)</h2></div>
            <div className="card-body" style={{ padding: '0' }}>
              {Object.keys(groupedData).length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#718096' }}>No hay datos disponibles</div>
              ) : (
                Object.values(groupedData).map((region: any) => (
                  <div key={region.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* CABECERA REGIÓN */}
                    <div 
                      style={{ background: '#f8fafc', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => toggleRegion(region.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1a3a6b' }}>
                        {expandedRegiones[region.id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                        <MapPin size={18} color="#2d6bc4"/> {region.nombre}
                      </div>
                      <button 
                        className="btn btn-sm btn-primary" 
                        disabled={generating}
                        onClick={(e) => { e.stopPropagation(); handleGenerateCronogramaPDF(getAllFromRegion(region), `Reporte_Estado_${region.nombre}`) }}
                      >
                        <Download size={14}/> Descargar Reporte por Estado
                      </button>
                    </div>

                    {/* CONTENIDO REGIÓN (AULAS) */}
                    {expandedRegiones[region.id] && (
                      <div style={{ padding: '0', background: 'white' }}>
                        {Object.values(region.aulas).map((aula: any) => (
                          <div key={aula.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {/* CABECERA AULA */}
                            <div 
                              style={{ padding: '10px 16px 10px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderTop: '1px solid #e2e8f0' }}
                              onClick={() => toggleAula(aula.id)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#4a5568' }}>
                                {expandedAulas[aula.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                <Building size={16}/> {aula.nombre}
                              </div>
                              <button 
                                className="btn btn-sm btn-secondary" 
                                disabled={generating}
                                onClick={(e) => { e.stopPropagation(); handleGenerateCronogramaPDF(getAllFromAula(aula), `Reporte_Aula_${aula.nombre}`) }}
                              >
                                <Download size={14}/> Reporte Global Aula Territorial
                              </button>
                            </div>

                            {/* CONTENIDO AULA (TRIMESTRES) */}
                            {expandedAulas[aula.id] && (
                              <div style={{ padding: '12px 16px 12px 64px', background: '#fcfcfc', borderTop: '1px solid #f1f5f9' }}>
                                {Object.values(aula.trimestres).map((trimestreData: any) => {
                                  const trimKey = `${aula.id}-${trimestreData.nombre}`
                                  const isExpanded = expandedTrimestres[trimKey] !== false
                                  
                                  return (
                                  <div key={trimestreData.nombre} style={{ marginBottom: '16px' }}>
                                    <div 
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}
                                      onClick={() => toggleTrimestre(trimKey)}
                                    >
                                      {isExpanded ? <ChevronDown size={16} color="#4a5568"/> : <ChevronRight size={16} color="#4a5568"/>}
                                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                        {trimestreData.nombre === 'Introductorio' ? 'Introductorio' : `${trimestreData.nombre}° Trimestre`}
                                      </h4>
                                    </div>
                                    {isExpanded && (
                                      <div style={{ display: 'grid', gap: '8px', paddingLeft: '24px' }}>
                                        {trimestreData.cronogramas.map((c: any) => (
                                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                            <div>
                                              <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <BookOpen size={14} color="#3b82f6"/> Sección {c.seccion}
                                              </div>
                                              <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{c.periodo.anio}-{c.periodo.numero}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                              <button className="btn btn-sm" style={{ background: '#e2e8f0', color: '#1a3a6b' }} onClick={() => handleGenerateEstudiantes(c)} disabled={generating}>
                                                <Users size={14}/> Listado Estudiantes
                                              </button>
                                              <button className="btn btn-sm btn-primary" onClick={() => handleGenerateCronogramaPDF([c], `Cronograma_Secc_${c.seccion}`)} disabled={generating}>
                                                <FileText size={14}/> Cronograma
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )})}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
