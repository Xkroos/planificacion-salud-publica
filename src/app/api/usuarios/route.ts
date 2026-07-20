import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    })
    return NextResponse.json(usuarios)
  } catch {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const hashedPassword = await bcrypt.hash(body.password, 12)
    const usuario = await prisma.usuario.create({
      data: {
        nombre: body.nombre,
        email: body.email.toLowerCase(),
        password: hashedPassword,
        rol: body.rol,
      },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    })
    return NextResponse.json(usuario, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
