import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const nombre = searchParams.get('nombre') || ''
    const unidadId = searchParams.get('unidadId') || ''
    const genero = searchParams.get('genero') || ''
    const trimestre = searchParams.get('trimestre') || ''

    const where: any = {}
    if (nombre) {
      where.OR = [
        { nombre: { contains: nombre, mode: 'insensitive' } },
        { apellido: { contains: nombre, mode: 'insensitive' } },
        { cedula: { contains: nombre, mode: 'insensitive' } }
      ]
    }
    if (unidadId) where.unidadId = unidadId
    if (genero) where.genero = genero
    if (trimestre) where.trimestre = trimestre

    // Total filtered count
    const total = await prisma.participante.count({ where })

    // Gender breakdown
    const genderStats = await prisma.participante.groupBy({
      by: ['genero'],
      where,
      _count: { _all: true }
    })
    const femenino = genderStats.find(s => s.genero === 'FEMENINO')?._count._all || 0
    const masculino = genderStats.find(s => s.genero === 'MASCULINO')?._count._all || 0

    // Periods breakdown
    const periodStatsData = await prisma.participante.groupBy({
      by: ['periodoId'],
      where,
      _count: { _all: true }
    })

    // Fetch actual periods to get the names
    const periodos = await prisma.periodo.findMany({
      where: { id: { in: periodStatsData.map(p => p.periodoId).filter(Boolean) as string[] } }
    })

    const periodStats = periodStatsData.map(ps => {
      if (!ps.periodoId) return { label: 'Sin periodo', count: ps._count._all, id: null, activo: false }
      const p = periodos.find(per => per.id === ps.periodoId)
      return {
        label: p ? `${p.anio}-${p.numero}` : 'Desconocido',
        count: ps._count._all,
        id: ps.periodoId,
        activo: p?.estado === 'ACTIVO'
      }
    }).sort((a, b) => b.label.localeCompare(a.label)) // Sort descending

    return NextResponse.json({
      total,
      femenino,
      masculino,
      periodStats
    })
  } catch (error: any) {
    console.error("GET /api/participantes/stats error:", error)
    return NextResponse.json({ error: 'Error al obtener estadisticas', details: error?.message }, { status: 500 })
  }
}
