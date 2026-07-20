'use client'

import Link from 'next/link'
import { CheckSquare, ClipboardList } from 'lucide-react'

export default function AsistenciaIndexPage() {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckSquare size={24} color="#2d6bc4" /> Control de Asistencia
        </h1>
        <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
          Para registrar asistencia, selecciona un cronograma primero
        </p>
      </div>
      <div className="card">
        <div className="empty-state" style={{ padding: '60px' }}>
          <CheckSquare size={48} />
          <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '16px' }}>Selecciona un cronograma</p>
          <p style={{ fontSize: '13px', marginTop: '4px', color: '#718096' }}>
            Ve a la lista de cronogramas, abre uno y haz clic en &quot;Asistencia&quot;
          </p>
          <Link href="/cronograma" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
            <ClipboardList size={16} /> Ver Cronogramas
          </Link>
        </div>
      </div>
    </div>
  )
}
