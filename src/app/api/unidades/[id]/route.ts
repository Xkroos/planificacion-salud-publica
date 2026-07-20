import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const unidad = await prisma.unidadCurricular.update({
      where: { id },
      data: {
        nombre: body.nombre.toUpperCase(),
        creditos: parseInt(body.creditos),
        horas: parseInt(body.horas),
        trimestre: body.trimestre || null,
      },
    })
    return NextResponse.json(unidad)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar unidad' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.unidadCurricular.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar unidad' }, { status: 500 })
  }
}
