import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { asignaciones, aulaCostos, resolucion } = body

    // Guardar resolución en el cronograma
    if (resolucion !== undefined) {
      await prisma.cronograma.update({
        where: { id },
        data: { resolucion: resolucion || null }
      })
    }

    if (asignaciones && Array.isArray(asignaciones)) {
      // Actualizar cada asignación
      for (const a of asignaciones) {
        if (!a.id) continue
        await prisma.asignacionDocente.update({
          where: { id: a.id },
          data: {
            hp: a.hp !== undefined ? parseFloat(a.hp) : null,
            viatico: a.viatico !== undefined ? parseFloat(a.viatico) : null,
          }
        })
      }
    }

    if (aulaCostos) {
      const cronograma = await prisma.cronograma.findUnique({
        where: { id },
        select: { aulaTerritorialId: true }
      })

      if (cronograma?.aulaTerritorialId) {
        await prisma.aulaTerritorial.update({
          where: { id: cronograma.aulaTerritorialId },
          data: {
            preinscripcion: aulaCostos.preinscripcion !== undefined ? (parseFloat(aulaCostos.preinscripcion) || 0) : undefined,
            inscripcion: aulaCostos.inscripcion !== undefined ? (parseFloat(aulaCostos.inscripcion) || 0) : undefined,
            gastosAdministrativos: aulaCostos.gastosAdministrativos !== undefined ? (parseFloat(aulaCostos.gastosAdministrativos) || 0) : undefined,
            limpieza: aulaCostos.limpieza !== undefined ? (parseFloat(aulaCostos.limpieza) || 0) : undefined,
            vigilancia: aulaCostos.vigilancia !== undefined ? (parseFloat(aulaCostos.vigilancia) || 0) : undefined,
            aporteCoordinacion: aulaCostos.aporteCoordinacion !== undefined ? (parseFloat(aulaCostos.aporteCoordinacion) || 0) : undefined,
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al actualizar costos:', error)
    return NextResponse.json({ error: 'Error al actualizar costos' }, { status: 500 })
  }
}
