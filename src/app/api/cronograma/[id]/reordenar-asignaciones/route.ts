import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'
import { parseHoraTo24 } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.asignacionCargaAbierta) {
        return NextResponse.json({ error: 'La asignación de carga docente está cerrada' }, { status: 403 })
      }
    }

    const { id } = await params
    const body = await req.json()

    let itemsToUpdate: { id: string; orden: number }[] = []

    if (Array.isArray(body.ordenes)) {
      itemsToUpdate = body.ordenes.map((item: any, idx: number) => ({
        id: item.id,
        orden: typeof item.orden === 'number' ? item.orden : idx,
      }))
    } else if (Array.isArray(body.asignacionIds)) {
      itemsToUpdate = body.asignacionIds.map((asignId: string, idx: number) => ({
        id: asignId,
        orden: idx,
      }))
    } else {
      return NextResponse.json({ error: 'Formato inválido: se esperaba "ordenes" o "asignacionIds"' }, { status: 400 })
    }

    if (itemsToUpdate.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const cronograma = await prisma.cronograma.findUnique({
      where: { id },
      select: { id: true, seccion: true, aulaTerritorial: { select: { nombre: true } } }
    })

    // Si además solicitó reajustar los horarios automáticamente según el nuevo orden
    if (body.reajustarHorarios) {
      const baseHora = parseHoraTo24(body.horaInicioBase) || '08:00'
      let [baseH, baseM] = baseHora.split(':').map(Number)
      if (isNaN(baseH)) baseH = 8
      if (isNaN(baseM)) baseM = 0

      await prisma.$transaction(
        itemsToUpdate.map((item, idx) => {
          const startH = baseH + (idx * 2)
          const endH = startH + 2
          const sH = startH.toString().padStart(2, '0')
          const sM = baseM.toString().padStart(2, '0')
          const eH = endH.toString().padStart(2, '0')

          return prisma.asignacionDocente.update({
            where: { id: item.id },
            data: {
              orden: item.orden,
              horaInicio: `${sH}:${sM}`,
              horaFin: `${eH}:${sM}`,
            },
          })
        })
      )
    } else {
      // Solo actualiza el orden
      await prisma.$transaction(
        itemsToUpdate.map(item =>
          prisma.asignacionDocente.update({
            where: { id: item.id },
            data: { orden: item.orden },
          })
        )
      )
    }

    await logAction(
      'CRONOGRAMAS',
      'REORDENAR_ASIGNACIONES',
      `Se reordenaron ${itemsToUpdate.length} materias en Cronograma Sección ${cronograma?.seccion || id} (${cronograma?.aulaTerritorial?.nombre || ''})`
    )

    return NextResponse.json({ success: true, count: itemsToUpdate.length })
  } catch (error: any) {
    console.error('Error al reordenar asignaciones:', error)
    return NextResponse.json({ error: error.message || 'Error al reordenar asignaciones' }, { status: 500 })
  }
}
