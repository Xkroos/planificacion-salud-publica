'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Loader2, ArrowLeft, Search, MapPin, Building, Calendar, ChevronRight } from 'lucide-react'
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegionId, setSelectedRegionId] = useState('')
  const [selectedAulaId, setSelectedAulaId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, croRes] = await Promise.all([
          fetch('/sistema/api/regiones'),
          fetch('/sistema/api/cronograma')
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

  // Filtered Options
  const filteredCronogramas = useMemo(() => {
    return cronogramas.filter(c => {
      // Region filter
      if (selectedRegionId) {
        const region = regiones.find(r => r.id === selectedRegionId);
        if (region && !region.aulas.some(a => a.id === c.aulaTerritorial?.id)) {
          return false;
        }
      }
      
      // Aula filter
      if (selectedAulaId && c.aulaTerritorial?.id !== selectedAulaId) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const aulaNombre = c.aulaTerritorial?.nombre?.toLowerCase() || '';
        const seccion = c.seccion?.toLowerCase() || '';
        const periodoStr = `${c.periodo?.anio}-${c.periodo?.numero}`;
        const trimestre = c.trimestre?.toLowerCase() || '';
        
        if (!aulaNombre.includes(term) && !seccion.includes(term) && !periodoStr.includes(term) && !trimestre.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [cronogramas, regiones, selectedRegionId, selectedAulaId, searchTerm])

  const selectedRegion = useMemo(() => regiones.find(r => r.id === selectedRegionId), [regiones, selectedRegionId])
  const aulasForRegion = selectedRegion ? selectedRegion.aulas : regiones.flatMap(r => r.aulas)

  // Group filtered cronogramas by Region to display them nicely
  const groupedCronogramas = useMemo(() => {
    const groups: { [regionName: string]: Cronograma[] } = {};
    
    filteredCronogramas.forEach(c => {
      const region = regiones.find(r => r.aulas.some(a => a.id === c.aulaTerritorial?.id));
      const regionName = region ? region.nombre : 'Sin Región';
      if (!groups[regionName]) {
        groups[regionName] = [];
      }
      groups[regionName].push(c);
    });

    // Sort groups alphabetically
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredCronogramas, regiones]);

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
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748', marginBottom: '16px' }}>Búsqueda y Filtros</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <label className="form-label">Buscar cronograma</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 'y-0 left-0', display: 'flex', alignItems: 'center', paddingLeft: '12px', pointerEvents: 'none', height: '100%' }}>
                <Search size={16} color="#a0aec0" />
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. San Juan, Sección 2..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#4a5568" /> Región
            </label>
            <select
              className="form-input"
              value={selectedRegionId}
              onChange={(e) => {
                setSelectedRegionId(e.target.value)
                setSelectedAulaId('') // Reset aula when region changes
              }}
            >
              <option value="">Todas las regiones</option>
              {regiones.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Aula Territorial Filter */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} color="#4a5568" /> Aula Territorial
            </label>
            <select
              className="form-input"
              value={selectedAulaId}
              onChange={(e) => setSelectedAulaId(e.target.value)}
              disabled={aulasForRegion.length === 0}
            >
              <option value="">Todas las aulas</option>
              {aulasForRegion.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2d3748' }}>
            Resultados ({filteredCronogramas.length})
          </h2>
        </div>

        {filteredCronogramas.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Search size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>No se encontraron cronogramas</p>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Intenta ajustar los filtros o el término de búsqueda</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {groupedCronogramas.map(([regionName, cronos]) => (
              <div key={regionName}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  {regionName}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                  {cronos.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => handleCronogramaChange(c.id)}
                      style={{ 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '16px', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3182ce';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(49, 130, 206, 0.1), 0 2px 4px -1px rgba(49, 130, 206, 0.06)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#2d3748', lineHeight: '1.4' }}>
                            {c.aulaTerritorial?.nombre}
                          </h4>
                          <span style={{ backgroundColor: '#ebf8ff', color: '#3182ce', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                            Sección {c.seccion}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#718096', fontSize: '13px' }}>
                          <Calendar size={14} />
                          <span>Período {c.periodo?.anio}-{c.periodo?.numero} ({c.trimestre})</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#3182ce', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                          Seleccionar <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
