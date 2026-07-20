import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// DELETE /api/periodos/[id]/aulas/[cronogramaId]/docentes/[asignId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string; asignId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.asignacionCargaAbierta) {
        return NextResponse.json({ error: 'El proceso de asignación de carga horaria está cerrado' }, { status: 403 })
      }
    }
    const { asignId } = await params
    await prisma.asignacionDocente.delete({ where: { id: asignId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar asignación de docente' }, { status: 500 })
  }
}
