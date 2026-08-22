'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, Search, RefreshCw, Calendar as CalendarIcon, User, Layers, Trash2, Edit, PlusCircle, LogIn, LogOut, Filter } from 'lucide-react'

type BitacoraRecord = {
  id: string
  usuarioId: string | null
  usuario: { nombre: string; email: string; rol: string } | null
  modulo: string
  accion: string
  detalles: string
  createdAt: string
}

export default function BitacoraPage() {
  const [logs, setLogs] = useState<BitacoraRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterModulo, setFilterModulo] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bitacora')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (accion: string) => {
    switch (accion) {
      case 'CREAR':
        return { bg: '#e6fffa', text: '#2c7a7b', icon: <PlusCircle size={14} /> }
      case 'ACTUALIZAR':
        return { bg: '#ebf8ff', text: '#2b6cb0', icon: <Edit size={14} /> }
      case 'ELIMINAR':
        return { bg: '#fff5f5', text: '#c53030', icon: <Trash2 size={14} /> }
      case 'LOGIN':
        return { bg: '#f0fff4', text: '#276749', icon: <LogIn size={14} /> }
      case 'LOGOUT':
        return { bg: '#fffaf0', text: '#c05621', icon: <LogOut size={14} /> }
      default:
        return { bg: '#edf2f7', text: '#4a5568', icon: <Layers size={14} /> }
    }
  }

  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usuario?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detalles.toLowerCase().includes(searchTerm.toLowerCase())
      
    const moduloMatch = filterModulo ? log.modulo === filterModulo : true
    
    return searchMatch && moduloMatch
  })

  // Obtener módulos únicos para el filtro
  const modulos = Array.from(new Set(logs.map(l => l.modulo)))

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="header-icon-wrapper" style={{ background: 'var(--unerg-blue)', color: 'white', padding: '10px', borderRadius: '8px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="page-title">Bitácora de Seguridad</h1>
            <p className="page-subtitle">Registro de auditoría de todas las acciones del sistema.</p>
          </div>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: '1 1 300px' }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por usuario, correo o detalles..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
            <Filter size={18} color="#718096" />
            <select 
              className="form-input" 
              style={{ width: '200px' }}
              value={filterModulo}
              onChange={(e) => setFilterModulo(e.target.value)}
            >
              <option value="">Todos los módulos</option>
              {modulos.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Cargando bitácora...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>No se encontraron registros.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const style = getActionColor(log.accion)
                  const date = new Date(log.createdAt)
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} color="#718096" />
                          <span>{date.toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: '#718096', marginLeft: '20px' }}>
                          {date.toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        {log.usuario ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={12} /> {log.usuario.nombre}
                            </div>
                            <div style={{ fontSize: '12px', color: '#718096' }}>{log.usuario.email}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>Sistema / Eliminado</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#4a5568' }}>{log.modulo}</span>
                      </td>
                      <td>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: style.bg, 
                          color: style.text, 
                          padding: '4px 8px', 
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {style.icon}
                          {log.accion}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', maxWidth: '300px' }}>
                        {log.detalles}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
