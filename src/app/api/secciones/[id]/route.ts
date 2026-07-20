import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { id } = await params
    await prisma.seccion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar sección' }, { status: 500 })
  }
}
