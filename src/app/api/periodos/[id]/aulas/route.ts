import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/periodos/[id]/aulas — lista cronogramas (aulas+secciones) del período
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cronogramas = await prisma.cronograma.findMany({
      where: { periodoId: id },
      include: {
        aulaTerritorial: { include: { region: true } },
        asignaciones: { include: { docente: true, unidad: true } },
        participantes: { include: { participante: { include: { unidad: true } } } },
      },
      orderBy: [{ seccion: 'asc' }],
    })
    return NextResponse.json(cronogramas)
  } catch {
    return NextResponse.json({ error: 'Error al obtener aulas del periodo' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede asignar aulas' }, { status: 403 })
    }

    const { id: periodoId } = await params
    const body = await req.json()
    // body expected: { aulaTerritorialId: string, trimestre: string, materias: { [unidadId: string]: number } }
    const { aulaTerritorialId, trimestre, materias } = body

    if (!aulaTerritorialId || !trimestre || !materias) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const maxSecciones = Math.max(...Object.values(materias as Record<string, number>), 0)

    // Buscar las secciones existentes para esta aula y trimestre
    const aulasSectionsRaw = await prisma.cronograma.findMany({
      where: { periodoId, aulaTerritorialId, trimestre }
    })
    
    // Ordenar por el número de la sección ascendente para saber cuál es la primera, la segunda, etc.
    const aulasSections = aulasSectionsRaw.sort((a, b) => {
      const numA = parseInt(a.seccion) || 0
      const numB = parseInt(b.seccion) || 0
      return numA - numB
    })

    const existingCount = aulasSections.length
    const needed = maxSecciones - existingCount

    if (needed > 0) {
      // Necesitamos crear `needed` secciones.
      // Obtener el número máximo de sección para esta aula y trimestre
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
          data: { periodoId, aulaTerritorialId, trimestre, seccion }
        })
        aulasSections.push(newCron) // Agregarlo a la lista para procesarlo abajo
      }
    }

    // Ahora iterar sobre aulasSections (desde 0 hasta maxSecciones - 1)
    for (let i = 0; i < maxSecciones; i++) {
      const cronograma = aulasSections[i]

      // Para cada materia en el payload
      for (const [unidadId, cantSecciones] of Object.entries(materias as Record<string, number>)) {
        if (i < cantSecciones) {
          // Asegurar que exista la asignación en este cronograma
          const existe = await prisma.asignacionDocente.findFirst({
            where: { cronogramaId: cronograma.id, unidadId }
          })
          if (!existe) {
            const unidad = await prisma.unidadCurricular.findUnique({ where: { id: unidadId } })
            if (unidad) {
              await prisma.asignacionDocente.create({
                data: {
                  cronogramaId: cronograma.id,
                  unidadId,
                  horaInicio: '08:00',
                  horaFin: '10:00',
                  modalidad: 'PRESENCIAL',
                  uc: unidad.creditos,
                  cantHoras: unidad.horas,
                }
              })
            }
          }
        } else {
          // Si el índice i >= cantSecciones, significa que esta materia NO debe estar en esta sección.
          // Borrar asignación si existe.
          await prisma.asignacionDocente.deleteMany({
            where: { cronogramaId: cronograma.id, unidadId }
          })
        }
      }
    }

    // Para las secciones existentes que superan el maxSecciones (si el usuario bajó el número)
    // eliminamos las asignaciones de las materias del payload en esas secciones.
    for (let i = maxSecciones; i < aulasSections.length; i++) {
      const cronograma = aulasSections[i]
      for (const unidadId of Object.keys(materias)) {
        await prisma.asignacionDocente.deleteMany({
           where: { cronogramaId: cronograma.id, unidadId }
        })
      }
    }

    return NextResponse.json({ success: true, cronogramasGenerados: maxSecciones }, { status: 201 })
  } catch (e: any) {
    console.error('Error en generación de secciones:', e)
    return NextResponse.json({ error: 'Error al generar secciones' }, { status: 500 })
  }
}

