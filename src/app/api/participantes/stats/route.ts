import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sincronizarCohortesHistoricas } from '@/lib/services/sincronizarCohortes'

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

    // Auto-reparación rápida de cohortes históricas si seed.ts había colapsado 2025-3 y 2026-1 dentro de 2026-2
    const p2025_3Check = await prisma.periodo.findUnique({
      where: { anio_numero: { anio: 2025, numero: 3 } }
    })
    const count2025_3 = p2025_3Check
      ? await prisma.participante.count({ where: { periodoId: p2025_3Check.id } })
      : 0

    if (!p2025_3Check || count2025_3 === 0) {
      await sincronizarCohortesHistoricas(false)
    }

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

    // Consultar TODOS los períodos académicos existentes en el sistema (ordenados cronológicamente)
    const todosLosPeriodos = await prisma.periodo.findMany({
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }]
    })

    // Contar participantes que INICIARON (cohorte) en cada período académico
    const periodStats: Array<{
      id: string | null
      label: string
      anio: number
      numero: number
      count: number
      activo: boolean
    }> = await Promise.all(
      todosLosPeriodos.map(async (per) => {
        const count = await prisma.participante.count({
          where: {
            AND: [
              where,
              { periodoId: per.id }
            ]
          }
        })

        return {
          id: per.id,
          label: `${per.anio}-${per.numero}`,
          anio: per.anio,
          numero: per.numero,
          count,
          activo: per.estado === 'ACTIVO'
        }
      })
    )

    // Participantes sin período asignado (si los hubiese)
    const sinPeriodoCount = await prisma.participante.count({
      where: {
        AND: [
          where,
          { periodoId: null }
        ]
      }
    })

    if (sinPeriodoCount > 0) {
      periodStats.push({
        id: null,
        label: 'Sin período',
        anio: 0,
        numero: 0,
        count: sinPeriodoCount,
        activo: false
      })
    }

    return NextResponse.json({
      total,
      femenino,
      masculino,
      periodStats
    })
  } catch (error: any) {
    console.error('GET /api/participantes/stats error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas', details: error?.message }, { status: 500 })
  }
}
