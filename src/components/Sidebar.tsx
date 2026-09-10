'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signOutAction } from '@/app/actions/auth'
import {
  LayoutDashboard, Users, Calendar, MapPin, UserCheck,
  BookOpen, ClipboardList, FileText, CheckSquare,
  ChevronLeft, ChevronRight, LogOut, Settings,
  GraduationCap, User, UserPlus, FolderArchive, Menu, X,
  Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldAlert,
  BarChart
} from 'lucide-react'

const baseNavItems = [
  {
    section: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/estadisticas', label: 'Estadísticas', icon: BarChart },
    ]
  },
  {
    section: 'Configuración',
    items: [
      { href: '/docentes', label: 'Docentes', icon: UserCheck },
    ]
  },
  {
    section: 'Gestión',
    items: [
      { href: '/cronograma', label: 'Cronogramas', icon: ClipboardList },
      { href: '/participantes', label: 'Participantes', icon: UserPlus },
    ]
  },
  {
    section: 'Reportes',
    items: [
      { href: '/reportes', label: 'Generar PDF', icon: FileText },
    ]
  },
  {
    section: 'Histórico',
    items: [
      { href: '/expedientes', label: 'Expedientes', icon: FolderArchive },
    ]
  }
]

const adminNavItems = [
  {
    section: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/estadisticas', label: 'Estadísticas', icon: BarChart },
    ]
  },
  {
    section: 'Configuración',
    items: [
      { href: '/regiones', label: 'Regiones y Sedes', icon: MapPin },
      { href: '/periodos', label: 'Periodos Académicos', icon: Calendar },
      { href: '/docentes', label: 'Docentes', icon: UserCheck },
      { href: '/unidades', label: 'Unidades Curriculares', icon: BookOpen },
    ]
  },
  {
    section: 'Gestión',
    items: [
      { href: '/cronograma', label: 'Cronogramas', icon: ClipboardList },
      { href: '/participantes', label: 'Participantes', icon: UserPlus },
    ]
  },
  {
    section: 'Reportes',
    items: [
      { href: '/reportes', label: 'Generar PDF', icon: FileText },
      { href: '/estructura-costos', label: 'Estructura de Costos', icon: FileText },
    ]
  },
  {
    section: 'Histórico',
    items: [
      { href: '/expedientes', label: 'Expedientes', icon: FolderArchive },
    ]
  }
]

const adminItems = [
  {
    section: 'Administración',
    items: [
      { href: '/usuarios', label: 'Usuarios', icon: Users },
      { href: '/configuracion', label: 'Configuración Sistema', icon: Settings },
      { href: '/bitacora', label: 'Bitácora de Seguridad', icon: ShieldAlert },
    ]
  },
]

// ── Modal de configuración de perfil ─────────────────────────────────────────

type Tab = 'password' | 'email'

function UserProfileModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('password')

  // Estados para cambio de contraseña
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPwActual, setShowPwActual] = useState(false)
  const [showPwNueva, setShowPwNueva] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  // Estados para cambio de email
  const [emailNuevo, setEmailNuevo] = useState('')
  const [pwParaEmail, setPwParaEmail] = useState('')
  const [showPwEmail, setShowPwEmail] = useState(false)

  // Feedback
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const clearFeedback = () => setFeedback(null)

  const handleTabChange = (t: Tab) => {
    setTab(t)
    clearFeedback()
  }

  // Cambiar contraseña
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (pwNueva.length < 6) {
      setFeedback({ type: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (pwNueva !== pwConfirm) {
      setFeedback({ type: 'error', msg: 'La nueva contraseña y su confirmación no coinciden.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/sistema/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'password', passwordActual: pwActual, passwordNueva: pwNueva }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.error || 'Error al actualizar la contraseña.' })
      } else {
        setFeedback({ type: 'success', msg: data.mensaje || 'Contraseña actualizada correctamente.' })
        setPwActual(''); setPwNueva(''); setPwConfirm('')
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Error de conexión. Intente de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  // Cambiar email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    setLoading(true)
    try {
      const res = await fetch('/sistema/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'email', passwordActual: pwParaEmail, emailNuevo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.error || 'Error al actualizar el correo.' })
      } else {
        setFeedback({ type: 'success', msg: data.mensaje || 'Correo actualizado correctamente.' })
        setEmailNuevo(''); setPwParaEmail('')
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Error de conexión. Intente de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  const strengthLevel = (pw: string) => {
    if (pw.length === 0) return null
    if (pw.length < 6) return 'weak'
    if (pw.length < 10) return 'medium'
    return 'strong'
  }
  const strengthLabel: Record<string, string> = { weak: 'Débil', medium: 'Moderada', strong: 'Segura' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="profile-modal-header">
          <div className="profile-modal-header-icon">
            <Settings size={20} color="var(--unerg-blue)" />
          </div>
          <div className="profile-modal-header-text">
            <div className="profile-modal-title">Configuración de Cuenta</div>
            <div className="profile-modal-subtitle">Actualiza tu contraseña o correo electrónico</div>
          </div>
          <button className="profile-close-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          <button
            className={`profile-tab${tab === 'password' ? ' active' : ''}`}
            onClick={() => handleTabChange('password')}
            type="button"
          >
            <Lock size={14} />
            <span>Cambiar Contraseña</span>
          </button>
          <button
            className={`profile-tab${tab === 'email' ? ' active' : ''}`}
            onClick={() => handleTabChange('email')}
            type="button"
          >
            <Mail size={14} />
            <span>Cambiar Correo</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="profile-modal-body">

          {/* Feedback */}
          {feedback && (
            <div className={`profile-feedback ${feedback.type}`}>
              {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Tab: Contraseña */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <div className="pw-field">
                  <input
                    type={showPwActual ? 'text' : 'password'}
                    className="pw-input"
                    placeholder="Ingresa tu contraseña actual"
                    value={pwActual}
                    onChange={e => setPwActual(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-eye" onClick={() => setShowPwActual(v => !v)} tabIndex={-1}>
                    {showPwActual ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <div className="pw-field">
                  <input
                    type={showPwNueva ? 'text' : 'password'}
                    className="pw-input"
                    placeholder="Mínimo 6 caracteres"
                    value={pwNueva}
                    onChange={e => setPwNueva(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="pw-eye" onClick={() => setShowPwNueva(v => !v)} tabIndex={-1}>
                    {showPwNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwNueva && (() => {
                  const lvl = strengthLevel(pwNueva)
                  return lvl ? (
                    <div className="pw-strength">
                      <div className={`pw-strength-bar ${lvl}`} />
                      <span className="pw-strength-label">{strengthLabel[lvl]}</span>
                    </div>
                  ) : null
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar nueva contraseña</label>
                <div className="pw-field">
                  <input
                    type={showPwConfirm ? 'text' : 'password'}
                    className="pw-input"
                    placeholder="Repite la nueva contraseña"
                    value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="pw-eye" onClick={() => setShowPwConfirm(v => !v)} tabIndex={-1}>
                    {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwConfirm && pwNueva !== pwConfirm && (
                  <div className="form-error" style={{ marginTop: '6px' }}>Las contraseñas no coinciden.</div>
                )}
              </div>

              <div className="profile-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          )}

          {/* Tab: Correo */}
          {tab === 'email' && (
            <form onSubmit={handleEmailSubmit} noValidate>
              <div className="profile-email-info">
                <Mail size={14} />
                <span>Se verificará tu identidad con tu contraseña actual antes de actualizar el correo.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Nuevo correo electrónico</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="nuevo@correo.com"
                  value={emailNuevo}
                  onChange={e => setEmailNuevo(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Contraseña actual &nbsp;<span style={{ color: 'var(--unerg-red)', fontWeight: 700 }}>*</span>
                </label>
                <div className="pw-field">
                  <input
                    type={showPwEmail ? 'text' : 'password'}
                    className="pw-input"
                    placeholder="Verifica tu identidad"
                    value={pwParaEmail}
                    onChange={e => setPwParaEmail(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-eye" onClick={() => setShowPwEmail(v => !v)} tabIndex={-1}>
                    {showPwEmail ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="form-hint">Requerida para confirmar el cambio de correo.</div>
              </div>

              <div className="profile-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar Correo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar principal ─────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isPendingSignOut, startSignOut] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const isAdmin = session?.user?.role === 'ADMIN'

  const allItems = isAdmin ? [...adminNavItems, ...adminItems] : baseNavItems

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Close mobile menu when route changes
  const handleItemClick = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Top Header (only visible on small screens) */}
      <div className="mobile-header">
        <div className="mobile-header-logo">
          <img src="/sistema/logo-unerg.png" alt="Logo UNERG" style={{ width: '32px', height: '32px', objectFit: 'contain', background: 'transparent', transform: 'scale(1.8)', filter: 'drop-shadow(0px 0px 2px rgba(255,255,255,0.8))' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#000000', marginLeft: '12px' }}>UNERG Postgrado</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={24} color="#000000" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile close button inside sidebar */}
        <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)}>
          <X size={20} color="white" />
        </button>
        {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ background: 'transparent', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/sistema/logo-unerg.png" alt="Logo UNERG" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.8)', filter: 'drop-shadow(0px 0px 2px rgba(255,255,255,0.8))' }} />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <h1>UNERG Postgrado</h1>
            <span>Planificación Académica</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {allItems.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="nav-section-title">{group.section}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  onClick={handleItemClick}
                >
                  <span className="nav-item-icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Botón de perfil de usuario */}
        {session && (
          <button
            className="user-profile-btn"
            onClick={() => setProfileOpen(true)}
            title={collapsed ? `${session.user?.name} — Configurar cuenta` : 'Configurar cuenta'}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <div className="user-avatar">
              <User size={16} color="black" />
            </div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{session.user?.name}</div>
                <div className="user-role">
                  {session.user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                </div>
              </div>
            )}
            {!collapsed && (
              <div className="user-settings-icon" title="Configurar cuenta">
                <Settings size={14} />
              </div>
            )}
          </button>
        )}

        <button
          onClick={() => startSignOut(() => signOutAction())}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', color: '#dc2626' }}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="nav-item-icon"><LogOut size={18} /></span>
          {!collapsed && <span style={{ fontWeight: 600 }}>Cerrar sesión</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px', justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <span className="nav-item-icon">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </span>
          {!collapsed && <span>Colapsar menú</span>}
        </button>
      </div>
    </aside>

      {/* Modal de configuración de perfil */}
      {profileOpen && <UserProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  )
}
