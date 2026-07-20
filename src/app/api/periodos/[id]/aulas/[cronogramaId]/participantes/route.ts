import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/periodos/[id]/aulas/[cronogramaId]/participantes
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const { cronogramaId } = await params
    const relaciones = await prisma.cronogramaParticipante.findMany({
      where: { cronogramaId },
      include: {
        participante: { include: { unidad: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(relaciones)
  } catch {
    return NextResponse.json({ error: 'Error al obtener participantes' }, { status: 500 })
  }
}

// POST /api/periodos/[id]/aulas/[cronogramaId]/participantes — asignar participante a sección
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar que inscripción esté abierta (operadores) o sea admin
    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso de inscripción de participantes está cerrado' }, { status: 403 })
      }
    }

    const { cronogramaId } = await params
    const body = await req.json()
    const participanteId = body.participanteId

    // Verificar que el participante no esté ya inscrito en la misma unidad curricular
    // dentro de cualquier cronograma del mismo período
    if (body.unidadId) {
      const cronograma = await prisma.cronograma.findUnique({
        where: { id: cronogramaId },
        select: { periodoId: true },
      })

      if (cronograma) {
        const yaInscritoEnUnidad = await prisma.cronogramaParticipante.findFirst({
          where: {
            participanteId,
            cronograma: {
              periodoId: cronograma.periodoId,
            },
            participante: {
              unidadId: body.unidadId,
            },
          },
        })

        if (yaInscritoEnUnidad) {
          return NextResponse.json(
            { error: 'Este participante ya está inscrito en esta unidad curricular en el período actual' },
            { status: 409 }
          )
        }
      }
    }

    // Verificar que no esté ya en esta sección específica
    const yaEnSeccion = await prisma.cronogramaParticipante.findFirst({
      where: { cronogramaId, participanteId },
    })
    if (yaEnSeccion) {
      return NextResponse.json({ error: 'El participante ya está asignado a esta sección' }, { status: 409 })
    }

    const relacion = await prisma.cronogramaParticipante.create({
      data: { cronogramaId, participanteId },
      include: { participante: { include: { unidad: true } } },
    })
    return NextResponse.json(relacion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al asignar participante' }, { status: 500 })
  }
}
