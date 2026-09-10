'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, FileText, Plus, Trash2, X, Calendar, Edit2, CheckSquare, UserPlus, UserMinus, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { generateCronogramaPDF } from '@/lib/pdfCronograma'
import toast from 'react-hot-toast'

const TIME_OPTIONS = Array.from({ length: 16 * 4 + 1 }).map((_, i) => {
  const h = Math.floor(i / 4) + 6;
  const m = (i % 4) * 15;
  if (h > 21 && m > 0) return null;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}).filter(Boolean) as string[];

type Cronograma = {
  id: string
  periodo: { id: string; anio: number; numero: number; modalidad: string }
  trimestre: string
  seccion: string
  aulaTerritorial: { id: string; nombre: string; coordinador: string | null; enlace: string | null; region: { id: string; nombre: string } }
  vocero: string | null; telefonoVocero: string | null; emailVocero: string | null
  participantesFem: number; participantesMasc: number
  asignaciones: {
    id: string; docenteId: string; unidadId: string; lugar: string | null
    horaInicio: string; horaFin: string; modalidad: string; uc: number; cantHoras: number
    docente: { nombre: string; categoria: string; dedicacion: string }
    unidad: { id: string; nombre: string }
    fechas: { id: string; fecha: string; modalidad: string }[]
  }[]
  participantes: { unidadesIds: string[]; participante: { id: string; nombre: string; apellido: string | null; cedula: string | null; genero: string; unidad: { nombre: string } | null } }[]
  _meta?: { userRole: string; asignacionCargaAbierta: boolean; inscripcionParticipantesAbierta: boolean }
}

