'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Users, Calendar, MapPin, UserCheck,
  BookOpen, ClipboardList, FileText, CheckSquare,
  ChevronLeft, ChevronRight, LogOut, Settings,
  GraduationCap, User, UserPlus, FolderArchive, Menu, X
} from 'lucide-react'

const baseNavItems = [
  {
    section: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
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
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
          <img src="/logo-unerg.png" alt="Logo UNERG" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '50%', background: 'white' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a3a6b', marginLeft: '8px' }}>UNERG Postgrado</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={24} color="#1a3a6b" />
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
        <div className="sidebar-logo-icon" style={{ background: 'white', width: '38px', height: '38px', borderRadius: '50%', padding: '2px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo-unerg.png" alt="Logo UNERG" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
        {!collapsed && session && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2d6bc4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} color="white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user?.name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  {session.user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="nav-item-icon"><LogOut size={18} /></span>
          {!collapsed && <span>Cerrar sesión</span>}
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
    </>
  )
}
