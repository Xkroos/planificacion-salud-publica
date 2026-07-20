import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const docentes = await prisma.docente.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { asignaciones: true } },
        aulaOrigen: { include: { region: true } },
        region: true,
      },
    })
    return NextResponse.json(docentes)
  } catch {
    return NextResponse.json({ error: 'Error al obtener docentes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.registroDocentesAbierto) {
        return NextResponse.json({ error: 'El registro de docentes está cerrado actualmente' }, { status: 403 })
      }
    }

    const body = await req.json()
    const docente = await prisma.docente.create({
      data: {
        nombre: body.nombre.toUpperCase(),
        cedula: body.cedula,
        contacto: body.contacto || null,
        email: body.email || null,
        numeroCuenta: body.numeroCuenta || null,
        categoria: body.categoria,
        dedicacion: body.dedicacion,
        aulaOrigen: body.aulaOrigenId ? { connect: { id: body.aulaOrigenId } } : undefined,
        region: body.regionId ? { connect: { id: body.regionId } } : undefined,
        activo: body.activo !== undefined ? Boolean(body.activo) : true,
      },
    })
    return NextResponse.json(docente, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error al crear docente' }, { status: 500 })
  }
}
