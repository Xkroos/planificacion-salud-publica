import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Total de participantes por trimestre
    const cronogramasConParticipantes = await prisma.cronograma.findMany({
      include: {
        periodo: true,
        aulaTerritorial: true,
        participantes: true,
        asignaciones: {
          include: { docente: true, unidad: true },
        },
      },
    })

    // AATs activas (cualquier aula con al menos una asignación)
    const aulasActivas = await prisma.aulaTerritorial.findMany({
      where: {
        cronogramas: {
          some: {
            asignaciones: { some: {} },
          },
        },
      },
      include: {
        region: true,
        cronogramas: {
          include: {
            periodo: true,
            asignaciones: { include: { docente: true, unidad: true } },
            _count: { select: { participantes: true } },
          },
        },
      },
    })

    // Total counts
    const totalDocentes = await prisma.docente.count()
    const totalParticipantes = await prisma.participante.count()
    const totalAulas = await prisma.aulaTerritorial.count()
    const totalAulasActivas = aulasActivas.length

    // Participantes por trimestre
    const participantesPorTrimestre: Record<string, number> = {}
    for (const c of cronogramasConParticipantes) {
      const key = c.trimestre === 'Introductorio'
        ? 'Introductorio'
        : `Trimestre ${c.trimestre}`
      participantesPorTrimestre[key] = (participantesPorTrimestre[key] || 0) + c.participantes.length
    }

    // Docentes con carga asignada
    const docentesConCarga = await prisma.docente.findMany({
      where: {
        asignaciones: { some: {} },
      },
      include: {
        asignaciones: {
          include: {
            unidad: true,
            cronograma: {
              include: {
                aulaTerritorial: true,
                periodo: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      resumen: {
        totalDocentes,
        totalParticipantes,
        totalAulas,
        totalAulasActivas,
        docentesConCarga: docentesConCarga.length,
      },
      participantesPorTrimestre,
      aulasActivas,
      docentesConCarga,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
