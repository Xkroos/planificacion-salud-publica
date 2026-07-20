import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cronograma = await prisma.cronograma.findUnique({
      where: { id },
      include: {
        periodo: true,
        aulaTerritorial: { include: { region: true } },
        asignaciones: {
          include: {
            docente: { include: { region: true } },
            unidad: true,
            fechas: { orderBy: { fecha: 'asc' } },
          },
          orderBy: { horaInicio: 'asc' },
        },
        participantes: {
          include: { participante: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!cronograma) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    
    const session = await auth()
    const config = await prisma.configuracionSistema.findFirst()
    
    return NextResponse.json({
      ...cronograma,
      _meta: {
        userRole: session?.user?.role || 'OPERADOR',
        asignacionCargaAbierta: config?.asignacionCargaAbierta || false,
        inscripcionParticipantesAbierta: config?.inscripcionParticipantesAbierta || false,
        coordinadorNacional: config?.coordinadorNacional || ''
      }
    })
  } catch {
    return NextResponse.json({ error: 'Error al obtener cronograma' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: {
        periodoId: body.periodoId,
        aulaTerritorialId: body.aulaTerritorialId,
        vocero: body.vocero || null,
        telefonoVocero: body.telefonoVocero || null,
        emailVocero: body.emailVocero || null,
        participantesFem: parseInt(body.participantesFem) || 0,
        participantesMasc: parseInt(body.participantesMasc) || 0,
      },
    })
    return NextResponse.json(cronograma)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar cronograma' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id } = await params
    await prisma.cronograma.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar cronograma' }, { status: 500 })
  }
}
