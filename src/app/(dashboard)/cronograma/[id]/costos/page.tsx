'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, ArrowLeft, Loader2, Save, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { PlantillaCostosPDF } from '@/components/PlantillaCostosPDF'
import toast from 'react-hot-toast'
import { determinarTipoViatico } from '@/lib/viaticos'

type Cronograma = {
  id: string
  seccion: string
  modalidad: string
  vocero: string
  participantesFem: number
  participantesMasc: number
  periodo: { anio: number; numero: number; tabulador: number | null }
  resolucion: string | null
  aulaTerritorial: {
    nombre: string
    costo: number
    preinscripcion: number
    inscripcion: number
    gastosAdministrativos: number
    limpieza: number
    vigilancia: number
    aporteCoordinacion: number
    viatico: number
    region: { id: string; nombre: string }
  }
  asignaciones: {
    id: string
    hp: number | null
    viatico: number | null
    docente: {
      nombre: string
      region?: { nombre: string }
    }
    unidad: {
      nombre: string
    }
    fechas: any[]
  }[]
  participantes: any[]
}



export default function EstructuraCostosPage() {
  const { id } = useParams()
  const router = useRouter()
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local state for edits
  const [asignaciones, setAsignaciones] = useState<{ id: string, hp: string, viatico: string }[]>([])
  const [aulaCostos, setAulaCostos] = useState({
    preinscripcion: '',
    inscripcion: '',
    gastosAdministrativos: '',
    limpieza: '',
    vigilancia: '',
    aporteCoordinacion: ''
  })
  
  // PDF state
  const [refDocumento, setRefDocumento] = useState('')
  const [resolucion, setResolucion] = useState('')
  const pdfRef = React.useRef<HTMLDivElement>(null)

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    fetchCronograma()
    fetchBcvRate()
    fetchResolucion()
  }, [])

  const fetchResolucion = async () => {
    try {
      const res = await fetch('/api/configuracion')
      if (res.ok) {
        const data = await res.json()
        if (data.resolucion) setResolucion(data.resolucion)
      }
    } catch (err) {
      console.error('Error al obtener resolución', err)
    }
  }

  const fetchBcvRate = async () => {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      if (res.ok) {
        const data = await res.json()
        if (data.promedio) {
          // Format with comma instead of dot for Venezuela
          setRefDocumento(data.promedio.toFixed(2).replace('.', ','))
        }
      }
    } catch (err) {
      console.error('Error al obtener tasa BCV', err)
    }
  }

  const fetchCronograma = async () => {
    try {
      const res = await fetch(`/api/cronograma/${id}`)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setCronograma(data)
      // La resolución se carga desde la configuración global, no del cronograma
      setAsignaciones(data.asignaciones.map((a: any) => {
        const tipoViatico = determinarTipoViatico(a.docente?.region?.nombre, data.aulaTerritorial?.region?.nombre)
        let defaultViatico = 0
        if (tipoViatico === 'SEDE') defaultViatico = data.aulaTerritorial?.viatico || 0
        if (tipoViatico === 'ZONA') defaultViatico = data.aulaTerritorial?.viaticoZona || 0

        return {
          id: a.id,
          hp: (a.hp || data.periodo?.tabulador || 50).toString(),
          viatico: (a.viatico || defaultViatico || 0).toString()
        }
      }))
      setAulaCostos({
        preinscripcion: data.aulaTerritorial?.preinscripcion ? data.aulaTerritorial.preinscripcion.toString() : '',
        inscripcion: data.aulaTerritorial?.inscripcion ? data.aulaTerritorial.inscripcion.toString() : '',
        gastosAdministrativos: data.aulaTerritorial?.gastosAdministrativos ? data.aulaTerritorial.gastosAdministrativos.toString() : '',
        limpieza: data.aulaTerritorial?.limpieza ? data.aulaTerritorial.limpieza.toString() : '',
        vigilancia: data.aulaTerritorial?.vigilancia ? data.aulaTerritorial.vigilancia.toString() : '',
        aporteCoordinacion: data.aulaTerritorial?.aporteCoordinacion ? data.aulaTerritorial.aporteCoordinacion.toString() : ''
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAsignacionChange = (id: string, field: 'hp' | 'viatico', value: string) => {
    setAsignaciones(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value.replace(/^0+(?=\d)/, '') } : a
    ))
  }

  const handleAulaCostoChange = (field: keyof typeof aulaCostos, value: string) => {
    setAulaCostos(prev => ({ ...prev, [field]: value.replace(/^0+(?=\d)/, '') }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/cronograma/${id}/costos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones: asignaciones.map(a => ({ id: a.id, hp: parseFloat(a.hp) || 0, viatico: parseFloat(a.viatico) || 0 })), aulaCostos, resolucion })
      })
      if (!res.ok) throw new Error('Error al guardar')
      await fetchCronograma()
      toast.success('Costos guardados exitosamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const requestPDFGeneration = () => {
    if (!cronograma) return
    if (!pdfRef.current) return
    
    const participantesTotal = (cronograma.participantesFem || 0) + (cronograma.participantesMasc || 0)
    if (participantesTotal === 0) {
      toast.error('Debe haber al menos 1 participante inscrito en el cronograma para descargar la estructura de costos.')
      return
    }

    // Validate inputs
    if (!resolucion) {
      toast.error('Debe configurar el Nro. de Resolución en el sistema antes de descargar el PDF.')
      return
    }

    if (!refDocumento) {
      setShowConfirmModal(true)
      return
    }

    executeGeneratePDF()
  }

  const executeGeneratePDF = async () => {
    setShowConfirmModal(false)
    
    try {
      if (!pdfRef.current || !cronograma) return
      
      const toastId = toast.loading('Generando PDF...')
      
      const canvas = await html2canvas(pdfRef.current, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      
      doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      doc.save(`Estructura_Costos_${cronograma.seccion}.pdf`)
      
      toast.dismiss(toastId)
      toast.success('PDF generado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Hubo un error al generar el PDF')
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!cronograma) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>No se encontró el cronograma</div>
  }

  let currentTotalEgresos = (parseFloat(aulaCostos.limpieza) || 0) + (parseFloat(aulaCostos.vigilancia) || 0) + (parseFloat(aulaCostos.aporteCoordinacion) || 0)
  cronograma.asignaciones.forEach(a => {
    const match = asignaciones.find(x => x.id === a.id)
    const hp = parseFloat(match?.hp || '0') || 0
    const viatico = parseFloat(match?.viatico || '0') || 0
    const encuentros = a.fechas?.length || 0
    const tipoViatico = determinarTipoViatico(a.docente?.region?.nombre, cronograma.aulaTerritorial?.region?.nombre)
    const hasViatico = tipoViatico !== 'NO_APLICA'
    
    currentTotalEgresos += (hp * encuentros) + (hasViatico ? (viatico * encuentros) : 0)
  })

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Custom Animated Modal Overlay */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a202c', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: '#fff5f5', padding: '8px', borderRadius: '50%', color: '#e53e3e' }}>
                <FileText size={20} />
              </div>
              Campos Faltantes
            </h3>
            <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              No ha ingresado la <strong style={{color:'#2d3748'}}>Referencia (REF)</strong>. 
              <br/><br/>
              El PDF se generará con este campo en blanco. ¿Desea continuar de todas formas?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="btn"
                style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 500, border: 'none' }}
              >
                Cancelar
              </button>
              <button 
                onClick={executeGeneratePDF}
                className="btn btn-primary"
                style={{ backgroundColor: '#3182ce', fontWeight: 500 }}
              >
                Sí, generar PDF
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Link href={`/cronograma/${id}`} className="btn-icon" style={{ padding: '4px' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={24} color="#2d6bc4" /> Estructura de Costos
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#718096', marginLeft: '34px' }}>
            Sección: {cronograma.seccion} — {cronograma.aulaTerritorial.nombre}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="REF (Ej: 411,09)" 
            style={{ width: '130px', padding: '6px' }}
            value={refDocumento}
            onChange={e => setRefDocumento(e.target.value)}
          />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Resolución Nro." 
            style={{ width: '150px', padding: '6px', background: '#f8fafc', color: '#4a5568', cursor: 'default' }}
            value={resolucion}
            readOnly
            title="La resolución se configura en el módulo Estructura de Costos"
          />
          <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Guardar Costos
          </button>
          <button className="btn btn-primary" onClick={requestPDFGeneration}>
            <FileText size={16} /> Generar Estructura de Costo
          </button>
        </div>
      </div>
      
      {/* Hidden PDF Template */}
      <div>
        <PlantillaCostosPDF 
          ref={pdfRef} 
          cronograma={cronograma} 
          asignaciones={asignaciones.map(a => ({ id: a.id, hp: parseFloat(a.hp) || 0, viatico: parseFloat(a.viatico) || 0 }))} 
          refDocumento={refDocumento}
          resolucion={resolucion}
          coordinadorNacional={(cronograma as any)._meta?.coordinadorNacional || ''}
        />
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a3a6b' }}>
          Honorarios y Viáticos de Docentes Asignados
        </h3>
        
        {cronograma.asignaciones.length === 0 ? (
          <div style={{ color: '#718096', fontSize: '14px', fontStyle: 'italic' }}>
            No hay docentes asignados en este cronograma.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Unidad Curricular</th>
                <th>Docente</th>
                <th>Encuentros</th>
                <th>Honorarios ($)</th>
                <th>Viáticos ($)</th>
              </tr>
            </thead>
            <tbody>
              {cronograma.asignaciones.map(a => {
                const tipoViatico = determinarTipoViatico(a.docente?.region?.nombre, cronograma.aulaTerritorial?.region?.nombre)
                const hasViatico = tipoViatico !== 'NO_APLICA'
                const local = asignaciones.find(x => x.id === a.id)
                
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: '#2d3748' }}>{a.unidad.nombre}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{a.docente?.nombre || 'Docente no asignado'}</div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>{a.docente?.region?.nombre || 'Sin región'}</div>
                    </td>
                    <td>{a.fechas?.length || 0}</td>
                    <td>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ width: '100px', padding: '4px 8px' }}
                        value={local?.hp || ''}
                        onChange={(e) => handleAsignacionChange(a.id, 'hp', e.target.value)}
                        placeholder="Ingrese una cantidad"
                      />
                    </td>
                    <td>
                      {hasViatico ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ width: '100px', padding: '4px 8px' }}
                            value={local?.viatico || ''}
                            onChange={(e) => handleAsignacionChange(a.id, 'viatico', e.target.value)}
                            placeholder="Ingrese una cantidad"
                          />
                          <span style={{ fontSize: '10px', color: '#4a5568', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {tipoViatico === 'SEDE' ? 'Sede' : 'Zona'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e0', fontSize: '13px' }}>No aplica</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1a3a6b', margin: 0 }}>
              Costos del Aula (Por Participante)
            </h3>
            <Link href={`/estructura-costos/aulas?regionId=${cronograma.aulaTerritorial.region.id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2d6bc4', textDecoration: 'none', fontWeight: 500 }}>
              Acciones rápidas <ExternalLink size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Preinscripción:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.preinscripcion} onChange={e => handleAulaCostoChange('preinscripcion', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Inscripción:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.inscripcion} onChange={e => handleAulaCostoChange('inscripcion', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Gastos Administrativos:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.gastosAdministrativos} onChange={e => handleAulaCostoChange('gastosAdministrativos', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ color: '#2d3748', fontWeight: 600 }}>Costo Operativo Asignado:</span>
              <span style={{ fontWeight: 600 }}>
                ${(currentTotalEgresos / (cronograma.participantesFem + cronograma.participantesMasc || 1)).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ color: '#2d3748', fontWeight: 600 }}>Total Trimestral:</span>
              <span style={{ fontWeight: 700, color: '#2d6bc4' }}>
                ${((currentTotalEgresos / (cronograma.participantesFem + cronograma.participantesMasc || 1)) + (parseFloat(aulaCostos.preinscripcion)||0) + (parseFloat(aulaCostos.inscripcion)||0) + (parseFloat(aulaCostos.gastosAdministrativos)||0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1a3a6b', margin: 0 }}>
              Otros Egresos del Aula
            </h3>
            <Link href={`/estructura-costos/aulas?regionId=${cronograma.aulaTerritorial.region.id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2d6bc4', textDecoration: 'none', fontWeight: 500 }}>
              Acciones rápidas <ExternalLink size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Limpieza y Mantenimiento:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.limpieza} onChange={e => handleAulaCostoChange('limpieza', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Vigilancia:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.vigilancia} onChange={e => handleAulaCostoChange('vigilancia', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4a5568' }}>Aporte a la Coordinación:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '4px' }}>$</span>
                <input type="number" className="form-input" style={{ width: '130px', padding: '4px 8px', textAlign: 'right' }} value={aulaCostos.aporteCoordinacion} onChange={e => handleAulaCostoChange('aporteCoordinacion', e.target.value)} placeholder="Ingrese una cantidad" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
