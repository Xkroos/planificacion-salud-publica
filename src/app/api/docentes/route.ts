import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

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

    const activePeriodo = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
    if (!activePeriodo) {
      return NextResponse.json({ error: 'No hay un periodo académico activo' }, { status: 403 })
    }

    const body = await req.json()

    if (body.cedula) {
      const existente = await prisma.docente.findFirst({ where: { cedula: body.cedula } })
      if (existente) return NextResponse.json({ error: 'ya la cedula se encuentra registrada en el sistema' }, { status: 409 })
    }

    if (body.email) {
      const emailExistente = await prisma.docente.findFirst({ where: { email: body.email.trim() } })
      if (emailExistente) return NextResponse.json({ error: 'correo registrado en el sistema' }, { status: 409 })
    }

    if (body.contacto) {
      const tlfExistente = await prisma.docente.findFirst({ where: { contacto: body.contacto.trim() } })
      if (tlfExistente) return NextResponse.json({ error: 'numero de telefono registrado en el sistema' }, { status: 409 })
    }

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

    await logAction('DOCENTES', 'CREAR', `Se registró el docente ${docente.nombre} (CI: ${docente.cedula})`)

    return NextResponse.json(docente, { status: 201 })
  } catch (error: any) {
    console.error(error)
    if (error.code === 'P2002') {
      let campo = 'campo'
      const target = error.meta?.target
      if (Array.isArray(target)) {
        campo = target[0]
      } else if (typeof target === 'string') {
        if (target.includes('cedula')) campo = 'cedula'
        else if (target.includes('email')) campo = 'email'
        else campo = target
      }
      return NextResponse.json({ error: `Ya existe un docente registrado con este dato: ${campo.toUpperCase()}` }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Error al crear docente' }, { status: 500 })
  }
}
