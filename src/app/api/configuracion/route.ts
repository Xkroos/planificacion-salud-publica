import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    let config = await prisma.configuracionSistema.findFirst({
      orderBy: { updatedAt: 'asc' }
    })
    if (!config) {
      config = await prisma.configuracionSistema.create({
        data: {
          registroDocentesAbierto: false,
          asignacionCargaAbierta: false,
          inscripcionParticipantesAbierta: false,
          coordinadorNacional: null,
          resolucion: null,
        },
      })
    }
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    let config = await prisma.configuracionSistema.findFirst({
      orderBy: { updatedAt: 'asc' }
    })

    if (!config) {
      config = await prisma.configuracionSistema.create({
        data: {
          registroDocentesAbierto: body.registroDocentesAbierto ?? false,
          asignacionCargaAbierta: body.asignacionCargaAbierta ?? false,
          inscripcionParticipantesAbierta: body.inscripcionParticipantesAbierta ?? false,
          coordinadorNacional: body.coordinadorNacional || null,
          resolucion: body.resolucion || null,
        },
      })
    } else {
      config = await prisma.configuracionSistema.update({
        where: { id: config.id },
        data: {
          registroDocentesAbierto: body.registroDocentesAbierto !== undefined ? body.registroDocentesAbierto : config.registroDocentesAbierto,
          asignacionCargaAbierta: body.asignacionCargaAbierta !== undefined ? body.asignacionCargaAbierta : config.asignacionCargaAbierta,
          inscripcionParticipantesAbierta: body.inscripcionParticipantesAbierta !== undefined ? body.inscripcionParticipantesAbierta : config.inscripcionParticipantesAbierta,
          coordinadorNacional: body.coordinadorNacional !== undefined ? body.coordinadorNacional : config.coordinadorNacional,
          resolucion: body.resolucion !== undefined ? (body.resolucion || null) : config.resolucion,
        },
      })
    }

    return NextResponse.json(config)
  } catch (e) {
    console.error('Error al actualizar configuración:', e)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
