import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(secciones)
  } catch (e: any) {
    console.error('Error fetching secciones:', e)
    return NextResponse.json({ error: 'Error al obtener secciones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    if (!body.nombre) return NextResponse.json({ error: 'El nombre de la sección es obligatorio' }, { status: 400 })

    const existe = await prisma.seccion.findUnique({ where: { nombre: body.nombre.trim() } })
    if (existe) return NextResponse.json({ error: 'La sección ya existe' }, { status: 409 })

    const seccion = await prisma.seccion.create({
      data: { nombre: body.nombre.trim() },
    })
    return NextResponse.json(seccion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear sección' }, { status: 500 })
  }
}
