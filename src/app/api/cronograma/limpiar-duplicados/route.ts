import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 1. Identificar y unificar Aulas Territoriales con el mismo nombre y regionId
    const aulas = await prisma.aulaTerritorial.findMany({
      include: {
        region: true,
        _count: {
          select: { cronogramas: true, participantes: true, docentesOrigen: true }
        }
      }
    })

    const aulasPorRegionYNombre = new Map<string, typeof aulas>()
    for (const a of aulas) {
      const key = `${a.regionId}__${a.nombre.trim().toUpperCase()}`
      if (!aulasPorRegionYNombre.has(key)) {
        aulasPorRegionYNombre.set(key, [])
      }
      aulasPorRegionYNombre.get(key)!.push(a)
    }

    let sedesFusionadas = 0
    for (const [, grupo] of aulasPorRegionYNombre.entries()) {
      if (grupo.length > 1) {
        grupo.sort((a, b) => {
          const totalA = a._count.cronogramas + a._count.participantes + a._count.docentesOrigen
          const totalB = b._count.cronogramas + b._count.participantes + b._count.docentesOrigen
          return totalB - totalA
        })

        const principal = grupo[0]
        const duplicadas = grupo.slice(1)

        for (const dup of duplicadas) {
          await prisma.cronograma.updateMany({
            where: { aulaTerritorialId: dup.id },
            data: { aulaTerritorialId: principal.id }
          })
          await prisma.participante.updateMany({
            where: { aulaTerritorialId: dup.id },
            data: { aulaTerritorialId: principal.id }
          })
          await prisma.docente.updateMany({
            where: { aulaOrigenId: dup.id },
            data: { aulaOrigenId: principal.id }
          })
          await prisma.aulaTerritorial.delete({ where: { id: dup.id } })
          sedesFusionadas++
        }
      }
    }

    // 2. Identificar y limpiar cronogramas duplicados
    const cronogramas = await prisma.cronograma.findMany({
      include: {
        asignaciones: {
          include: { fechas: true }
        },
        participantes: true,
        aulaTerritorial: { include: { region: true } },
        periodo: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const cronsMap = new Map<string, typeof cronogramas>()
    for (const c of cronogramas) {
      const aulaKey = c.aulaTerritorialId || 'sin-aula'
      const trimKey = (c.trimestre || '').trim().toUpperCase()
      const secKey = (c.seccion || '').trim()
      const key = `${c.periodoId}__${aulaKey}__${trimKey}__${secKey}`
      if (!cronsMap.has(key)) {
        cronsMap.set(key, [])
      }
      cronsMap.get(key)!.push(c)
    }

    let cronogramasEliminados = 0
    const detalles: string[] = []

    for (const [, grupo] of cronsMap.entries()) {
      if (grupo.length > 1) {
        grupo.sort((a, b) => {
          const docA = a.asignaciones.filter(as => as.docenteId).length
          const docB = b.asignaciones.filter(as => as.docenteId).length
          if (docA !== docB) return docB - docA

          const partA = a.participantes.length
          const partB = b.participantes.length
          if (partA !== partB) return partB - partA

          const matA = a.asignaciones.length
          const matB = b.asignaciones.length
          if (matA !== matB) return matB - matA

          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        const principal = grupo[0]
        const duplicados = grupo.slice(1)

        for (const dup of duplicados) {
          // Migrar participantes no duplicados
          for (const rel of dup.participantes) {
            const yaExiste = principal.participantes.some(p => p.participanteId === rel.participanteId)
            if (!yaExiste) {
              await prisma.cronogramaParticipante.create({
                data: {
                  cronogramaId: principal.id,
                  participanteId: rel.participanteId
                }
              }).catch(() => {})
            }
          }

          // Migrar docentes asignados
          for (const asDup of dup.asignaciones) {
            if (asDup.docenteId) {
              const asPrin = principal.asignaciones.find(ap => ap.unidadId === asDup.unidadId)
              if (asPrin && !asPrin.docenteId) {
                await prisma.asignacionDocente.update({
                  where: { id: asPrin.id },
                  data: { docenteId: asDup.docenteId }
                }).catch(() => {})
              }
            }
          }

          await prisma.cronograma.delete({ where: { id: dup.id } })
          cronogramasEliminados++
          detalles.push(`${dup.aulaTerritorial?.nombre || 'Sede'} T${dup.trimestre} S${dup.seccion}`)
        }
      }
    }

    if (cronogramasEliminados > 0 || sedesFusionadas > 0) {
      await logAction('CRONOGRAMAS', 'ELIMINAR', `Limpieza de duplicados: ${cronogramasEliminados} cronogramas eliminados, ${sedesFusionadas} sedes unificadas.`)
    }

    return NextResponse.json({
      success: true,
      cronogramasEliminados,
      sedesFusionadas,
      detalles
    })
  } catch (error: any) {
    console.error('Error al limpiar duplicados:', error)
    return NextResponse.json({ error: error.message || 'Error al limpiar duplicados' }, { status: 500 })
  }
}
