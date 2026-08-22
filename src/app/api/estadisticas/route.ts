import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const periodoId = searchParams.get('periodoId') || undefined
    const regionId = searchParams.get('regionId') || undefined
    const aulaTerritorialId = searchParams.get('aulaTerritorialId') || undefined

    // 1. Participantes
    const participantesWhere: any = {}
    if (periodoId) participantesWhere.periodoId = periodoId
    if (regionId) participantesWhere.regionId = regionId
    if (aulaTerritorialId) participantesWhere.aulaTerritorialId = aulaTerritorialId

    const totalParticipantes = await prisma.participante.count({ where: participantesWhere })

    const participantesGeneroRaw = await prisma.participante.groupBy({
      by: ['genero'],
      where: participantesWhere,
      _count: true,
    })
    const participantesPorGenero = participantesGeneroRaw.map(g => ({
      name: g.genero,
      value: g._count
    }))

    const participantesTrimestreRaw = await prisma.participante.groupBy({
      by: ['trimestre'],
      where: participantesWhere,
      _count: true,
    })
    const participantesPorTrimestre = participantesTrimestreRaw
      .filter(t => t.trimestre)
      .map(t => ({
        name: t.trimestre === 'Introductorio' ? 'Introductorio' : `Trimestre ${t.trimestre}`,
        value: t._count
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // 2. Cronogramas
    const cronogramasWhere: any = {}
    if (periodoId) cronogramasWhere.periodoId = periodoId
    if (aulaTerritorialId) cronogramasWhere.aulaTerritorialId = aulaTerritorialId
    else if (regionId) cronogramasWhere.aulaTerritorial = { regionId }

    const totalCronogramas = await prisma.cronograma.count({ where: cronogramasWhere })

    const cronogramasModalidadRaw = await prisma.cronograma.groupBy({
      by: ['modalidad'],
      where: cronogramasWhere,
      _count: true,
    })
    const cronogramasPorModalidad = cronogramasModalidadRaw.map(c => ({
      name: c.modalidad,
      value: c._count
    }))

    // 3. Docentes
    const docentesWhere: any = {}
    if (regionId) docentesWhere.regionId = regionId
    if (aulaTerritorialId) docentesWhere.aulaOrigenId = aulaTerritorialId

    const totalDocentes = await prisma.docente.count({ where: docentesWhere })

    const docentesCategoriaRaw = await prisma.docente.groupBy({
      by: ['categoria'],
      where: docentesWhere,
      _count: true,
    })
    const docentesPorCategoria = docentesCategoriaRaw.map(d => ({
      name: d.categoria,
      value: d._count
    }))

    const docentesDedicacionRaw = await prisma.docente.groupBy({
      by: ['dedicacion'],
      where: docentesWhere,
      _count: true,
    })
    const docentesPorDedicacion = docentesDedicacionRaw.map(d => ({
      name: d.dedicacion,
      value: d._count
    }))

    // 4. Aulas y Regiones
    const aulasWhere: any = {}
    if (regionId) aulasWhere.regionId = regionId

    const totalAulas = await prisma.aulaTerritorial.count({ where: aulasWhere })
    const totalRegiones = await prisma.region.count()

    return NextResponse.json({
      totales: {
        participantes: totalParticipantes,
        docentes: totalDocentes,
        cronogramas: totalCronogramas,
        aulas: totalAulas,
        regiones: totalRegiones
      },
      graficos: {
        participantesPorGenero,
        participantesPorTrimestre,
        cronogramasPorModalidad,
        docentesPorCategoria,
        docentesPorDedicacion
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
