import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'
import { CondicionAcademica } from '@prisma/client'

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
        return NextResponse.json({ error: 'El proceso está cerrado' }, { status: 403 })
      }
    }

    const { id } = await params
    const body = await req.json()
    const { trimestreNuevo, condicion, notaPromedio } = body

    if (!trimestreNuevo && !condicion) {
      return NextResponse.json({ error: 'Se requiere trimestreNuevo o condicion' }, { status: 400 })
    }

    const participanteActual = await prisma.participante.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        trimestre: true,
        periodoId: true,
        regionId: true,
        aulaTerritorialId: true
      }
    })

    if (!participanteActual) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })
    }

    const targetTrimestre = trimestreNuevo || participanteActual.trimestre || 'Introductorio'
    const targetCondicion = condicion && Object.values(CondicionAcademica).includes(condicion)
      ? (condicion as CondicionAcademica)
      : undefined

    const [participanteActualizado] = await prisma.$transaction(async (tx) => {
      // 1. Actualizar participante
      const updated = await tx.participante.update({
        where: { id },
        data: { trimestre: targetTrimestre },
        include: { unidad: true }
      })

      // 2. Si tiene periodoId, sincronizar inscripcionPeriodo
      if (participanteActual.periodoId) {
        await tx.inscripcionPeriodo.upsert({
          where: {
            participanteId_periodoId: {
              participanteId: id,
              periodoId: participanteActual.periodoId
            }
          },
          update: {
            trimestre: targetTrimestre,
            ...(targetCondicion ? { condicion: targetCondicion } : {}),
            ...(notaPromedio !== undefined ? { notaPromedio } : {}),
            aulaTerritorialId: participanteActual.aulaTerritorialId || undefined
          },
          create: {
            participanteId: id,
            periodoId: participanteActual.periodoId,
            trimestre: targetTrimestre,
            condicion: targetCondicion || CondicionAcademica.REGULAR,
            notaPromedio: notaPromedio !== undefined ? notaPromedio : undefined,
            aulaTerritorialId: participanteActual.aulaTerritorialId
          }
        })
      }

      // 3. Registrar auditoría en historialTrimestre
      await tx.historialTrimestre.create({
        data: {
          participanteId: id,
          trimestreAnterior: participanteActual.trimestre,
          trimestreNuevo: targetTrimestre,
          periodoId: participanteActual.periodoId,
          regionId: participanteActual.regionId,
          aulaTerritorialId: participanteActual.aulaTerritorialId,
          cambiadoPor: session.user.name || session.user.email || 'Sistema',
        }
      })

      return [updated]
    })

    await logAction(
      'PARTICIPANTES',
      'ACTUALIZAR',
      `Se actualizó el nivel/condición del participante ${participanteActualizado.nombre} (de ${participanteActual.trimestre || 'ninguno'} a ${targetTrimestre}${targetCondicion ? ` - Condición: ${targetCondicion}` : ''})`
    )

    return NextResponse.json(participanteActualizado)
  } catch (error: any) {
    console.error('Error PATCH estatus participante:', error)
    return NextResponse.json({ error: 'Error interno del servidor al actualizar estatus' }, { status: 500 })
  }
}
