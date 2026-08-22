'use client'

import { useState, useEffect } from 'react'
import { Building2, Save, MapPin, ChevronRight, ChevronDown, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Aula = { id: string; nombre: string; coordinador: string | null; enlace: string | null; costo: number; preinscripcion: number | null; inscripcion: number | null; gastosAdministrativos: number | null; limpieza: number | null; vigilancia: number | null; aporteCoordinacion: number | null; viatico: number | null; regionId: string }
type Region = { id: string; nombre: string; aulas: Aula[] }

type EditValues = {
  preinscripcion: string
  inscripcion: string
  gastosAdministrativos: string
  limpieza: string
  vigilancia: string
  aporteCoordinacion: string
}

export default function AulasCostosPage() {
  const [regiones, setRegiones] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, EditValues>>({})

  const fetchRegiones = async () => {
    try {
      const res = await fetch('/api/regiones')
      const data = await res.json()
      setRegiones(data)
      
      const initialValues: Record<string, EditValues> = {}
      data.forEach((r: Region) => {
        r.aulas.forEach((a: Aula) => {
          initialValues[a.id] = {
            preinscripcion: a.preinscripcion ? a.preinscripcion.toString() : '',
            inscripcion: a.inscripcion ? a.inscripcion.toString() : '',
            gastosAdministrativos: a.gastosAdministrativos ? a.gastosAdministrativos.toString() : '',
            limpieza: a.limpieza ? a.limpieza.toString() : '',
            vigilancia: a.vigilancia ? a.vigilancia.toString() : '',
            aporteCoordinacion: a.aporteCoordinacion ? a.aporteCoordinacion.toString() : ''
          }
        })
      })
      setEditValues(initialValues)
      
      const searchParams = new URLSearchParams(window.location.search)
      const rId = searchParams.get('regionId')
      if (rId) {
        setExpandedRegion(rId)
      }
    } catch (e) {
      console.error('Error fetching regiones', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegiones()
  }, [])

  const handleChange = (aulaId: string, field: keyof EditValues, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [aulaId]: {
        ...prev[aulaId],
        [field]: value.replace(/^0+(?=\d)/, '')
      }
    }))
  }

  const handleSave = async (aula: Aula) => {
    setSavingId(aula.id)
    try {
      const vals = editValues[aula.id]
      const payload = {
        nombre: aula.nombre,
        coordinador: aula.coordinador,
        enlace: aula.enlace,
        costo: aula.costo,
        preinscripcion: parseFloat(vals.preinscripcion) || 0,
        inscripcion: parseFloat(vals.inscripcion) || 0,
        gastosAdministrativos: parseFloat(vals.gastosAdministrativos) || 0,
        limpieza: parseFloat(vals.limpieza) || 0,
        vigilancia: parseFloat(vals.vigilancia) || 0,
        aporteCoordinacion: parseFloat(vals.aporteCoordinacion) || 0,
        viatico: aula.viatico,
        regionId: aula.regionId
      }

      const res = await fetch(`/api/aulas/${aula.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setSavedId(aula.id)
        setTimeout(() => setSavedId(null), 2000)
        
        setRegiones(prev => prev.map(r => ({
          ...r,
          aulas: r.aulas.map(a => a.id === aula.id ? { 
            ...a, 
            preinscripcion: payload.preinscripcion,
            inscripcion: payload.inscripcion,
            gastosAdministrativos: payload.gastosAdministrativos,
            limpieza: payload.limpieza,
            vigilancia: payload.vigilancia,
            aporteCoordinacion: payload.aporteCoordinacion
          } : a)
        })))
      }
    } catch (e) {
      console.error('Error saving', e)
    } finally {
      setSavingId(null)
    }
  }

  const renderInput = (aula: Aula, label: string, field: keyof EditValues) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', color: '#4a5568', fontWeight: 600 }}>{label}</label>
      <div className="input-with-icon" style={{ position: 'relative', width: '90px' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#718096', fontWeight: 600 }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-input"
          style={{ paddingLeft: '24px', height: '34px', fontSize: '13px' }}
          value={editValues[aula.id]?.[field] ?? ''}
          onChange={(e) => handleChange(aula.id, field, e.target.value)}
          placeholder="Ingrese una cantidad"
        />
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link href="/estructura-costos" className="btn-icon" style={{ padding: '4px' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} color="#2d6bc4" /> Costos por Aulas Territoriales
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px', marginLeft: '34px' }}>
          Establezca los costos predeterminados de preinscripción, inscripción, limpieza, etc. por cada Aula Territorial.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>Cargando...</div>
        ) : regiones.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <MapPin size={48} />
              <p style={{ marginTop: '12px', fontWeight: 600 }}>No hay regiones registradas</p>
            </div>
          </div>
        ) : regiones.map(r => (
          <div key={r.id} className="card">
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', background: expandedRegion === r.id ? '#f8fafc' : 'transparent' }}
              onClick={() => setExpandedRegion(expandedRegion === r.id ? null : r.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {expandedRegion === r.id ? <ChevronDown size={18} color="#2d6bc4" /> : <ChevronRight size={18} color="#718096" />}
                <div style={{ width: '36px', height: '36px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} color="#2d6bc4" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a3a6b' }}>{r.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>{r.aulas.length} aula(s) territorial(es)</div>
                </div>
              </div>
            </div>

            {expandedRegion === r.id && (
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {r.aulas.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '13px' }}>Sin aulas en esta región.</div>
                ) : r.aulas.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 16px 68px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '180px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a3a6b' }}>{a.nombre}</div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                      {renderInput(a, 'Preinscripción', 'preinscripcion')}
                      {renderInput(a, 'Inscripción', 'inscripcion')}
                      {renderInput(a, 'Uso Aula', 'gastosAdministrativos')}
                      {renderInput(a, 'Limpieza', 'limpieza')}
                      {renderInput(a, 'Vigilancia', 'vigilancia')}
                      {renderInput(a, 'Aporte Coord.', 'aporteCoordinacion')}
                      
                      <div style={{ marginLeft: '12px', marginTop: '18px' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ 
                            height: '34px', 
                            padding: '0 16px', 
                            minWidth: '110px', 
                            background: savedId === a.id ? '#10b981' : undefined,
                            borderColor: savedId === a.id ? '#10b981' : undefined
                          }}
                          onClick={() => handleSave(a)}
                          disabled={savingId === a.id}
                        >
                          {savingId === a.id ? (
                            'Guardando...'
                          ) : savedId === a.id ? (
                            <><Check size={16} /> Guardado</>
                          ) : (
                            <><Save size={16} /> Actualizar</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
