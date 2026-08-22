'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Building2, MapPin, Calculator, Hash, Save, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EstructuraCostosHub() {
  const [resolucion, setResolucion] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(d => { if (d.resolucion) setResolucion(d.resolucion) })
      .catch(() => { })
  }, [])

  const handleSaveResolucion = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolucion: resolucion || null })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      setSaved(true)
      toast.success('Resolución guardada correctamente')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Error al guardar la resolución')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} color="#2d6bc4" /> Estructura de Costo
        </h1>
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
          Seleccione el módulo de costos que desea gestionar o configurar.
        </p>
      </div>

      {/* Configuración de Resolución - sección destacada */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #2d6bc4', width: 'fit-content', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hash size={20} color="#2d6bc4" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1a3a6b', margin: 0 }}>Número de Resolución</h3>

          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: 2025-866"
            style={{ maxWidth: '280px' }}
            value={resolucion}
            onChange={e => setResolucion(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleSaveResolucion}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
          {saved && (
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>
              ✓ Resolución guardada correctamente
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Card 1: Factibilidad / PDF */}
        <Link href="/estructura-costos/factibilidad" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            height: '100%',
            textAlign: 'center',
            border: '2px solid transparent'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#dbeafe'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: '#eff6ff',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Calculator size={32} color="#2d6bc4" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a3a6b', marginBottom: '8px' }}>Generar Estructura de Costo</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
              Calcule y exporte en formato PDF la estructura de costos detallada (Factibilidad) de un cronograma.
            </p>
          </div>
        </Link>

        {/* Card 2: Costos por Aulas Territoriales */}
        <Link href="/estructura-costos/aulas" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            height: '100%',
            textAlign: 'center',
            border: '2px solid transparent'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#dbeafe'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: '#eff6ff',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Building2 size={32} color="#2d6bc4" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a3a6b', marginBottom: '8px' }}>Costos Por Aulas Territoriales</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
              Configure la preinscripción, inscripción, limpieza, vigilancia y otros gastos base por cada aula.
            </p>
          </div>
        </Link>

        {/* Card 3: Asignación de Viáticos */}
        <Link href="/estructura-costos/viaticos" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            height: '100%',
            textAlign: 'center',
            border: '2px solid transparent'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#dbeafe'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: '#eff6ff',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <MapPin size={32} color="#2d6bc4" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a3a6b', marginBottom: '8px' }}>Asignación de Viáticos</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
              Establezca las tarifas y montos de viáticos asignados a docentes por Aula Territorial.
            </p>
          </div>
        </Link>

      </div>
    </div>
  )
}
