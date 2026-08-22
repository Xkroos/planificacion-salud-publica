import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodoId = searchParams.get('periodoId')

    const where: any = {}
    if (periodoId && periodoId !== 'undefined') {
      where.periodoId = periodoId
    } else {
      const activePeriodo = await prisma.periodo.findFirst({ where: { estado: 'ACTIVO' } })
      if (activePeriodo) {
        where.periodoId = activePeriodo.id
      } else {
        // Si no hay periodo activo, devolvemos vacío
        return NextResponse.json([])
      }
    }

    const cronogramas = await prisma.cronograma.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        periodo: true,
        aulaTerritorial: { include: { region: true } },
        asignaciones: {
          include: {
            docente: true,
            unidad: true,
            fechas: { orderBy: { fecha: 'asc' } },
          },
          orderBy: { horaInicio: 'asc' },
        },
        _count: { select: { participantes: true } },
      },
    })
    return NextResponse.json(cronogramas)
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

    const maxSecciones = Math.max(...Object.values(materias as Record<string, number>), 0)

    const aulasSectionsRaw = await prisma.cronograma.findMany({
      where: { periodoId, aulaTerritorialId, trimestre }
    })
    
    if (aulasSectionsRaw.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un cronograma registrado para esta Aula Territorial en este Trimestre. No se puede duplicar.' }, 
        { status: 400 }
      )
    }
    const aulasSections = aulasSectionsRaw.sort((a, b) => {
      const numA = parseInt(a.seccion) || 0
      const numB = parseInt(b.seccion) || 0
      return numA - numB
    })

    const existingCount = aulasSections.length
    const needed = maxSecciones - existingCount

    if (needed > 0) {
      const allCrons = await prisma.cronograma.findMany({
        where: { periodoId, aulaTerritorialId, trimestre },
        select: { seccion: true }
      })
      
      let maxSec = 0
      for (const c of allCrons) {
        const num = parseInt(c.seccion)
        if (!isNaN(num) && num > maxSec) maxSec = num
      }

      for (let n = 1; n <= needed; n++) {
        maxSec++
        const seccion = maxSec.toString()
        const newCron = await prisma.cronograma.create({
          data: { 
            periodoId, aulaTerritorialId, trimestre, seccion,
            modalidad: modalidad || 'PRESENCIAL',
            vocero: vocero || null,
            telefonoVocero: telefonoVocero || null,
            emailVocero: emailVocero || null,
            participantesFem: parseInt(participantesFem) || 0,
            participantesMasc: parseInt(participantesMasc) || 0,
          }
        })
        aulasSections.push(newCron)
      }
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

