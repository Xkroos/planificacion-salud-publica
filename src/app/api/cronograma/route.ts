import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodoId = searchParams.get('periodoId')
    const search = searchParams.get('search') || ''
    const regionId = searchParams.get('regionId') || ''
    const aulaTerritorialId = searchParams.get('aulaTerritorialId') || ''
    const trimestre = searchParams.get('trimestre') || ''
    const hasPagination = searchParams.has('page') || (searchParams.has('limit') && searchParams.get('limit') !== 'all')
    const isAll = searchParams.get('all') === 'true' || searchParams.get('limit') === 'all' || !hasPagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = hasPagination ? parseInt(searchParams.get('limit') || '10') : 0
    const skip = (page - 1) * limit

    const where: any = {}
    if (periodoId && periodoId !== 'undefined') {
      where.periodoId = periodoId
    } else {
      const activePeriodo = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
      if (activePeriodo) {
        where.periodoId = activePeriodo.id
      } else {
        // Si no hay periodo activo, devolvemos respuesta vacía consistente
        return NextResponse.json({
          data: [],
          total: 0,
          page: 1,
          limit: limit || 10,
          totalPages: 0
        })
      }
    }

    if (regionId && regionId !== 'undefined') {
      where.aulaTerritorial = { regionId }
    }
    if (aulaTerritorialId && aulaTerritorialId !== 'undefined') {
      where.aulaTerritorialId = aulaTerritorialId
    }
    if (trimestre && trimestre !== 'undefined' && trimestre !== 'TODOS') {
      const romanMap: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V' }
      const arabicMap: Record<string, string> = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5' }
      const alternate = romanMap[trimestre] || arabicMap[trimestre.toUpperCase()]
      if (alternate) {
        where.trimestre = { in: [trimestre, alternate] }
      } else {
        where.trimestre = trimestre
      }
    }

    if (search) {
      where.OR = [
        { aulaTerritorial: { nombre: { contains: search, mode: 'insensitive' } } },
        { aulaTerritorial: { region: { nombre: { contains: search, mode: 'insensitive' } } } },
        { trimestre: { contains: search, mode: 'insensitive' } },
        { periodo: { anio: { equals: parseInt(search) || -1 } } },
        { periodo: { numero: { equals: parseInt(search) || -1 } } }
      ]
    }

    const total = await prisma.cronograma.count({ where })

    const cronogramas = await prisma.cronograma.findMany({
      where,
      orderBy: [
        { aulaTerritorial: { region: { nombre: 'asc' } } },
        { aulaTerritorial: { nombre: 'asc' } },
        { trimestre: 'asc' },
        { seccion: 'asc' },
      ],
      include: {
        periodo: true,
        aulaTerritorial: { include: { region: true } },
        asignaciones: {
          include: {
            docente: true,
            unidad: true,
            fechas: { orderBy: { fecha: 'asc' } },
          },
          orderBy: [{ orden: 'asc' }, { horaInicio: 'asc' }, { id: 'asc' }],
        },
        _count: { select: { participantes: true } },
      },
      ...(hasPagination && limit > 0 ? { skip, take: limit } : {}),
    })
    
    return NextResponse.json({
      data: cronogramas,
      total,
      page: hasPagination ? page : 1,
      limit: hasPagination ? limit : total,
      totalPages: hasPagination && limit > 0 ? Math.ceil(total / limit) : 1
    })
  } catch (error) {
    console.error('Error fetching cronogramas:', error)
    return NextResponse.json({ error: 'Error al obtener cronogramas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const activePeriodo = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
    if (!activePeriodo) {
      return NextResponse.json({ error: 'No hay un periodo académico activo. No se puede crear el cronograma.' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      periodoId, aulaTerritorialId, trimestre, 
      modalidad, vocero, telefonoVocero, emailVocero, 
      participantesFem, participantesMasc, materias 
    } = body

    if (!periodoId || !aulaTerritorialId || !trimestre || !materias) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const cleanPeriodoId = String(periodoId).trim()
    const cleanAulaId = String(aulaTerritorialId).trim()
    const cleanTrimestre = String(trimestre).trim()

    const maxSecciones = Math.max(...Object.values(materias as Record<string, number>), 0)
    if (maxSecciones <= 0) {
      return NextResponse.json({ error: 'Debe especificar al menos 1 sección para alguna materia' }, { status: 400 })
    }

    const targetAula = await prisma.aulaTerritorial.findUnique({
      where: { id: cleanAulaId },
      include: { region: true }
    })

    if (!targetAula) {
      return NextResponse.json({ error: 'Aula territorial no encontrada' }, { status: 404 })
    }

    // Comprobar si ya existen cronogramas para esta sede (o sedes homónimas en la misma región)
    const aulasSectionsRaw = await prisma.cronograma.findMany({
      where: { 
        periodoId: cleanPeriodoId, 
        trimestre: cleanTrimestre,
        OR: [
          { aulaTerritorialId: cleanAulaId },
          {
            aulaTerritorial: {
              regionId: targetAula.regionId,
              nombre: { equals: targetAula.nombre, mode: 'insensitive' }
            }
          }
        ]
      }
    })
    
    if (aulasSectionsRaw.length > 0) {
      return NextResponse.json(
        { error: `Ya existe un cronograma registrado para la sede ${targetAula.nombre} (${targetAula.region?.nombre || ''}) en el Trimestre ${cleanTrimestre}. No se puede duplicar.` }, 
        { status: 400 }
      )
    }

    const aulasSections: any[] = []

    for (let n = 1; n <= maxSecciones; n++) {
      const seccion = n.toString()
      const newCron = await prisma.cronograma.create({
        data: { 
          periodoId: cleanPeriodoId, 
          aulaTerritorialId: cleanAulaId, 
          trimestre: cleanTrimestre, 
          seccion,
          modalidad: modalidad || 'PRESENCIAL',
          vocero: vocero ? String(vocero).trim() : null,
          telefonoVocero: telefonoVocero ? String(telefonoVocero).trim() : null,
          emailVocero: emailVocero ? String(emailVocero).trim() : null,
          participantesFem: parseInt(participantesFem) || 0,
          participantesMasc: parseInt(participantesMasc) || 0,
        }
      })
      aulasSections.push(newCron)
    }

    // Actualizar también la información básica (modalidad, vocero, etc.) de TODAS las secciones (las nuevas y las existentes)
    for (const cron of aulasSections) {
      await prisma.cronograma.update({
        where: { id: cron.id },
        data: {
          modalidad: modalidad || 'PRESENCIAL',
          vocero: vocero || null,
          telefonoVocero: telefonoVocero || null,
          emailVocero: emailVocero || null,
          participantesFem: parseInt(participantesFem) || 0,
          participantesMasc: parseInt(participantesMasc) || 0,
        }
      })
    }

    for (let i = 0; i < maxSecciones; i++) {
      const cronograma = aulasSections[i]
      for (const [unidadId, cantSecciones] of Object.entries(materias as Record<string, number>)) {
        if (i < cantSecciones) {
          const existe = await prisma.asignacionDocente.findFirst({
            where: { cronogramaId: cronograma.id, unidadId }
          })
          if (!existe) {
            const unidad = await prisma.unidadCurricular.findUnique({ where: { id: unidadId } })
            if (unidad) {
              await prisma.asignacionDocente.create({
                data: {
                  cronogramaId: cronograma.id, unidadId,
                  horaInicio: '08:00', horaFin: '10:00', modalidad: modalidad || 'PRESENCIAL',
                  uc: unidad.creditos, cantHoras: unidad.horas,
                }
              })
            }
          }
        } else {
          await prisma.asignacionDocente.deleteMany({
            where: { cronogramaId: cronograma.id, unidadId }
          })
        }
      }
    }

    for (let i = maxSecciones; i < aulasSections.length; i++) {
      const cronograma = aulasSections[i]
      for (const unidadId of Object.keys(materias)) {
        await prisma.asignacionDocente.deleteMany({
           where: { cronogramaId: cronograma.id, unidadId }
        })
      }
    }

    const aula = await prisma.aulaTerritorial.findUnique({ where: { id: aulaTerritorialId } })
    await logAction('CRONOGRAMAS', 'CREAR', `Se generaron ${maxSecciones} cronogramas para ${aula?.nombre || 'Sede desconocida'} (${trimestre})`)

    return NextResponse.json({ success: true, cronogramasGenerados: maxSecciones }, { status: 201 })
  } catch (e: any) {
    console.error('Error en generación de secciones:', e)
    return NextResponse.json({ error: 'Error al crear cronograma' }, { status: 500 })
  }
}

