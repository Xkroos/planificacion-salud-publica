'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users, Building2, Calendar, BookOpen, UserCheck,
  MapPin, Filter, Layers, BarChart as BarChartIcon, Download, Printer
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import toast from 'react-hot-toast'

type Filtros = {
  periodoId: string
  regionId: string
  aulaTerritorialId: string
}

type Periodo = { id: string, anio: number, numero: number }
type Region = { id: string, nombre: string }
type Aula = { id: string, nombre: string, regionId: string }

export default function EstadisticasPage() {
  const [cargando, setCargando] = useState(true)
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const reporteRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [regiones, setRegiones] = useState<Region[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])

  const [filtros, setFiltros] = useState<Filtros>({
    periodoId: '',
    regionId: '',
    aulaTerritorialId: ''
  })

  const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

  useEffect(() => { cargarFiltros() }, [])
  useEffect(() => { cargarEstadisticas() }, [filtros])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const cargarFiltros = async () => {
    try {
      const [resPeriodos, resRegiones, resAulas] = await Promise.all([
        fetch('/sistema/api/periodos'),
        fetch('/sistema/api/regiones'),
        fetch('/sistema/api/aulas')
      ])
      if (resPeriodos.ok) setPeriodos(await resPeriodos.json())
      if (resRegiones.ok) setRegiones(await resRegiones.json())
      if (resAulas.ok) setAulas(await resAulas.json())
    } catch {
      toast.error('Error al cargar filtros')
    }
  }

  const cargarEstadisticas = async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtros.periodoId) params.append('periodoId', filtros.periodoId)
      if (filtros.regionId) params.append('regionId', filtros.regionId)
      if (filtros.aulaTerritorialId) params.append('aulaTerritorialId', filtros.aulaTerritorialId)

      const res = await fetch(`/sistema/api/estadisticas?${params.toString()}`)
      if (res.ok) {
        setEstadisticas(await res.json())
      } else {
        toast.error('Error al cargar estadísticas')
      }
    } catch {
      toast.error('Ocurrió un error')
    } finally {
      setCargando(false)
    }
  }

  const aulasFiltradas = filtros.regionId
    ? aulas.filter(a => a.regionId === filtros.regionId)
    : aulas

  const stats = estadisticas?.totales || {
    participantes: 0, docentes: 0, cronogramas: 0, aulas: 0, regiones: 0
  }

  const graficos = estadisticas?.graficos || {
    participantesPorGenero: [],
    participantesPorTrimestre: [],
    cronogramasPorModalidad: [],
    docentesPorCategoria: [],
    docentesPorDedicacion: []
  }

  // Etiquetas legibles de los filtros activos
  const filtroTexto = () => {
    const partes: string[] = []
    if (filtros.periodoId) {
      const p = periodos.find(p => p.id === filtros.periodoId)
      if (p) partes.push(`Periodo: ${p.anio} - ${p.numero}`)
    }
    if (filtros.regionId) {
      const r = regiones.find(r => r.id === filtros.regionId)
      if (r) partes.push(`Región: ${r.nombre}`)
    }
    if (filtros.aulaTerritorialId) {
      const a = aulas.find(a => a.id === filtros.aulaTerritorialId)
      if (a) partes.push(`Aula: ${a.nombre}`)
    }
    return partes.length > 0 ? partes.join(' | ') : 'Todos los registros'
  }

  const exportarPDF = async () => {
    setGenerandoPDF(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const html2canvas = (await import('html2canvas')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      // --- Encabezado ---
      doc.setFillColor(26, 58, 107)
      doc.rect(0, 0, pageW, 32, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Salud Publica, Reporte de Estadísticas', 14, 14)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Filtros aplicados: ${filtroTexto()}`, 14, 22)
      doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, 14, 28)

      let cursorY = 42

      // --- KPIs ---
      doc.setTextColor(26, 58, 107)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')

      cursorY += 6

      const kpiData = [
        ['Participantes Registrados', stats.participantes.toString()],
        ['Cronogramas Creados', stats.cronogramas.toString()],
        ['Docentes Registrados', stats.docentes.toString()],
        ['Aulas Territoriales', stats.aulas.toString()],
      ]

      autoTable(doc, {
        startY: cursorY,
        head: [['Indicador', 'Valor']],
        body: kpiData,
        theme: 'grid',
        headStyles: { fillColor: [45, 107, 196], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        bodyStyles: { fontSize: 11, textColor: [17, 24, 39] },
        columnStyles: { 1: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] } },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        margin: { left: 14, right: 14 },
      })

      cursorY = (doc as any).lastAutoTable.finalY + 12

      // --- Participantes por Trimestre ---
      if (graficos.participantesPorTrimestre.length > 0) {
        if (cursorY > pageH - 60) { doc.addPage(); cursorY = 20 }

        doc.setTextColor(26, 58, 107)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Participantes por Trimestre', 14, cursorY)
        cursorY += 6

        autoTable(doc, {
          startY: cursorY,
          head: [['Trimestre', 'Participantes']],
          body: graficos.participantesPorTrimestre.map((d: any) => [d.name, d.value.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'center' } },
          margin: { left: 14, right: 14 },
        })
        cursorY = (doc as any).lastAutoTable.finalY + 12
      }

      // --- Participantes por Género ---
      if (graficos.participantesPorGenero.length > 0) {
        if (cursorY > pageH - 60) { doc.addPage(); cursorY = 20 }

        doc.setTextColor(26, 58, 107)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Participantes por Género', 14, cursorY)
        cursorY += 6

        autoTable(doc, {
          startY: cursorY,
          head: [['Género', 'Cantidad']],
          body: graficos.participantesPorGenero.map((d: any) => [d.name, d.value.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'center' } },
          margin: { left: 14, right: 14 },
        })
        cursorY = (doc as any).lastAutoTable.finalY + 12
      }

      // --- Docentes por Dedicación ---
      if (graficos.docentesPorDedicacion.length > 0) {
        if (cursorY > pageH - 60) { doc.addPage(); cursorY = 20 }

        doc.setTextColor(26, 58, 107)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Docentes por Dedicación', 14, cursorY)
        cursorY += 6

        autoTable(doc, {
          startY: cursorY,
          head: [['Dedicación', 'Docentes']],
          body: graficos.docentesPorDedicacion.map((d: any) => [d.name, d.value.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'center' } },
          margin: { left: 14, right: 14 },
        })
        cursorY = (doc as any).lastAutoTable.finalY + 12
      }

      // --- Docentes por Categoría ---
      if (graficos.docentesPorCategoria.length > 0) {
        if (cursorY > pageH - 60) { doc.addPage(); cursorY = 20 }

        doc.setTextColor(26, 58, 107)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('Docentes por Categoría', 14, cursorY)
        cursorY += 6

        autoTable(doc, {
          startY: cursorY,
          head: [['Categoría', 'Docentes']],
          body: graficos.docentesPorCategoria.map((d: any) => [d.name, d.value.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'center' } },
          margin: { left: 14, right: 14 },
        })
      }

      // --- Pie de página en todas las páginas ---
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(26, 58, 107)
        doc.rect(0, pageH - 10, pageW, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('UNERG — Decanato de Postgrado | Sistema de Planificación Académica', 14, pageH - 4)
        doc.text(`Página ${i} de ${totalPages}`, pageW - 30, pageH - 4)
      }

      // Nombre del archivo con fecha
      const fecha = new Date().toISOString().split('T')[0]
      doc.save(`estadisticas-unerg-${fecha}.pdf`)
      toast.success('PDF generado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  const exportarParticipantesPDF = async () => {
    setGenerandoPDF(true)
    try {
      const params = new URLSearchParams()
      if (filtros.periodoId) params.append('periodoId', filtros.periodoId)
      if (filtros.regionId) params.append('regionId', filtros.regionId)
      if (filtros.aulaTerritorialId) params.append('aulaTerritorialId', filtros.aulaTerritorialId)

      const res = await fetch(`/sistema/api/participantes?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar participantes')
      const data = await res.json()

      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      doc.setFillColor(26, 58, 107)
      doc.rect(0, 0, pageW, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Salud Publica, Listado de Participantes', 14, 14)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Filtros: ${filtroTexto()}`, 14, 22)
      doc.text(`Total: ${data.length} registrados`, 14, 28)

      const tableData = data.map((p: any) => [
        p.cedula,
        `${p.nombre} ${p.apellido || ''}`.trim(),
        p.genero,
        p.trimestre || 'N/A',
        p.telefono || 'N/A',
        p.email || 'N/A'
      ])

      autoTable(doc, {
        startY: 42,
        head: [['Cédula', 'Nombre Completo', 'Género', 'Trimestre', 'Teléfono', 'Correo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [45, 107, 196], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [17, 24, 39] },
        margin: { left: 14, right: 14, bottom: 15 }
      })

      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(26, 58, 107)
        doc.rect(0, pageH - 10, pageW, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('UNERG — Decanato de Postgrado | Sistema de Planificación Académica', 14, pageH - 4)
        doc.text(`Página ${i} de ${totalPages}`, pageW - 30, pageH - 4)
      }

      const fecha = new Date().toISOString().split('T')[0]
      doc.save(`listado-participantes-${fecha}.pdf`)
      toast.success('Listado descargado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el listado')
    } finally {
      setGenerandoPDF(false)
    }
  }

  const exportarDocentesPDF = async () => {
    setGenerandoPDF(true)
    try {
      const params = new URLSearchParams()
      if (filtros.regionId) params.append('regionId', filtros.regionId)
      if (filtros.aulaTerritorialId) params.append('aulaTerritorialId', filtros.aulaTerritorialId)

      const res = await fetch(`/sistema/api/docentes?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar docentes')
      const data = await res.json()

      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      doc.setFillColor(26, 58, 107)
      doc.rect(0, 0, pageW, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Salud Publica, Listado de Docentes', 14, 14)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Filtros: ${filtroTexto()}`, 14, 22)
      doc.text(`Total: ${data.length} registrados`, 14, 28)

      const tableData = data.map((d: any) => [
        d.cedula,
        d.nombre,
        d.categoria,
        d.dedicacion,
        d.contacto || 'N/A',
        d.email || 'N/A'
      ])

      autoTable(doc, {
        startY: 42,
        head: [['Cédula', 'Nombre Completo', 'Categoría', 'Dedicación', 'Teléfono', 'Correo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [17, 24, 39] },
        margin: { left: 14, right: 14, bottom: 15 }
      })

      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(26, 58, 107)
        doc.rect(0, pageH - 10, pageW, 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('UNERG — Decanato de Postgrado | Sistema de Planificación Académica', 14, pageH - 4)
        doc.text(`Página ${i} de ${totalPages}`, pageW - 30, pageH - 4)
      }

      const fecha = new Date().toISOString().split('T')[0]
      doc.save(`listado-docentes-${fecha}.pdf`)
      toast.success('Listado descargado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el listado')
    } finally {
      setGenerandoPDF(false)
    }
  }

  return (
    <div ref={reporteRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <BarChartIcon style={{ width: '32px', height: '32px', color: '#2563eb' }} />
            Módulo de Estadísticas
          </h1>
          <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Indicadores y métricas clave del sistema</p>
        </div>

        {/* Botón PDF Dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            disabled={generandoPDF || cargando}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: generandoPDF || cargando ? 'not-allowed' : 'pointer',
              background: generandoPDF || cargando ? '#93c5fd' : '#1d4ed8',
              color: '#ffffff', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
              transition: 'all 0.2s', opacity: generandoPDF || cargando ? 0.7 : 1
            }}
            title="Opciones de exportación"
          >
            {generandoPDF ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Generando...
              </>
            ) : (
              <>
                <Download style={{ width: '18px', height: '18px' }} />
                Exportar Reportes
              </>
            )}
          </button>
          
          {menuAbierto && (
            <div style={{ 
              position: 'absolute', right: 0, top: '48px', width: '260px', 
              background: '#fff', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
              border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden'
            }}>
              <button 
                onClick={() => { setMenuAbierto(false); exportarPDF(); }}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', fontSize: '14px', color: '#374151', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <BarChartIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                Resumen de Estadísticas
              </button>
              <button 
                onClick={() => { setMenuAbierto(false); exportarParticipantesPDF(); }}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', fontSize: '14px', color: '#374151', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Users style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                Listado de Participantes
              </button>
              <button 
                onClick={() => { setMenuAbierto(false); exportarDocentesPDF(); }}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', fontSize: '14px', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <UserCheck style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                Listado de Docentes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel de Filtros */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#374151', marginBottom: '20px', fontSize: '15px' }}>
          <Filter style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
          Filtros de Búsqueda
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Periodo Académico */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Periodo Académico</label>
            <div style={{ position: 'relative' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#9ca3af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select
                value={filtros.periodoId}
                onChange={(e) => setFiltros(prev => ({ ...prev, periodoId: e.target.value }))}
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', background: '#f9fafb', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todos los Periodos</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.anio} - {p.numero}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Región */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Región</label>
            <div style={{ position: 'relative' }}>
              <MapPin style={{ width: '16px', height: '16px', color: '#9ca3af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select
                value={filtros.regionId}
                onChange={(e) => setFiltros(prev => ({ ...prev, regionId: e.target.value, aulaTerritorialId: '' }))}
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', background: '#f9fafb', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todas las Regiones</option>
                {regiones.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Aula Territorial */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Aula Territorial</label>
            <div style={{ position: 'relative' }}>
              <Building2 style={{ width: '16px', height: '16px', color: '#9ca3af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select
                value={filtros.aulaTerritorialId}
                onChange={(e) => setFiltros(prev => ({ ...prev, aulaTerritorialId: e.target.value }))}
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', background: '#f9fafb', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todas las Aulas</option>
                {aulasFiltradas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {(filtros.periodoId || filtros.regionId || filtros.aulaTerritorialId) && (
          <div style={{ marginTop: '12px', padding: '8px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 500 }}>
              🔍 Filtrando por: {filtroTexto()}
            </span>
            <button
              onClick={() => setFiltros({ periodoId: '', regionId: '', aulaTerritorialId: '' })}
              style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Tarjetas KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <KpiCard title="Participantes" value={stats.participantes} icon={Users} color="#2563eb" bg="#eff6ff" />
            <KpiCard title="Cronogramas" value={stats.cronogramas} icon={Layers} color="#d97706" bg="#fffbeb" />
            <KpiCard title="Docentes" value={stats.docentes} icon={UserCheck} color="#059669" bg="#ecfdf5" />
            <KpiCard title="Aulas" value={stats.aulas} icon={Building2} color="#7c3aed" bg="#f5f3ff" />
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

            <GraficoBox titulo="Participantes por Trimestre" iconColor="#3b82f6" icon={Users}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficos.participantesPorTrimestre}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Participantes" />
                </BarChart>
              </ResponsiveContainer>
            </GraficoBox>

            <GraficoBox titulo="Participantes por Género" iconColor="#f59e0b" icon={Users}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={graficos.participantesPorGenero} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                    {graficos.participantesPorGenero.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </GraficoBox>

            <GraficoBox titulo="Docentes por Dedicación" iconColor="#10b981" icon={UserCheck}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficos.docentesPorDedicacion} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Docentes" />
                </BarChart>
              </ResponsiveContainer>
            </GraficoBox>

            <GraficoBox titulo="Docentes por Categoría" iconColor="#8b5cf6" icon={BookOpen}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={graficos.docentesPorCategoria} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                    {graficos.docentesPorCategoria.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </GraficoBox>

          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function GraficoBox({ titulo, iconColor, icon: Icon, children }: { titulo: string, iconColor: string, icon: any, children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '24px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
        <Icon style={{ width: '18px', height: '18px', color: iconColor }} />
        {titulo}
      </h3>
      <div style={{ height: '260px' }}>
        {children}
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, color, bg }: { title: string, value: number, icon: any, color: string, bg: string }) {
  return (
    <div style={{
      background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '12px', textAlign: 'center', minHeight: '130px',
    }}>
      <div style={{ background: bg, borderRadius: '12px', padding: '12px', display: 'inline-flex' }}>
        <Icon style={{ width: '28px', height: '28px', color }} />
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '2px 0 0 0', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  )
}