export default function CronogramaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Cronograma | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteAsign, setDeleteAsign] = useState<string | null>(null)
  const [showPartForm, setShowPartForm] = useState(false)
  const [showSimplePartForm, setShowSimplePartForm] = useState(false)
  const [simpleFem, setSimpleFem] = useState('0')
  const [simpleMasc, setSimpleMasc] = useState('0')
  const [savingSimple, setSavingSimple] = useState(false)

  const [availableParticipants, setAvailableParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [searchCedula, setSearchCedula] = useState('') // Kept for backwards compatibility but not used
  const [searchTerm, setSearchTerm] = useState('')
  
  const [selectedParticipantForEnroll, setSelectedParticipantForEnroll] = useState<any>(null)
  const [selectedParticipantsIds, setSelectedParticipantsIds] = useState<string[]>([])
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false)

  const [enrollModeSingle, setEnrollModeSingle] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [selectedUnitsSingle, setSelectedUnitsSingle] = useState<string[]>([])

  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [unidadesGlobal, setUnidadesGlobal] = useState<Record<string, string>>({})

  const [editAsign, setEditAsign] = useState<any>(null)
  const [savingAsign, setSavingAsign] = useState(false)

  const [showGenerarModal, setShowGenerarModal] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [horaInicioBase, setHoraInicioBase] = useState('08:00')
  const [generandoFechas, setGenerandoFechas] = useState(false)

  const handleGenerarFechas = async () => {
    if (!fechaInicio) {
      toast.error('Por favor, indique la fecha de inicio')
      return
    }
    setGenerandoFechas(true)
    try {
      const res = await fetch(`/sistema/api/cronograma/${id}/generar-fechas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaInicio, horaInicio: horaInicioBase })
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'Error al generar fechas')
      await fetch_()
      setShowGenerarModal(false)
    } catch (e: any) {
      toast.error(e.message || 'Hubo un error al generar fechas')
    } finally {
      setGenerandoFechas(false)
    }
  }

  const [generatingPDF, setGeneratingPDF] = useState(false)

  const handleGeneratePDF = async () => {
    if (!data) return
    setGeneratingPDF(true)
    try {
      await generateCronogramaPDF([data], `Cronograma_Secc_${data.seccion}`)
    } catch (error) {
      toast.error('Error al generar PDF: ' + (error as Error).message)
    } finally {
      setGeneratingPDF(false)
    }
  }


  const openSimpleInscripcionModal = () => {
    if (data) {
      setSimpleFem(data.participantesFem.toString())
      setSimpleMasc(data.participantesMasc.toString())
      setShowSimplePartForm(true)
    }
  }

  const handleSaveSimpleMode = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSimple(true)
    try {
      const res = await fetch(`/sistema/api/cronograma/${id}/cantidad-simple`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantesFem: simpleFem, participantesMasc: simpleMasc })
      })
      if (!res.ok) throw new Error('Error al guardar la cantidad')
      await fetch_()
      setShowSimplePartForm(false)
      toast.success('Cantidad de participantes actualizada')
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSavingSimple(false)
    }
  }

  const fetch_ = async () => {
    try {
      const [res, uRes] = await Promise.all([
        fetch(`/sistema/api/cronograma/${id}`),
        fetch(`/sistema/api/unidades`)
      ])
      const d = await res.json()
      const uList = await uRes.json()
      const uDict: Record<string, string> = {}
      if (Array.isArray(uList)) {
        uList.forEach((u: any) => { uDict[u.id] = u.nombre })
      }
      setUnidadesGlobal(uDict)
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch_() }, [id])

  const handleDeleteAsign = async (asignId: string) => {
    await fetch(`/sistema/api/asignaciones/${asignId}`, { method: 'DELETE' })
    await fetch_()
    setDeleteAsign(null)
  }

  const handleUnassignDocente = async (asignId: string) => {
    const asign = data?.asignaciones.find(a => a.id === asignId);
    if (!asign) return;
    try {
      const payload = {
        ...asign,
        docenteId: null,
        viatico: 0,
        fechas: asign.fechas.map(f => f.fecha.split('T')[0])
      };
      const res = await fetch(`/sistema/api/asignaciones/${asignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al desasignar docente');
      await fetch_();
      setDeleteAsign(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const handleUpdateAsign = async () => {
    setSavingAsign(true)
    await fetch(`/sistema/api/asignaciones/${editAsign.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editAsign)
    })
    await fetch_()
    setEditAsign(null)
    setSavingAsign(false)
  }

  const addFechaToEdit = (fecha: string) => {
    if (!fecha || editAsign.fechas.includes(fecha)) return
    setEditAsign({ ...editAsign, fechas: [...editAsign.fechas, fecha].sort() })
  }

  const removeFechaFromEdit = (fecha: string) => {
    setEditAsign({ ...editAsign, fechas: editAsign.fechas.filter((f: string) => f !== fecha) })
  }

  const generateFechasEdit = (fechaInicial: string) => {
    if (!fechaInicial) return
    const totalClases = parseInt(editAsign.uc) * 2
    if (isNaN(totalClases) || totalClases <= 0) return

    const generatedFechas: string[] = []
    const currentDate = new Date(fechaInicial + 'T12:00:00')

    for (let j = 0; j < totalClases; j++) {
      generatedFechas.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 15)
    }
    setEditAsign({ ...editAsign, fechas: generatedFechas.sort() })
  }

  const openInscripcionModal = async () => {
    setShowPartForm(true)
    setLoadingParticipants(true)
    try {
      const regionId = data?.aulaTerritorial.region.id
      const aulaTerritorialId = data?.aulaTerritorial.id
      const periodoId = data?.periodo.id
      const [partsRes, unitsRes] = await Promise.all([
        fetch(`/sistema/api/participantes?regionId=${regionId}&aulaTerritorialId=${aulaTerritorialId}&periodoId=${periodoId}`),
        fetch(`/sistema/api/unidades`)
      ])
      const parts = await partsRes.json()
      const units = await unitsRes.json()
      setAvailableParticipants(Array.isArray(parts) ? parts : [])
      setAvailableUnits(units.filter((u: any) => u.trimestre === data?.trimestre))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingParticipants(false)
    }
  }

  const handleConfirmInscribir = async () => {
    try {
      const mode = enrollModeSingle
      const unidadesIds = mode === 'SPECIFIC' ? selectedUnitsSingle : []
      if (mode === 'SPECIFIC' && unidadesIds.length === 0) {
        toast.error('Seleccione al menos una materia específica')
        return
      }

      let pIds: string[] = []
      if (showBulkEnrollModal) {
        pIds = selectedParticipantsIds
      } else if (selectedParticipantForEnroll) {
        pIds = [selectedParticipantForEnroll.id]
      } else {
        return
      }

      if (pIds.length === 0) {
        toast.error('No hay participantes seleccionados')
        return
      }

      const res = await fetch(`/sistema/api/cronograma/${id}/participantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantesIds: pIds, unidadesIds })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al inscribir')
      }
      setSelectedParticipantForEnroll(null)
      setShowBulkEnrollModal(false)
      setSelectedParticipantsIds([])
      setEnrollModeSingle('ALL')
      setSelectedUnitsSingle([])
      await fetch_()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDesinscribir = async (participanteId: string) => {
    try {
      const res = await fetch(`/sistema/api/cronograma/${id}/participantes?participanteId=${participanteId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al desinscribir')
      await fetch_()
    } catch (e: any) {
      toast.error(e.message)
    }
  }



  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
  if (!data || 'error' in data) return <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>{(data as any)?.error || 'Cronograma no encontrado'}</div>

  const isAdmin = data._meta?.userRole === 'ADMIN'
  const canModifyAsignaciones = isAdmin || data._meta?.asignacionCargaAbierta
  const canEditOrDelete = isAdmin
  const canManageParticipants = isAdmin || data._meta?.inscripcionParticipantesAbierta

  const isManualModeActive = data.participantes && data.participantes.length > 0;
  const isSimpleModeActive = data.participantes.length === 0 && (data.participantesFem > 0 || data.participantesMasc > 0);

  return (
    <div className="fade-in">
      <datalist id="time-options">
        {TIME_OPTIONS.map(t => <option key={t} value={t} />)}
      </datalist>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/cronograma" className="btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a3a6b' }}>
              Cronograma {data.periodo.anio}-{data.periodo.numero} — Sección {data.seccion}
            </h1>
            <p style={{ fontSize: '13px', color: '#718096' }}>
              {data.trimestre === 'Introductorio' ? data.trimestre : `${data.trimestre}° Trimestre`} · {data.aulaTerritorial.nombre} · {data.aulaTerritorial.region.nombre}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href={`/cronograma/${id}/costos`} className="btn btn-secondary">
            Estructura de Costos
          </Link>
          <button className="btn btn-primary" onClick={handleGeneratePDF} disabled={generatingPDF}>
            {generatingPDF ? <Loader2 size={16} className="spin" /> : <FileText size={16} />} Generar Cronograma
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Periodo', value: `${data.periodo.anio}-${data.periodo.numero}` },
          { label: 'Nivel / Trimestre', value: data.trimestre === 'Introductorio' ? data.trimestre : `${data.trimestre}° Trimestre` },
          { label: 'Sección', value: data.seccion },
          { label: 'Modalidad', value: data.periodo.modalidad },
          { label: 'Sede', value: data.aulaTerritorial.nombre },
          { label: 'Región', value: data.aulaTerritorial.region.nombre },
          { label: 'Coordinador', value: data.aulaTerritorial.coordinador || '—' },
          { label: 'Vocero', value: data.vocero || '—' },
          { label: 'Participantes ♀', value: data.participantesFem.toString() },
          { label: 'Participantes ♂', value: data.participantesMasc.toString() },
          { label: 'Total', value: (data.participantesFem + data.participantesMasc).toString() },
        ].map(item => (
          <div key={item.label} style={{ background: 'white', borderRadius: '8px', padding: '12px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a3a6b' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Asignaciones */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Asignaciones de Docentes</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canModifyAsignaciones && <button className="btn btn-sm btn-secondary" onClick={() => setShowGenerarModal(true)}><Calendar size={14} /> Generar Fechas</button>}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {data.asignaciones.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}><p>No hay docentes asignados</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Docente</th><th>Categoría / Dedicación</th><th>Unidad Curricular</th>
                  <th>Horario</th><th>UC</th><th>Horas</th><th>Modalidad</th>
                  <th>Fechas</th><th>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {data.asignaciones.map(a => (
                  <tr key={a.id}>
                    <td><div style={{ fontWeight: 600, color: a.docente ? '#1a3a6b' : '#a0aec0' }}>{a.docente ? a.docente.nombre : 'Sin docente asignado'}</div></td>
                    <td>
                      {a.docente ? (
                        <>
                          <span className="badge badge-gray">{a.docente.categoria === 'CONTRATADO' ? 'Cont.' : 'Ord.'}</span>
                          {' '}<span className="badge badge-blue">{a.docente.dedicacion}</span>
                        </>
                      ) : (
                        <span className="badge badge-gray">N/A</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: '12px' }}>{a.unidad.nombre}</td>
                    <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{a.horaInicio} — {a.horaFin}</td>
                    <td><span className="badge badge-blue">{a.uc}</span></td>
                    <td><span className="badge badge-green">{a.cantHoras}hr</span></td>
                    <td>
                      <span className={`badge ${a.modalidad === 'PRESENCIAL' ? 'badge-green' : a.modalidad === 'VIRTUAL' ? 'badge-blue' : 'badge-orange'}`}>
                        {a.modalidad.charAt(0) + a.modalidad.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {a.fechas.map(f => (
                          <span key={f.id} style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {new Date(f.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {canModifyAsignaciones || canEditOrDelete ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {canModifyAsignaciones && (
                            <Link href={`/cronograma/${id}/agregar-docente?asignacionId=${a.id}`} className="btn-icon" style={{ color: '#16a34a', borderColor: '#bbf7d0' }} title="Asignar Docente">
                              <UserPlus size={14} />
                            </Link>
                          )}
                          {canEditOrDelete && (
                            <>
                              <button className="btn-icon" style={{ color: '#2563eb', borderColor: '#bfdbfe' }} title="Editar Detalles" onClick={() => setEditAsign({ ...a, fechas: a.fechas.map((f: any) => f.fecha.split('T')[0]) })}><Edit2 size={14} /></button>
                              <button className="btn-icon" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setDeleteAsign(a.id)}><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Participantes</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canManageParticipants && (
              <button 
                onClick={openSimpleInscripcionModal} 
                className="btn btn-sm btn-secondary" 
                disabled={isManualModeActive}
                title={isManualModeActive ? "Deshabilitado porque ya hay participantes inscritos manualmente" : "Definir cantidad total (Modo Simple)"}
                style={{
                  backgroundColor: isManualModeActive ? '#f8fafc' : undefined,
                  color: isManualModeActive ? '#94a3b8' : undefined,
                  borderColor: isManualModeActive ? '#e2e8f0' : undefined,
                  cursor: isManualModeActive ? 'not-allowed' : 'pointer',
                  opacity: isManualModeActive ? 0.6 : 1
                }}
              >
                <Plus size={14} /> Cantidad (Simple)
              </button>
            )}
            {canManageParticipants && (
              <button 
                onClick={openInscripcionModal} 
                className="btn btn-sm btn-secondary"
                disabled={isSimpleModeActive}
                title={isSimpleModeActive ? "Deshabilitado porque ya se definió una cantidad simple" : "Gestionar Participantes (Individual)"}
                style={{
                  backgroundColor: isSimpleModeActive ? '#f8fafc' : undefined,
                  color: isSimpleModeActive ? '#94a3b8' : undefined,
                  borderColor: isSimpleModeActive ? '#e2e8f0' : undefined,
                  cursor: isSimpleModeActive ? 'not-allowed' : 'pointer',
                  opacity: isSimpleModeActive ? 0.6 : 1
                }}
              >
                <Plus size={14} /> Gestionar Participantes
              </button>
            )}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {data.participantes.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              {isSimpleModeActive ? (
                <p>Participantes definidos de forma rápida: {data.participantesFem} mujeres y {data.participantesMasc} hombres.</p>
              ) : (
                <p>No hay participantes asignados a esta sección</p>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Nombre</th><th>Cédula</th><th>Género</th><th>Asignatura</th></tr></thead>
              <tbody>
                {data.participantes.map((rel, i) => {
                  const esEspecifica = rel.unidadesIds && rel.unidadesIds.length > 0
                  const materias = esEspecifica 
                    ? rel.unidadesIds.map(uid => unidadesGlobal[uid] || 'Materia desconocida').join(', ')
                    : 'Todas las materias de la sección'
                  return (
                    <tr key={rel.participante.id}>
                      <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{rel.participante.apellido}, {rel.participante.nombre}</td>
                      <td>{rel.participante.cedula || '—'}</td>
                      <td><span className={`badge ${rel.participante.genero === 'FEMENINO' ? 'badge-red' : 'badge-blue'}`}>{rel.participante.genero === 'FEMENINO' ? '♀ Fem.' : '♂ Masc.'}</span></td>
                      <td><span className="badge badge-blue" style={{ fontSize: '11px' }}>{materias}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}

      {showSimplePartForm && (
        <div className="modal-overlay" onClick={() => setShowSimplePartForm(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Definir Cantidad de Participantes</h3>
              <button className="btn-icon" onClick={() => setShowSimplePartForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#4a5568', marginBottom: '16px' }}>
                Ingrese la cantidad total de participantes de esta sección. 
                Al usar esta opción rápida, no podrá inscribir estudiantes de forma individual a menos que vuelva a colocar estas cantidades en 0.
              </p>
              <form onSubmit={handleSaveSimpleMode}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Participantes Femenino</label>
                    <input className="form-input" type="number" min="0" value={simpleFem} onChange={e => setSimpleFem(e.target.value.replace(/^0+(?=\d)/, ''))} required placeholder="Ingrese una cantidad" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Participantes Masculino</label>
                    <input className="form-input" type="number" min="0" value={simpleMasc} onChange={e => setSimpleMasc(e.target.value.replace(/^0+(?=\d)/, ''))} required placeholder="Ingrese una cantidad" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSimplePartForm(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={savingSimple}>
                    {savingSimple ? 'Guardando...' : 'Guardar Cantidad'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showGenerarModal && (
        <div className="modal-overlay" onClick={() => setShowGenerarModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generar Fechas de Encuentro</h3>
              <button className="btn-icon" onClick={() => setShowGenerarModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#4a5568', marginBottom: '16px' }}>
                Se generarán automáticamente las fechas de encuentro (2 encuentros por U.C.) cada 15 días, 
                asignando horas consecutivas en el mismo día para evitar choques entre las materias.
              </p>
<div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Fecha del Primer Encuentro *</label>
                  <input className="form-input" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Hora Inicial *</label>
                  <input className="form-input" type="text" list="time-options" value={horaInicioBase} onChange={e => setHoraInicioBase(e.target.value)} placeholder="Ingrese la hora HH:MM" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" />
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenerarModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGenerarFechas} disabled={generandoFechas || !fechaInicio}>
                {generandoFechas ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteAsign && (() => {
        const asign = data?.asignaciones.find(a => a.id === deleteAsign);
        const hasDocente = !!asign?.docenteId;
        return (
          <div className="modal-overlay" onClick={() => setDeleteAsign(null)}>
            <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ color: '#dc2626' }}>Opciones de Eliminación</h3>
                <button className="btn-icon" onClick={() => setDeleteAsign(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '16px' }}>¿Qué acción desea realizar con esta asignación?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {hasDocente && (
                    <button className="btn" style={{ justifyContent: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', color: '#4a5568', padding: '12px', width: '100%' }} onClick={() => handleUnassignDocente(deleteAsign)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '50%' }}><UserMinus size={18} color="#dc2626" /></div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: '#dc2626' }}>Solo quitar al docente actual</div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>La materia y el horario se mantendrán, pero quedarán sin docente asignado.</div>
                        </div>
                      </div>
                    </button>
                  )}
                  <button className="btn" style={{ justifyContent: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', color: '#4a5568', padding: '12px', width: '100%' }} onClick={() => handleDeleteAsign(deleteAsign)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '50%' }}><Trash2 size={18} color="#b91c1c" /></div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: '#b91c1c' }}>Eliminar toda la fila</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>Se quitará la materia, el horario y el docente del cronograma.</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteAsign(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showPartForm && (
        <div className="modal-overlay" onClick={() => setShowPartForm(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Gestionar Participantes</h3>
              <button className="btn-icon" onClick={() => setShowPartForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#a0aec0' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Buscar por nombre, apellido o cédula..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {selectedParticipantsIds.length > 0 && (
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{selectedParticipantsIds.length} participantes seleccionados</span>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowBulkEnrollModal(true)}>
                    Inscribir Seleccionados
                  </button>
                </div>
              )}

              {loadingParticipants ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>Cargando participantes disponibles...</div>
              ) : availableParticipants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>No hay participantes registrados para esta región y aula territorial.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(() => {
                    const filteredParticipants = availableParticipants.filter(p => {
                      const t = searchTerm.toLowerCase()
                      return (p.nombre?.toLowerCase().includes(t) || p.apellido?.toLowerCase().includes(t) || p.cedula?.includes(t))
                    })
                    
                    const selectableParticipantsIds = filteredParticipants
                      .filter(p => !data?.participantes.find(rel => rel.participante.id === p.id))
                      .map(p => p.id)

                    const allSelected = selectableParticipantsIds.length > 0 && selectableParticipantsIds.every(id => selectedParticipantsIds.includes(id))

                    return (
                      <>
                        {selectableParticipantsIds.length > 0 && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0 4px', fontWeight: 600, color: '#4a5568' }}>
                            <input 
                              type="checkbox" 
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSelected = new Set([...selectedParticipantsIds, ...selectableParticipantsIds])
                                  setSelectedParticipantsIds(Array.from(newSelected))
                                } else {
                                  setSelectedParticipantsIds(selectedParticipantsIds.filter(id => !selectableParticipantsIds.includes(id)))
                                }
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Seleccionar todos los visibles ({selectableParticipantsIds.length})
                          </label>
                        )}
                        {filteredParticipants.map(p => {
                          const relacion = data?.participantes.find(rel => rel.participante.id === p.id)
                          const isInscrito = !!relacion

                    return (
                      <div key={p.id} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: isInscrito ? '#f0fdf4' : '#fff' }}>
                        {!isInscrito && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedParticipantsIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipantsIds([...selectedParticipantsIds, p.id])
                                } else {
                                  setSelectedParticipantsIds(selectedParticipantsIds.filter(id => id !== p.id))
                                }
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1a3a6b' }}>{p.apellido}, {p.nombre}</div>
                            <div style={{ fontSize: '13px', color: '#4a5568' }}>
                              CI: {p.cedula || '—'} · {p.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}
                            </div>
                            {isInscrito && (
                              <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', background: '#dcfce7', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                ✅ Inscrito en {relacion.unidadesIds.length > 0 ? 'materias específicas' : `toda la sección ${data?.seccion}`}
                              </div>
                            )}
                          </div>
                          <div>
                            {isInscrito ? (
                              <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => handleDesinscribir(p.id)}>Desinscribir</button>
                            ) : (
                              <button className="btn btn-sm btn-primary" onClick={() => {
                                let canAll = true
                                p.cronogramas?.forEach((r: any) => {
                                  if (r.cronograma.trimestre === data?.trimestre && r.cronograma.id !== data?.id) {
                                    canAll = false
                                  }
                                })
                                setSelectedParticipantForEnroll(p)
                                setEnrollModeSingle(canAll ? 'ALL' : 'SPECIFIC')
                                setSelectedUnitsSingle([])
                              }}>Inscribir</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredParticipants.length === 0 && searchTerm && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>No se encontraron participantes con esa búsqueda.</div>
                  )}
                  </>
                )})()}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowPartForm(false)
                setSelectedParticipantForEnroll(null)
                setShowBulkEnrollModal(false)
                setSelectedParticipantsIds([])
                setSearchTerm('')
              }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {selectedParticipantForEnroll && (() => {
        const p = selectedParticipantForEnroll
        const alreadyEnrolled = new Map<string, string>()
        let enrolledInAllAnywhere = false
        let seccionAll = ''

        p.cronogramas?.forEach((rel: any) => {
          if (rel.cronograma.trimestre === data?.trimestre && rel.cronograma.id !== data?.id) {
            if (rel.unidadesIds && rel.unidadesIds.length > 0) {
              rel.unidadesIds.forEach((uid: string) => alreadyEnrolled.set(uid, rel.cronograma.seccion))
            } else {
              enrolledInAllAnywhere = true
              seccionAll = rel.cronograma.seccion
            }
          }
        })

        const canEnrollAll = !enrolledInAllAnywhere && alreadyEnrolled.size === 0

        return (
          <div className="modal-overlay" onClick={() => setSelectedParticipantForEnroll(null)} style={{ zIndex: 1000 }}>
            <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Opciones de Inscripción</h3>
                <button className="btn-icon" onClick={() => setSelectedParticipantForEnroll(null)}><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontWeight: 600, color: '#1a3a6b', marginBottom: '4px' }}>
                    {p.apellido}, {p.nombre}
                  </p>
                  <p style={{ fontSize: '13px', color: '#718096' }}>CI: {p.cedula}</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Modalidad de inscripción</label>
                  <select className="form-select" value={enrollModeSingle} onChange={e => setEnrollModeSingle(e.target.value as any)}>
                    {canEnrollAll && <option value="ALL">Inscribir en toda la sección ({data?.seccion})</option>}
                    <option value="SPECIFIC">Seleccionar materia específica</option>
                  </select>
                </div>

                {enrollModeSingle === 'SPECIFIC' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Materias disponibles:</label>
                    {availableUnits.length > 0 ? (
                      availableUnits.map(u => {
                        const seccionEnrolled = alreadyEnrolled.get(u.id) || (enrolledInAllAnywhere ? seccionAll : null)
                        const isDisabled = !!seccionEnrolled

                        return (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}>
                            <input 
                              type="checkbox" 
                              checked={isDisabled || selectedUnitsSingle.includes(u.id)}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (isDisabled) return
                                if (e.target.checked) setSelectedUnitsSingle([...selectedUnitsSingle, u.id])
                                else setSelectedUnitsSingle(selectedUnitsSingle.filter(uid => uid !== u.id))
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{u.nombre}</span>
                              {isDisabled && <span style={{ fontSize: '11px', color: '#dc2626' }}>Ya asignada en Sec. {seccionEnrolled}</span>}
                            </div>
                          </label>
                        )
                      })
                    ) : (
                      <div style={{ fontSize: '13px', color: '#dc2626' }}>
                        No hay materias registradas para este trimestre.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedParticipantForEnroll(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleConfirmInscribir}>Confirmar Inscripción</button>
              </div>
            </div>
          </div>
        )
      })()}

      {showBulkEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowBulkEnrollModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Inscripción Múltiple</h3>
              <button className="btn-icon" onClick={() => setShowBulkEnrollModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, color: '#1a3a6b' }}>
                  {selectedParticipantsIds.length} participantes seleccionados
                </p>
                <p style={{ fontSize: '13px', color: '#718096' }}>
                  Seleccione cómo desea inscribir a estos participantes. Si un participante ya está inscrito en alguna materia del mismo trimestre en otra sección, la inscripción completa a esta sección fallará o se aplicará condicionalmente según las restricciones del sistema.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Modalidad de inscripción</label>
                <select className="form-select" value={enrollModeSingle} onChange={e => setEnrollModeSingle(e.target.value as any)}>
                  <option value="ALL">Inscribir en toda la sección ({data?.seccion})</option>
                  <option value="SPECIFIC">Seleccionar materia específica</option>
                </select>
              </div>

              {enrollModeSingle === 'SPECIFIC' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Materias disponibles:</label>
                  {availableUnits.length > 0 ? (
                    availableUnits.map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedUnitsSingle.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUnitsSingle([...selectedUnitsSingle, u.id])
                            else setSelectedUnitsSingle(selectedUnitsSingle.filter(uid => uid !== u.id))
                          }}
                        />
                        <span>{u.nombre}</span>
                      </label>
                    ))
                  ) : (
                    <div style={{ fontSize: '13px', color: '#dc2626' }}>
                      No hay materias registradas para este trimestre.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkEnrollModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmInscribir}>Confirmar Inscripción</button>
            </div>
          </div>
        </div>
      )}

      {editAsign && (
        <div className="modal-overlay" onClick={() => setEditAsign(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Fechas y Detalles</h3>
              <button className="btn-icon" onClick={() => setEditAsign(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group"><label className="form-label">Modalidad</label>
                  <select className="form-select" value={editAsign.modalidad} onChange={e => setEditAsign({ ...editAsign, modalidad: e.target.value })}>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="MULTIMODAL">Multimodal</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Lugar / Aula</label>
                  <input className="form-input" value={editAsign.lugar || ''} onChange={e => setEditAsign({ ...editAsign, lugar: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Hora Inicio</label>
                  <input className="form-input" type="text" list="time-options" value={editAsign.horaInicio || ''} onChange={e => setEditAsign({ ...editAsign, horaInicio: e.target.value })} placeholder="Ingrese la hora HH:MM" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora Fin</label>
                  <input className="form-input" type="text" list="time-options" value={editAsign.horaFin || ''} onChange={e => setEditAsign({ ...editAsign, horaFin: e.target.value })} placeholder="Ingrese la hora HH:MM" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" />
                </div>
              </div>

              <div>
                <label className="form-label">Fechas de Encuentros (Total calculado: {parseInt(editAsign.uc) * 2 || 0})</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#4a5568' }}>1. Regenerar Fechas (Sobrescribir)</label>
                    <input className="form-input" type="date" onChange={e => { generateFechasEdit(e.target.value); e.target.value = '' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#4a5568' }}>2. Agregar una fecha extra</label>
                    <input className="form-input" type="date" onChange={e => { addFechaToEdit(e.target.value); e.target.value = '' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {editAsign.fechas.map((f: string) => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                      <Calendar size={12} />{new Date(f + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <button onClick={() => removeFechaFromEdit(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: '0', marginLeft: '2px', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                  {editAsign.fechas.length === 0 && <span style={{ fontSize: '12px', color: '#a0aec0' }}>Sin fechas asignadas</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditAsign(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdateAsign} disabled={savingAsign}>{savingAsign ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
