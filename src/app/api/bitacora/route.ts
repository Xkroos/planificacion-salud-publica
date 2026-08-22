import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const modulo = searchParams.get('modulo')
    const usuarioId = searchParams.get('usuarioId')

    const where: any = {}
    if (modulo) where.modulo = modulo
    if (usuarioId) where.usuarioId = usuarioId

    const bitacora = await prisma.bitacora.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nombre: true, email: true, rol: true } }
      }
    })

    return NextResponse.json(bitacora)
  } catch (error) {
    console.error('Error fetching bitacora:', error)
    return NextResponse.json({ error: 'Error al obtener bitacora' }, { status: 500 })
  }
}
