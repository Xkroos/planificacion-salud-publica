import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso de inscripción de participantes está cerrado' }, { status: 403 })
      }
    }

    const { id: cronogramaId } = await params
    const body = await req.json()
    const { participantesFem, participantesMasc } = body

    const cronograma = await prisma.cronograma.update({
      where: { id: cronogramaId },
      data: {
        participantesFem: parseInt(participantesFem) || 0,
        participantesMasc: parseInt(participantesMasc) || 0,
      }
    })

    return NextResponse.json(cronograma)
  } catch (error: any) {
    console.error("Error al actualizar cantidad simple:", error)
    return NextResponse.json({ error: 'Error al actualizar cantidad simple' }, { status: 500 })
  }
}
