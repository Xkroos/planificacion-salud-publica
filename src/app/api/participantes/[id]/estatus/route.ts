import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

// PATCH /api/participantes/[id]/estatus
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso esta cerrado' }, { status: 403 })
      }
    }

    const { id } = await params
    const body = await req.json()
    const { trimestreNuevo } = body

    if (!trimestreNuevo) {
      return NextResponse.json({ error: 'El nuevo trimestre es requerido' }, { status: 400 })
    }

    const participanteActual = await prisma.participante.findUnique({
      where: { id },
      select: { trimestre: true, periodoId: true, regionId: true, aulaTerritorialId: true }
    })

    if (!participanteActual) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })
    }

    const [participanteActualizado] = await prisma.$transaction([
      prisma.participante.update({
        where: { id },
        data: { trimestre: trimestreNuevo },
        include: { unidad: true }
      }),
      prisma.historialTrimestre.create({
        data: {
          participanteId: id,
          trimestreAnterior: participanteActual.trimestre,
          trimestreNuevo,
          periodoId: participanteActual.periodoId,
          regionId: participanteActual.regionId,
          aulaTerritorialId: participanteActual.aulaTerritorialId,
          cambiadoPor: session.user.name || session.user.email || 'Sistema',
        }
      })
    ])

    await logAction('PARTICIPANTES', 'ACTUALIZAR', `Se actualizó el nivel del participante ${participanteActualizado.nombre} (de ${participanteActual.trimestre || 'ninguno'} a ${trimestreNuevo})`)

    return NextResponse.json(participanteActualizado)
  } catch (error: any) {
    console.error('Error PATCH estatus participante:', error)
    return NextResponse.json({ error: 'Error interno del servidor al actualizar estatus' }, { status: 500 })
  }
}