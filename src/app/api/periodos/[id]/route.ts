import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const periodo = await prisma.periodo.findUnique({
      where: { id },
      include: {
        cronogramas: {
          include: {
            aulaTerritorial: { include: { region: true } },
            asignaciones: { include: { docente: true, unidad: true } },
            participantes: { include: { participante: { include: { unidad: true } } } },
          },
          orderBy: [{ aulaTerritorialId: 'asc' }, { seccion: 'asc' }],
        },
      },
    })
    if (!periodo) return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
    return NextResponse.json(periodo)
  } catch {
    return NextResponse.json({ error: 'Error al obtener periodo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const periodo = await prisma.periodo.update({
      where: { id },
      data: {
        anio: parseInt(body.anio),
        numero: parseInt(body.numero),
        modalidad: body.modalidad,
        fechaInicioEstimada: body.fechaInicioEstimada ? new Date(body.fechaInicioEstimada) : null,
        fechaFinEstimada: body.fechaFinEstimada ? new Date(body.fechaFinEstimada) : null,
        trimestres: Array.isArray(body.trimestres) ? body.trimestres : [],
        tabulador: parseFloat(body.tabulador) || 50,
        resolucion: body.resolucion || null,
      },
    })
    return NextResponse.json(periodo)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar periodo' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { id } = await params
    
    // Check if there are cronogramas before deleting to provide a friendly error
    const count = await prisma.cronograma.count({ where: { periodoId: id } })
    if (count > 0) {
      return NextResponse.json({ error: 'No se puede eliminar el periodo porque tiene cronogramas asociados. Elimine los cronogramas primero.' }, { status: 400 })
    }

    await prisma.periodo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error al eliminar periodo:', e)
    return NextResponse.json({ error: 'Error al eliminar periodo' }, { status: 500 })
  }
}
