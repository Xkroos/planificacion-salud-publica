'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Periodo = { id: string; anio: number; numero: number; trimestre: string }
type Region = { id: string; nombre: string; aulas: Aula[] }
type Aula = { id: string; nombre: string; coordinador: string; }
type Cronograma = {
  id: string; trimestre: string; seccion: string;
  aulaTerritorial: Aula;
  periodo: Periodo;
}

export default function FinanzasSelectorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [regiones, setRegiones] = useState<Region[]>([])
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, croRes] = await Promise.all([
          fetch('/api/regiones'),
          fetch('/api/cronograma')
        ])
        if (regRes.ok) setRegiones(await regRes.json())
        if (croRes.ok) setCronogramas(await croRes.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleCronogramaChange = (id: string) => {
    if (id) {
      router.push(`/cronograma/${id}/costos`)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} className="spin" style={{ color: '#2d6bc4' }} />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link href="/estructura-costos" className="btn-icon" style={{ padding: '4px' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calculator size={24} color="#2d6bc4" /> Seleccionar Cronograma (Costos)
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px', marginLeft: '34px' }}>
          Seleccione el cronograma que desea gestionar para ser redirigido al módulo de costos detallados.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <label className="form-label">Seleccionar Cronograma / Sección</label>
        <select 
          className="form-input" 
          defaultValue=""
          onChange={e => handleCronogramaChange(e.target.value)}
        >
          <option value="">-- Seleccione un cronograma --</option>
          {regiones.map(region => (
            <optgroup key={region.id} label={region.nombre}>
              {region.aulas.map(aula => {
                const cronos = cronogramas.filter(c => c.aulaTerritorial?.id === aula.id)
                if (cronos.length === 0) return null
                return cronos.map(c => (
                  <option key={c.id} value={c.id}>
                    {aula.nombre} - Sección {c.seccion} ({c.periodo?.anio}-{c.periodo?.numero} | {c.trimestre})
                  </option>
                ))
              })}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  )
}
