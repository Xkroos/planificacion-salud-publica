import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Solo el administrador puede modificar datos de docentes' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const docente = await prisma.docente.update({
      where: { id },
      data: {
        nombre: body.nombre.toUpperCase(),
        cedula: body.cedula,
        contacto: body.contacto || null,
        email: body.email || null,
        numeroCuenta: body.numeroCuenta || null,
        categoria: body.categoria,
        dedicacion: body.dedicacion,
        aulaOrigen: body.aulaOrigenId ? { connect: { id: body.aulaOrigenId } } : { disconnect: true },
        region: body.regionId ? { connect: { id: body.regionId } } : { disconnect: true },
        activo: body.activo !== undefined ? Boolean(body.activo) : true,
      },
    })
    return NextResponse.json(docente)
  } catch (error) {
    console.error('Error in PUT /api/docentes/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar docente' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.role === 'OPERADOR') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar docentes' }, { status: 403 })
    }

    const { id } = await params
    await prisma.docente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar docente' }, { status: 500 })
  }
}
