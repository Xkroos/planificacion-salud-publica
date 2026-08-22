import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const regiones = await prisma.region.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        aulas: {
          orderBy: { nombre: 'asc' },
          include: { _count: { select: { cronogramas: true } } },
        },
      },
    })
    return NextResponse.json(regiones)
  } catch {
    return NextResponse.json({ error: 'Error al obtener regiones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const region = await prisma.region.create({
      data: { nombre: body.nombre.toUpperCase() },
      include: { aulas: true },
    })
    return NextResponse.json(region, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear región' }, { status: 500 })
  }
}
