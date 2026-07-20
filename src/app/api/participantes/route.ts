import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/participantes?nombre=&cedula=&unidadId=&genero=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const nombre = searchParams.get('nombre') || ''
    const cedula = searchParams.get('cedula') || ''
    const unidadId = searchParams.get('unidadId') || ''
    const genero = searchParams.get('genero') || ''
    const trimestre = searchParams.get('trimestre') || ''
    const regionId = searchParams.get('regionId') || ''
    const aulaTerritorialId = searchParams.get('aulaTerritorialId') || ''
    const periodoId = searchParams.get('periodoId') || ''

    const where: any = {}
    if (nombre) {
      where.OR = [
        { nombre: { contains: nombre, mode: 'insensitive' } },
        { apellido: { contains: nombre, mode: 'insensitive' } },
        { cedula: { contains: nombre, mode: 'insensitive' } }
      ]
    }
    if (cedula) where.cedula = { contains: cedula }
    if (unidadId) where.unidadId = unidadId
    if (genero) where.genero = genero
    if (trimestre) where.trimestre = trimestre
    if (regionId && regionId !== 'undefined') where.regionId = regionId
    if (aulaTerritorialId && aulaTerritorialId !== 'undefined') where.aulaTerritorialId = aulaTerritorialId
    if (periodoId && periodoId !== 'undefined') {
      where.periodoId = periodoId
    }
    // Sin filtro de periodoId → mostrar TODOS los participantes de todos los periodos


    const participantes = await prisma.participante.findMany({
      where,
      include: {
        unidad: true,
        periodo: true,
        cronogramas: {
          include: {
            cronograma: {
              include: {
                aulaTerritorial: true,
                periodo: true,
              },
            },
          },
        },
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    })
    return NextResponse.json(participantes)
  } catch (error: any) {
    console.error("GET /api/participantes error:", error)
    return NextResponse.json({ error: 'Error al obtener participantes', details: error?.message }, { status: 500 })
  }
}

// POST /api/participantes — registrar nuevo participante
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Solo admin puede registrar cuando el proceso está cerrado
    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso de inscripción de participantes está cerrado' }, { status: 403 })
      }
    }

    const body = await req.json()

    const nombreStr = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const apellidoStr = typeof body.apellido === 'string' ? body.apellido.trim() : ''
    const cedulaStr = typeof body.cedula === 'string' ? body.cedula.trim() : ''

    // Validar campos obligatorios
    if (!nombreStr || !apellidoStr || !cedulaStr || !body.genero) {
      return NextResponse.json({ error: 'Nombre, apellido, cédula y género son obligatorios' }, { status: 400 })
    }

    // Verificar cédula única
    if (cedulaStr) {
      const existente = await prisma.participante.findFirst({ where: { cedula: cedulaStr } })
      if (existente) {
        return NextResponse.json({ error: 'La cédula ya existe en el sistema' }, { status: 409 })
      }
    }

    // Verificar email único
    if (body.email) {
      const emailExistente = await prisma.participante.findFirst({ where: { email: body.email.trim() } })
      if (emailExistente) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado en el sistema' }, { status: 409 })
      }
    }

    // Verificar teléfono único
    if (body.telefono) {
      const tlfExistente = await prisma.participante.findFirst({ where: { telefono: body.telefono.trim() } })
      if (tlfExistente) {
        return NextResponse.json({ error: 'El número de teléfono ya está registrado en el sistema' }, { status: 409 })
      }
    }

    // Force rebuild
    const participante = await prisma.participante.create({
      data: {
        nombre: nombreStr,
        apellido: apellidoStr,
        cedula: cedulaStr,
        telefono: body.telefono || null,
        email: body.email || null,
        genero: body.genero,
        trimestre: body.trimestre || null,
        seccion: body.seccion || null,
        ...(body.unidadId ? { unidad: { connect: { id: body.unidadId } } } : {}),
        ...(body.periodoId ? { periodo: { connect: { id: body.periodoId } } } : {}),
        ...(body.regionId ? { region: { connect: { id: body.regionId } } } : {}),
        ...(body.aulaTerritorialId ? { aulaTerritorial: { connect: { id: body.aulaTerritorialId } } } : {}),
      },
      include: { unidad: true },
    })
    return NextResponse.json(participante, { status: 201 })
  } catch (error: any) {
    console.error("Error POST participante:", error);
    return NextResponse.json({ error: 'Error al crear participante', details: error?.message, stack: error?.stack }, { status: 500 })
  }
}
