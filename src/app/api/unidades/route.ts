import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const unidades = await prisma.unidadCurricular.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { asignaciones: true } } },
    })
    return NextResponse.json(unidades)
  } catch {
    return NextResponse.json({ error: 'Error al obtener unidades' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const unidad = await prisma.unidadCurricular.create({
      data: {
        nombre: body.nombre.toUpperCase(),
        creditos: parseInt(body.creditos),
        horas: parseInt(body.horas),
        trimestre: body.trimestre || null,
      },
    })
    return NextResponse.json(unidad, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear unidad curricular' }, { status: 500 })
  }
}
