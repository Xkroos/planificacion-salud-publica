'use client'

import { useState, useEffect } from 'react'
import { Settings, ToggleLeft, ToggleRight, Shield, AlertTriangle, Loader2, UserPlus, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

type Config = {
  id: string
  registroDocentesAbierto: boolean
  asignacionCargaAbierta: boolean
  inscripcionParticipantesAbierta: boolean
  coordinadorNacional?: string
}

export default function ConfiguracionPage() {
  const { data: session } = useSession()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchConfig = async () => {
    try {
      const configRes = await fetch('/api/configuracion')
      setConfig(await configRes.json())
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar la configuración' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  const toggleSetting = async (field: 'registroDocentesAbierto' | 'asignacionCargaAbierta' | 'inscripcionParticipantesAbierta') => {
    if (!config) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, [field]: !config[field] }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar')
      }
      const data = await res.json()
      setConfig(data)
      setMessage({ type: 'success', text: 'Configuración actualizada correctamente' })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: (error as Error).message || 'Error al actualizar la configuración' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} className="spin" style={{ color: '#2d6bc4' }} />
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="fade-in" style={{ padding: '24px', textAlign: 'center', color: '#dc2626' }}>
        <h2>Acceso Denegado</h2>
        <p>Solo los administradores pueden ver esta página.</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} color="#2d6bc4" /> Configuración del Sistema
        </h1>
        <p style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
          Controla los procesos de registro de docentes y asignación de cargas horarias
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
          {message.text}
        </div>
      )}

      {/* Access Warning */}
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={24} color="#b45309" />
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>Solo Administrador</div>
            <div style={{ fontSize: '13px', color: '#78350f' }}>
              Estos ajustes controlan el acceso de los operadores a los procesos del sistema.
              Solo el administrador puede modificar esta configuración.
            </div>
          </div>
        </div>
      </div>

      {/* Config Cards */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {/* Registro de Docentes */}
        <div className="card">
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: config?.registroDocentesAbierto ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s',
              }}>
                {config?.registroDocentesAbierto ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="white" />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '15px' }}>Registro de Docentes</div>
                <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                  {config?.registroDocentesAbierto
                    ? 'Los operadores pueden registrar nuevos docentes en el sistema'
                    : 'El registro de docentes está cerrado para los operadores'}
                </div>
                <span
                  className={`badge ${config?.registroDocentesAbierto ? 'badge-green' : 'badge-red'}`}
                  style={{ marginTop: '8px', display: 'inline-flex' }}
                >
                  {config?.registroDocentesAbierto ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
            </div>
            <button
              className={`btn ${config?.registroDocentesAbierto ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleSetting('registroDocentesAbierto')}
              disabled={saving}
              style={{ minWidth: '140px' }}
            >
              {saving ? 'Guardando...' : config?.registroDocentesAbierto ? 'Cerrar Proceso' : 'Abrir Proceso'}
            </button>
          </div>
        </div>

        {/* Asignación de Carga Horaria */}
        <div className="card">
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: config?.asignacionCargaAbierta ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s',
              }}>
                {config?.asignacionCargaAbierta ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="white" />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '15px' }}>Asignación de Carga Horaria</div>
                <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                  {config?.asignacionCargaAbierta
                    ? 'Los operadores pueden asignar cargas horarias a los docentes'
                    : 'La asignación de cargas horarias está cerrada para los operadores'}
                </div>
                <span
                  className={`badge ${config?.asignacionCargaAbierta ? 'badge-green' : 'badge-red'}`}
                  style={{ marginTop: '8px', display: 'inline-flex' }}
                >
                  {config?.asignacionCargaAbierta ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
            </div>
            <button
              className={`btn ${config?.asignacionCargaAbierta ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleSetting('asignacionCargaAbierta')}
              disabled={saving}
              style={{ minWidth: '140px' }}
            >
              {saving ? 'Guardando...' : config?.asignacionCargaAbierta ? 'Cerrar Proceso' : 'Abrir Proceso'}
            </button>
          </div>
        </div>

        {/* Inscripción de Participantes */}
        <div className="card">
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: config?.inscripcionParticipantesAbierta ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s',
              }}>
                {config?.inscripcionParticipantesAbierta ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="white" />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} color="#2d6bc4" />
                  Inscripción de Participantes
                </div>
                <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                  {config?.inscripcionParticipantesAbierta
                    ? 'Los operadores pueden registrar e inscribir participantes en secciones'
                    : 'El proceso de inscripción de participantes está cerrado para los operadores'}
                </div>
                <span
                  className={`badge ${config?.inscripcionParticipantesAbierta ? 'badge-green' : 'badge-red'}`}
                  style={{ marginTop: '8px', display: 'inline-flex' }}
                >
                  {config?.inscripcionParticipantesAbierta ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
            </div>
            <button
              className={`btn ${config?.inscripcionParticipantesAbierta ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleSetting('inscripcionParticipantesAbierta')}
              disabled={saving}
              style={{ minWidth: '140px' }}
            >
              {saving ? 'Guardando...' : config?.inscripcionParticipantesAbierta ? 'Cerrar Proceso' : 'Abrir Proceso'}
            </button>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="card" style={{ marginTop: '20px', background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertTriangle size={20} color="#4f46e5" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#3730a3', lineHeight: '1.6' }}>
            <strong>Nota:</strong> Cuando un proceso está cerrado, los operadores no podrán realizar esas acciones desde su panel.
            El administrador siempre mantiene acceso completo independientemente del estado de estos procesos.
            Una vez que un operador registra una carga horaria, solo el administrador podrá modificarla o eliminarla.
          </div>
        </div>
      </div>
    </div>
  )
}
