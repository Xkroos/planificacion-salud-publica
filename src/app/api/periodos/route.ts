import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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
