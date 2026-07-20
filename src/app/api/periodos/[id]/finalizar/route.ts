import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await props.params
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const periodo = await prisma.periodo.update({
      where: { id },
      data: { estado: 'CERRADO' },
    })

    return NextResponse.json(periodo)
  } catch (error: any) {
    console.error('Error finalizar periodo:', error)
    return NextResponse.json({ error: 'Error al finalizar el periodo' }, { status: 500 })
  }
}
