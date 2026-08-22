'use client'

import Link from 'next/link'
import { MapPin, ArrowLeft, Users, Home } from 'lucide-react'

export default function ViaticosHub() {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link href="/estructura-costos" className="btn-icon" style={{ padding: '4px' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={24} color="#2d6bc4" /> Asignación de Viáticos
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px', marginLeft: '34px' }}>
          Seleccione el tipo de viático que desea asignar a las Aulas Territoriales.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>

        {/* Card 1: Viáticos de Zona */}
        <Link href="/estructura-costos/viaticos/zona" style={{ textDecoration: 'none' }}>
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
              <Users size={32} color="#2d6bc4" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a3a6b', marginBottom: '8px' }}>Asignar viáticos a Docentes de Zona</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
              Viáticos para docentes del mismo estado del aula territorial (ej. Caracas, Distrito Capital).
            </p>
          </div>
        </Link>

        {/* Card 2: Viáticos Sede */}
        <Link href="/estructura-costos/viaticos/sede" style={{ textDecoration: 'none' }}>
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
              <Home size={32} color="#2d6bc4" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a3a6b', marginBottom: '8px' }}>Asignar viáticos a Los docentes Sede san juan de los Morros </h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
              Establezca las tarifas y montos de viáticos asignados a docentes que viajan desde la sede central.
            </p>
          </div>
        </Link>

      </div>
    </div>
  )
}
