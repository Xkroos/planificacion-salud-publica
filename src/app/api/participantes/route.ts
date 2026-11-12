import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

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
    const soloActivos = searchParams.get('soloActivos') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const normalizar = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()

    const where: any = {}
    const andConditions: any[] = []

    if (nombre) {
      andConditions.push({
        OR: [
          { nombre: { contains: nombre, mode: 'insensitive' } },
          { apellido: { contains: nombre, mode: 'insensitive' } },
          { cedula: { contains: nombre, mode: 'insensitive' } }
        ]
      })
    }
    if (cedula) where.cedula = { contains: cedula }
    if (unidadId) where.unidadId = unidadId
    if (genero) where.genero = genero
    if (trimestre) where.trimestre = trimestre

    // Filtro por Estado (Región) y Aula Territorial (tolerante a tildes pero estricto a dicho estado y aula)
    if (aulaTerritorialId && aulaTerritorialId !== 'undefined') {
      const aulaTarget = await prisma.aulaTerritorial.findUnique({
        where: { id: aulaTerritorialId },
        include: { region: true }
      })

      if (aulaTarget) {
        const normAula = normalizar(aulaTarget.nombre)
        const normRegion = normalizar(aulaTarget.region.nombre)

        const todasRegiones = await prisma.region.findMany({ include: { aulas: true } })
        const regionesCoincidentes = todasRegiones.filter(r => normalizar(r.nombre) === normRegion)
        const regionIdsValidos = regionesCoincidentes.map(r => r.id)

        const aulaIdsValidos: string[] = [aulaTarget.id]
        for (const r of regionesCoincidentes) {
          for (const a of r.aulas) {
            if (normalizar(a.nombre) === normAula && !aulaIdsValidos.includes(a.id)) {
              aulaIdsValidos.push(a.id)
            }
          }
        }

        andConditions.push({
          aulaTerritorialId: { in: aulaIdsValidos }
        })
        if (regionIdsValidos.length > 0) {
          andConditions.push({
            OR: [
              { regionId: { in: regionIdsValidos } },
              { aulaTerritorial: { regionId: { in: regionIdsValidos } } }
            ]
          })
        }
      } else {
        where.aulaTerritorialId = aulaTerritorialId
        if (regionId && regionId !== 'undefined') where.regionId = regionId
      }
    } else if (regionId && regionId !== 'undefined') {
      const regTarget = await prisma.region.findUnique({ where: { id: regionId } })
      if (regTarget) {
        const normRegion = normalizar(regTarget.nombre)
        const todasRegiones = await prisma.region.findMany()
        const regionIdsValidos = todasRegiones
          .filter(r => normalizar(r.nombre) === normRegion)
          .map(r => r.id)
        andConditions.push({
          OR: [
            { regionId: { in: regionIdsValidos } },
            { aulaTerritorial: { regionId: { in: regionIdsValidos } } }
          ]
        })
      } else {
        where.regionId = regionId
      }
    }

    // Filtrar solo estudiantes activos (excluir graduados/finalizados o retirados)
    if (soloActivos) {
      andConditions.push({
        OR: [
          { trimestre: null },
          {
            NOT: {
              trimestre: {
                in: ['FINALIZADO', 'Finalizado', 'finalizado', 'RETIRADO', 'Retirado', 'retirado']
              }
            }
          }
        ]
      })
    }

    if (periodoId && periodoId !== 'undefined' && periodoId !== 'TODOS' && periodoId !== 'ACTUAL') {
      where.periodoId = periodoId
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }
    // Sin filtro de periodoId → mostrar TODOS los participantes de todos los periodos


    const total = await prisma.participante.count({ where })

    const participantes = await prisma.participante.findMany({
      where,
      include: {
        unidad: true,
        periodo: true,
        region: true,
        aulaTerritorial: true,
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
      skip,
      take: limit,
    })

    return NextResponse.json({
      data: participantes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
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

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso de inscripción de participantes está cerrado' }, { status: 403 })
      }
      // El operador requiere un periodo activo
      const activePeriodo = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
      if (!activePeriodo) {
        return NextResponse.json({ error: 'No hay un periodo académico activo' }, { status: 403 })
      }
    }
    // El ADMIN puede registrar participantes en cualquier momento (incluso en periodos cerrados)

    const body = await req.json()

    const nombreStr = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const apellidoStr = typeof body.apellido === 'string' ? body.apellido.trim() : ''
    const cedulaStr = typeof body.cedula === 'string' ? body.cedula.trim().replace(/^[VEJvej]-?\s*/, '') : ''
    const telefonoStr = typeof body.telefono === 'string' ? body.telefono.trim() : ''
    const emailStr = typeof body.email === 'string' ? body.email.trim() : ''

    // Validar campos obligatorios
    if (!nombreStr || !apellidoStr || !cedulaStr || !body.genero) {
      return NextResponse.json({ error: 'Nombre, apellido, cédula y género son obligatorios' }, { status: 400 })
    }

    // Determinar el período destino (el enviado en el formulario o el período activo actual)
    let targetPeriodoId: string | null = body.periodoId ? String(body.periodoId).trim() : null
    if (!targetPeriodoId) {
      const activePer = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
      if (activePer) targetPeriodoId = activePer.id
    }

    const targetTrimestre = body.trimestre ? String(body.trimestre).trim() : 'Introductorio'

    // Verificar si ya existe un participante con esta cédula (con o sin prefijo V-)
    const existente = await prisma.participante.findFirst({
      where: {
        OR: [
          { cedula: cedulaStr },
          { cedula: body.cedula.trim() }
        ]
      }
    })

    let participante
    if (existente) {
      // Si ya existe en el sistema, actualizamos sus datos y período sin bloquear con error 409
      participante = await prisma.participante.update({
        where: { id: existente.id },
        data: {
          nombre: nombreStr,
          apellido: apellidoStr,
          cedula: cedulaStr,
          telefono: telefonoStr || existente.telefono || null,
          email: emailStr || existente.email || null,
          genero: body.genero,
          trimestre: targetTrimestre || existente.trimestre || 'Introductorio',
          seccion: body.seccion || existente.seccion || null,
          ...(body.unidadId ? { unidad: { connect: { id: body.unidadId } } } : {}),
          ...(targetPeriodoId ? { periodo: { connect: { id: targetPeriodoId } } } : {}),
          ...(body.regionId ? { region: { connect: { id: body.regionId } } } : {}),
          ...(body.aulaTerritorialId ? { aulaTerritorial: { connect: { id: body.aulaTerritorialId } } } : {}),
        },
        include: { unidad: true },
      })
    } else {
      participante = await prisma.participante.create({
        data: {
          nombre: nombreStr,
          apellido: apellidoStr,
          cedula: cedulaStr,
          telefono: telefonoStr || null,
          email: emailStr || null,
          genero: body.genero,
          trimestre: targetTrimestre,
          seccion: body.seccion || null,
          ...(body.unidadId ? { unidad: { connect: { id: body.unidadId } } } : {}),
          ...(targetPeriodoId ? { periodo: { connect: { id: targetPeriodoId } } } : {}),
          ...(body.regionId ? { region: { connect: { id: body.regionId } } } : {}),
          ...(body.aulaTerritorialId ? { aulaTerritorial: { connect: { id: body.aulaTerritorialId } } } : {}),
        },
        include: { unidad: true },
      })
    }

    // Registrar también en inscripciones_periodo si hay período destino
    if (targetPeriodoId) {
      try {
        await prisma.inscripcionPeriodo.upsert({
          where: {
            participanteId_periodoId: {
              participanteId: participante.id,
              periodoId: targetPeriodoId
            }
          },
          create: {
            participanteId: participante.id,
            periodoId: targetPeriodoId,
            trimestre: targetTrimestre,
            aulaTerritorialId: body.aulaTerritorialId || null,
            seccion: body.seccion || null
          },
          update: {
            trimestre: targetTrimestre,
            ...(body.aulaTerritorialId ? { aulaTerritorialId: body.aulaTerritorialId } : {})
          }
        })
      } catch (e) {
        console.warn('Aviso al sincronizar inscripcionPeriodo en POST participante:', e)
      }
    }

    await logAction('PARTICIPANTES', 'CREAR', `Se registró el participante ${participante.nombre} ${participante.apellido || ''} (CI: ${participante.cedula})`)

    return NextResponse.json(participante, { status: 201 })
  } catch (error: any) {
    console.error("Error POST participante:", error);
    return NextResponse.json({ error: 'Error al crear participante', details: error?.message || 'Error interno' }, { status: 500 })
  }
}
