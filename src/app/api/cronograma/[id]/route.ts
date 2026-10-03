import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

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
          orderBy: [{ orden: 'asc' }, { horaInicio: 'asc' }, { id: 'asc' }],
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
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.asignacionCargaAbierta) {
        return NextResponse.json({ error: 'El proceso está cerrado para edición por operadores' }, { status: 403 })
      }
    }

    const { id } = await params
    const body = await req.json()

    const updateData: any = {}
    if (body.seccion !== undefined) updateData.seccion = String(body.seccion).trim()
    if (body.trimestre !== undefined) updateData.trimestre = String(body.trimestre).trim()
    if (body.modalidad !== undefined) updateData.modalidad = body.modalidad
    if (body.periodoId !== undefined) updateData.periodoId = body.periodoId
    if (body.aulaTerritorialId !== undefined) updateData.aulaTerritorialId = body.aulaTerritorialId
    if (body.vocero !== undefined) updateData.vocero = body.vocero ? String(body.vocero).trim() : null
    if (body.telefonoVocero !== undefined) updateData.telefonoVocero = body.telefonoVocero ? String(body.telefonoVocero).trim() : null
    if (body.emailVocero !== undefined) updateData.emailVocero = body.emailVocero ? String(body.emailVocero).trim() : null
    if (body.resolucion !== undefined) updateData.resolucion = body.resolucion ? String(body.resolucion).trim() : null
    if (body.participantesFem !== undefined) updateData.participantesFem = parseInt(body.participantesFem) || 0
    if (body.participantesMasc !== undefined) updateData.participantesMasc = parseInt(body.participantesMasc) || 0

    const cronograma = await prisma.cronograma.update({
      where: { id },
      data: updateData,
      include: {
        periodo: true,
        aulaTerritorial: { include: { region: true } },
      }
    })

    if (Array.isArray(body.materiasIds)) {
      const asignacionesActuales = await prisma.asignacionDocente.findMany({
        where: { cronogramaId: id }
      })
      const actualesMap = new Map(asignacionesActuales.map(a => [a.unidadId, a]))
      const nuevosIds = new Set(body.materiasIds as string[])

      // Eliminar asignaciones deseleccionadas
      for (const a of asignacionesActuales) {
        if (!nuevosIds.has(a.unidadId)) {
          await prisma.asignacionDocente.delete({ where: { id: a.id } })
        }
      }

      // Agregar nuevas materias seleccionadas
      let nextOrden = asignacionesActuales.length
      for (const uId of body.materiasIds) {
        if (!actualesMap.has(uId)) {
          const u = await prisma.unidadCurricular.findUnique({ where: { id: uId } })
          if (u) {
            await prisma.asignacionDocente.create({
              data: {
                cronogramaId: id,
                unidadId: uId,
                modalidad: (body.modalidad || cronograma.modalidad || 'PRESENCIAL') as any,
                horaInicio: '08:00',
                horaFin: '10:00',
                uc: u.creditos,
                cantHoras: u.horas,
                orden: nextOrden++,
              }
            })
          }
        }
      }
    }

    await logAction('CRONOGRAMAS', 'ACTUALIZAR', `Se actualizaron datos del cronograma (ID: ${cronograma.id}, Sección: ${cronograma.seccion})`)

    return NextResponse.json(cronograma)
  } catch (error: any) {
    console.error('Error al actualizar cronograma:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un cronograma con esa misma sede, trimestre y sección en este período' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Error al actualizar cronograma' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id } = await params
    
    const cron = await prisma.cronograma.findUnique({ where: { id }, include: { aulaTerritorial: true, periodo: true } })
    if (cron) {
      await logAction('CRONOGRAMAS', 'ELIMINAR', `Se eliminó el cronograma de ${cron.aulaTerritorial?.nombre || 'Sede'} - T${cron.trimestre} S${cron.seccion}`)
    }

    await prisma.cronograma.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar cronograma' }, { status: 500 })
  }
}
