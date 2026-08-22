import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

// GET /api/participantes/[id]
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const participante = await prisma.participante.findUnique({
      where: { id },
      include: {
        unidad: true,
        region: true,
        aulaTerritorial: true,
        periodo: true,
        cronogramas: {
          include: {
            cronograma: {
              include: { aulaTerritorial: true, periodo: true },
            },
          },
        },
        historial: {
          include: {
            aulaTerritorial: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!participante) return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 })
    return NextResponse.json(participante)
  } catch {
    return NextResponse.json({ error: 'Error al obtener participante' }, { status: 500 })
  }
}

// PUT /api/participantes/[id] — editar participante (admin siempre, operador si inscripción abierta)
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

    const { id } = await params
    const body = await req.json()
    const cedulaStr = typeof body.cedula === 'string' ? body.cedula.trim() : body.cedula

    // Verificar cédula única
    if (cedulaStr) {
      const existente = await prisma.participante.findFirst({ where: { cedula: cedulaStr, NOT: { id } } })
      if (existente) return NextResponse.json({ error: 'ya la cedula se encuentra registrada en el sistema' }, { status: 409 })
    }

    // Verificar email único
    if (body.email) {
      const emailExistente = await prisma.participante.findFirst({ where: { email: body.email.trim(), NOT: { id } } })
      if (emailExistente) return NextResponse.json({ error: 'correo registrado en el sistema' }, { status: 409 })
    }

    // Verificar teléfono único
    if (body.telefono) {
      const tlfExistente = await prisma.participante.findFirst({ where: { telefono: body.telefono.trim(), NOT: { id } } })
      if (tlfExistente) return NextResponse.json({ error: 'numero de telefono registrado en el sistema' }, { status: 409 })
    }

    // Force rebuild
    const participante = await prisma.participante.update({
      where: { id },
      data: {
        nombre: typeof body.nombre === 'string' ? body.nombre.trim() : body.nombre,
        apellido: typeof body.apellido === 'string' ? body.apellido.trim() : body.apellido,
        cedula: typeof body.cedula === 'string' ? body.cedula.trim() : body.cedula,
        telefono: body.telefono || null,
        email: body.email || null,
        genero: body.genero,
        trimestre: body.trimestre || null,
        seccion: body.seccion || null,
        ...(body.unidadId ? { unidad: { connect: { id: body.unidadId } } } : {}),
        ...(body.periodoId ? { periodo: { connect: { id: body.periodoId } } } : {}),
        ...(body.regionId ? { region: { connect: { id: body.regionId } } } : {}),
        ...(body.aulaTerritorialId ? { aulaTerritorial: { connect: { id: body.aulaTerritorialId } } } : {}),
      },
      include: { unidad: true },
    })

    await logAction('PARTICIPANTES', 'ACTUALIZAR', `Se actualizó el participante ${participante.nombre} ${participante.apellido || ''} (CI: ${participante.cedula})`)

    return NextResponse.json(participante)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar participante' }, { status: 500 })
  }
}

// DELETE /api/participantes/[id] — eliminar participante (admin siempre, operador si inscripción abierta)
export async function DELETE(
  _: NextRequest,
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
    const { id } = await params

    const p = await prisma.participante.findUnique({ where: { id } })
    if (p) {
      await logAction('PARTICIPANTES', 'ELIMINAR', `Se eliminó el participante ${p.nombre} ${p.apellido || ''} (CI: ${p.cedula})`)
    }

    await prisma.participante.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar participante' }, { status: 500 })
  }
}
