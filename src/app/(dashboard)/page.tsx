import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { LucideIcon } from 'lucide-react'
import {
  Users, Calendar, MapPin, UserCheck,
  BookOpen, ClipboardList, CheckSquare, TrendingUp, FolderArchive
} from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const activePeriod = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
  const activePeriodId = activePeriod?.id || 'none'

  const [docentes, cronogramas, unidades, regiones, participantes, aulasTotal, docentesConCarga] = await Promise.all([
    // Docentes activos registrados globalmente
    prisma.docente.count({ where: { activo: true } }),
    activePeriod ? prisma.cronograma.count({ where: { periodoId: activePeriodId } }) : Promise.resolve(0),
    prisma.unidadCurricular.count(), // Fijo siempre
    prisma.region.count(), // Fijo siempre
    activePeriod ? prisma.participante.count({ where: { periodoId: activePeriodId } }) : Promise.resolve(0),
    prisma.aulaTerritorial.count(), // Fijo siempre
    activePeriod ? prisma.docente.count({
      where: { asignaciones: { some: { cronograma: { periodoId: activePeriodId } } } }
    }) : Promise.resolve(0),
  ])

  // Aulas activas: AAT with at least one asignación in active period
  const aulasActivas = activePeriod ? await prisma.aulaTerritorial.count({
    where: {
      cronogramas: {
        some: {
          periodoId: activePeriodId,
          asignaciones: { some: {} },
        },
      },
    },
  }) : 0

  return {
    docentes,
    periodoString: activePeriod ? `${activePeriod.anio}-${activePeriod.numero}` : 'Ninguno',
    cronogramas,
    unidades,
    regiones,
    participantes,
    aulasTotal,
    aulasActivas,
    docentesConCarga,
    activePeriodId
  }
}

async function getRecentCronogramas(activePeriodId: string) {
  if (activePeriodId === 'none') return []
  return prisma.cronograma.findMany({
    take: 3,
    where: { periodoId: activePeriodId },
    orderBy: { createdAt: 'desc' },
    include: {
      periodo: true,
      aulaTerritorial: { include: { region: true } },
      asignaciones: { include: { docente: true, unidad: true } },
    },
  })
}

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getStats()
  const recientes = await getRecentCronogramas(stats.activePeriodId)

  type StatCard = { label: string; value: number | string; icon: LucideIcon; colorClass: string; href: string }
  const statCards: StatCard[] = [
    { label: 'Docentes', value: stats.docentes, icon: UserCheck, colorClass: 'blue', href: '/docentes' },
    { label: 'Docentes con Carga', value: stats.docentesConCarga, icon: CheckSquare, colorClass: 'green', href: '/docentes' },
    { label: 'Periodo Actual', value: stats.periodoString, icon: Calendar, colorClass: 'navy', href: '/periodos' },
    { label: 'Cronogramas', value: stats.cronogramas, icon: ClipboardList, colorClass: 'green', href: '/cronograma' },
    { label: 'Unidades Curriculares', value: stats.unidades, icon: BookOpen, colorClass: 'orange', href: '/unidades' },
    { label: 'Regiones', value: stats.regiones, icon: MapPin, colorClass: 'red', href: '/regiones' },
    { label: 'AATs Activas', value: stats.aulasActivas, icon: TrendingUp, colorClass: 'purple', href: '/regiones' },
    { label: 'Participantes', value: stats.participantes, icon: Users, colorClass: 'purple', href: '/cronograma' },
  ]

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a3a6b', marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          Bienvenido, <strong>{session?.user?.name}</strong>,
          Sistema de Planificación Académica de Salud Publica
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link href={card.href} key={card.label} style={{ textDecoration: 'none' }}>
              <div className="stat-card hover-lift">
                <div className={`stat-icon ${card.colorClass}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <div className="stat-value">{card.value}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Recent Cronogramas */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} color="#000000" />
              Cronogramas Recientes
            </h2>
            <Link href="/cronograma" className="btn btn-sm btn-secondary">Ver todos</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {recientes.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <ClipboardList size={40} />
                <p style={{ marginTop: '8px', fontWeight: 500 }}>
                  {stats.activePeriodId === 'none' ? 'No hay Periodo academico activo en este momento' : 'No hay cronogramas aún'}
                </p>
                {stats.activePeriodId !== 'none' && (
                  <Link href="/cronograma/nuevo" className="btn btn-primary btn-sm" style={{ marginTop: '12px', display: 'inline-flex', background: '#FFFF5C', color: '#000000' }}>
                    Crear primer cronograma
                  </Link>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Sede</th>
                    <th>Docentes</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {c.periodo.anio}-{c.periodo.numero}
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                          {c.trimestre === 'Introductorio' ? c.trimestre : `${c.trimestre}° Trimestre`} — Sección {c.seccion}
                        </div>
                      </td>
                      <td>
                        <div>{c.aulaTerritorial?.nombre || 'Sin Sede Asignada'}</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>{c.aulaTerritorial?.region?.nombre || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="badge badge-gray" style={{ width: 'fit-content' }}>
                            {new Set(c.asignaciones.filter((a: any) => a.docenteId).map((a: any) => a.docenteId)).size} docentes
                          </span>
                          <span style={{ fontSize: '11px', color: '#718096' }}>
                            {c.asignaciones.length} materias
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link href={`/cronograma/${c.id}`} className="btn btn-sm btn-ghost">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#000000" />
              Acciones Rápidas
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.activePeriodId !== 'none' ? (
              <Link href="/cronograma/nuevo" className="btn btn-primary" style={{ justifyContent: 'center', background: '#FFFF5C', color: '#000000' }}>
                <ClipboardList size={16} /> Nuevo Cronograma
              </Link>
            ) : (
              <button className="btn btn-primary" disabled style={{ justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed' }}>
                <ClipboardList size={16} /> Nuevo Cronograma
              </button>
            )}
            <Link href="/docentes" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <UserCheck size={16} /> Gestionar Docentes
            </Link>
            <Link href="/reportes" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <BookOpen size={16} /> Generar Reporte PDF
            </Link>
            <Link href="/expedientes" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <FolderArchive size={16} /> Ver Expedientes Históricos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
