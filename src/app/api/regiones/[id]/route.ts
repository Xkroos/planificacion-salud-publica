import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const region = await prisma.region.update({
      where: { id },
      data: { nombre: body.nombre.toUpperCase() },
    })
    return NextResponse.json(region)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar región' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.region.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar región' }, { status: 500 })
  }
}
