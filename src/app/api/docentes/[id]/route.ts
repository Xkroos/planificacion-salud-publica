import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

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

    if (body.cedula) {
      const existente = await prisma.docente.findFirst({ where: { cedula: body.cedula, NOT: { id } } })
      if (existente) return NextResponse.json({ error: 'ya la cedula se encuentra registrada en el sistema' }, { status: 409 })

      const estudianteExistente = await prisma.participante.findFirst({ where: { cedula: body.cedula } })
      if (estudianteExistente) return NextResponse.json({ error: 'La cédula ya está registrada como un estudiante' }, { status: 409 })
    }

    if (body.email) {
      const emailExistente = await prisma.docente.findFirst({ where: { email: body.email.trim(), NOT: { id } } })
      if (emailExistente) return NextResponse.json({ error: 'correo registrado en el sistema' }, { status: 409 })
    }

    if (body.contacto) {
      const tlfExistente = await prisma.docente.findFirst({ where: { contacto: body.contacto.trim(), NOT: { id } } })
      if (tlfExistente) return NextResponse.json({ error: 'numero de telefono registrado en el sistema' }, { status: 409 })
    }

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

    await logAction('DOCENTES', 'ACTUALIZAR', `Se actualizó el docente ${docente.nombre} (CI: ${docente.cedula})`)

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
    
    const d = await prisma.docente.findUnique({ where: { id } })
    if (d) {
      await logAction('DOCENTES', 'ELIMINAR', `Se eliminó el docente ${d.nombre} (CI: ${d.cedula})`)
    }

    await prisma.docente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar docente' }, { status: 500 })
  }
}
