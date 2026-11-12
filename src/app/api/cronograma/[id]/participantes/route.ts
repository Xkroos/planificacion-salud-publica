import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { id: cronogramaId } = await params
    const body = await req.json()
    const { unidadesIds = [] } = body
    const participantesIds: string[] = body.participantesIds || (body.participanteId ? [body.participanteId] : [])

    if (participantesIds.length === 0) {
      return NextResponse.json({ error: 'No se enviaron participantes para inscribir' }, { status: 400 })
    }

    const cronograma = await prisma.cronograma.findUnique({
      where: { id: cronogramaId },
      include: {
        aulaTerritorial: {
          include: { region: true }
        }
      }
    })

    if (!cronograma) {
      return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
    }

    const normalizar = (str?: string | null) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()

    const normCronAula = normalizar(cronograma.aulaTerritorial?.nombre)
    const normCronRegion = normalizar(cronograma.aulaTerritorial?.region?.nombre)

    const resultados = []

    for (const participanteId of participantesIds) {
      const participante = await prisma.participante.findUnique({
        where: { id: participanteId },
        include: {
          region: true,
          aulaTerritorial: { include: { region: true } }
        }
      })
      if (!participante) continue

      // Validar que el participante pertenezca al mismo Estado (Región) y Aula Territorial del cronograma
      if (cronograma.aulaTerritorialId) {
        const partAulaNombre = normalizar(participante.aulaTerritorial?.nombre)
        const partRegionNombre = normalizar(
          participante.region?.nombre || participante.aulaTerritorial?.region?.nombre
        )

        const coincideAula =
          participante.aulaTerritorialId === cronograma.aulaTerritorialId ||
          (normCronAula && partAulaNombre === normCronAula)
        const coincideRegion =
          !normCronRegion ||
          participante.regionId === cronograma.aulaTerritorial?.regionId ||
          partRegionNombre === normCronRegion

        if (!coincideAula || !coincideRegion) {
          return NextResponse.json(
            {
              error: `El participante ${participante.apellido || ''} ${participante.nombre} no pertenece al estado ${cronograma.aulaTerritorial?.region?.nombre} ni al aula territorial ${cronograma.aulaTerritorial?.nombre}.`
            },
            { status: 400 }
          )
        }
      }

      const existing = await prisma.cronogramaParticipante.findUnique({
        where: { cronogramaId_participanteId: { cronogramaId, participanteId } }
      })

      // Verificar si el participante ya está inscrito en otra sección de este mismo período
      const inscritoOtraSeccion = await prisma.cronogramaParticipante.findFirst({
        where: {
          participanteId,
          cronogramaId: { not: cronogramaId },
          cronograma: {
            periodoId: cronograma.periodoId
          }
        },
        include: { cronograma: true }
      })

      if (inscritoOtraSeccion) {
        return NextResponse.json(
          {
            error: `El participante ${participante.apellido || ''} ${participante.nombre} ya se encuentra inscrito en la Sección ${inscritoOtraSeccion.cronograma.seccion} de este período.`
          },
          { status: 400 }
        )
      }

      const relacion = await prisma.cronogramaParticipante.upsert({
        where: { cronogramaId_participanteId: { cronogramaId, participanteId } },
        update: { unidadesIds },
        create: { cronogramaId, participanteId, unidadesIds },
        include: { participante: { include: { unidad: true } } }
      })

      if (!existing) {
        await prisma.cronograma.update({
          where: { id: cronogramaId },
          data: {
            participantesFem: participante.genero === 'FEMENINO' ? { increment: 1 } : undefined,
            participantesMasc: participante.genero === 'MASCULINO' ? { increment: 1 } : undefined,
          }
        })
      }
      resultados.push(relacion)
    }

    return NextResponse.json(resultados, { status: 201 })
  } catch (error: any) {
    console.error("Error al inscribir participante:", error)
    return NextResponse.json({ error: 'Error al inscribir participante' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { id: cronogramaId } = await params
    const { searchParams } = new URL(req.url)
    const participanteId = searchParams.get('participanteId')

    if (!participanteId) {
      return NextResponse.json({ error: 'participanteId es requerido' }, { status: 400 })
    }

    const existing = await prisma.cronogramaParticipante.findUnique({
      where: { cronogramaId_participanteId: { cronogramaId, participanteId } },
      include: { participante: true }
    })

    if (existing) {
      await prisma.cronogramaParticipante.delete({
        where: { cronogramaId_participanteId: { cronogramaId, participanteId } }
      })

      await prisma.cronograma.update({
        where: { id: cronogramaId },
        data: {
          participantesFem: existing.participante.genero === 'FEMENINO' ? { decrement: 1 } : undefined,
          participantesMasc: existing.participante.genero === 'MASCULINO' ? { decrement: 1 } : undefined,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al desinscribir participante:", error)
    return NextResponse.json({ error: 'Error al desinscribir participante' }, { status: 500 })
  }
}
