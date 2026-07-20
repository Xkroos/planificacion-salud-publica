import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// DELETE /api/periodos/[id]/aulas/[cronogramaId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar aulas del periodo' }, { status: 403 })
    }
    const { cronogramaId } = await params
    await prisma.cronograma.delete({ where: { id: cronogramaId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar aula del periodo' }, { status: 500 })
  }
}

// PUT /api/periodos/[id]/aulas/[cronogramaId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede actualizar aulas' }, { status: 403 })
    }
    const { cronogramaId } = await params
    const body = await req.json()
    const { aulaTerritorialId } = body
    
    const actualizado = await prisma.cronograma.update({
      where: { id: cronogramaId },
      data: { aulaTerritorialId: aulaTerritorialId || null }
    })
    
    return NextResponse.json(actualizado)
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Error al actualizar aula del periodo' }, { status: 500 })
  }
}
