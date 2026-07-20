import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// DELETE /api/periodos/[id]/aulas/[cronogramaId]/participantes/[relId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string; relId: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede remover participantes' }, { status: 403 })
    }
    const { relId } = await params
    // relId puede ser el participanteId (buscamos por participante + cronograma)
    const { cronogramaId } = await params
    const rel = await prisma.cronogramaParticipante.findFirst({
      where: { cronogramaId, participanteId: relId }
    })
    if (!rel) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    await prisma.cronogramaParticipante.delete({ where: { id: rel.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar participante de la sección' }, { status: 500 })
  }
}
