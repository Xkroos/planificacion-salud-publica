import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const periodos = await prisma.periodo.findMany({
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
      include: {
        _count: { select: { cronogramas: true } },
      },
    })
    return NextResponse.json(periodos)
  } catch {
    return NextResponse.json({ error: 'Error al obtener periodos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const activeCount = await prisma.periodo.count({ where: { estado: 'ACTIVO' } })
    if (activeCount > 0) {
      return NextResponse.json({ error: 'No se puede crear un nuevo periodo mientras exista uno activo. Debe finalizar el periodo actual primero.' }, { status: 400 })
    }

    const body = await req.json()
    const periodo = await prisma.periodo.create({
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
    return NextResponse.json(periodo, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un periodo con ese año y número' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear periodo' }, { status: 500 })
  }
}
