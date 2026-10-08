import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const config = await prisma.configuracionSistema.findFirst()
    if (session.user.role !== 'ADMIN' && config && !config.asignacionCargaAbierta) {
      return NextResponse.json({ error: 'El período de asignación de carga académica se encuentra cerrado' }, { status: 403 })
    }

    const body = await req.json()
    const {
      periodoId,
      aulaTerritorialId,
      trimestre,
      seccion,
      modalidad,
      vocero,
      telefonoVocero,
      emailVocero,
      materiasIds,
    } = body

    if (!periodoId || !aulaTerritorialId || !trimestre || !seccion) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (Período, Sede, Trimestre o Sección)' }, { status: 400 })
    }

    const cleanPeriodoId = String(periodoId).trim()
    const cleanAulaId = String(aulaTerritorialId).trim()
    const cleanTrimestre = String(trimestre).trim()
    const cleanSeccion = String(seccion).trim()

    if (!cleanSeccion) {
      return NextResponse.json({ error: 'Debe ingresar un número de sección válido' }, { status: 400 })
    }

    if (!Array.isArray(materiasIds) || materiasIds.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos una materia para la nueva sección' }, { status: 400 })
    }

    // Verificar aula y región
    const targetAula = await prisma.aulaTerritorial.findUnique({
      where: { id: cleanAulaId },
      include: { region: true }
    })

    if (!targetAula) {
      return NextResponse.json({ error: 'Aula territorial no encontrada' }, { status: 404 })
    }

    // Verificar si ya existe un cronograma con esa misma sección
    const existingSection = await prisma.cronograma.findFirst({
      where: {
        periodoId: cleanPeriodoId,
        trimestre: cleanTrimestre,
        seccion: cleanSeccion,
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

    if (existingSection) {
      return NextResponse.json(
        { error: `Ya existe la Sección ${cleanSeccion} para la sede ${targetAula.nombre} en el Trimestre ${cleanTrimestre}. Por favor elija otro número de sección.` },
        { status: 400 }
      )
    }

    // Crear el nuevo cronograma para la sección
    const nuevoCronograma = await prisma.cronograma.create({
      data: {
        periodoId: cleanPeriodoId,
        aulaTerritorialId: cleanAulaId,
        trimestre: cleanTrimestre,
        seccion: cleanSeccion,
        modalidad: modalidad || 'PRESENCIAL',
        vocero: vocero ? String(vocero).trim() : null,
        telefonoVocero: telefonoVocero ? String(telefonoVocero).trim() : null,
        emailVocero: emailVocero ? String(emailVocero).trim() : null,
        participantesFem: 0,
        participantesMasc: 0,
      }
    })

    // Cargar las unidades curriculares seleccionadas
    const unidades = await prisma.unidadCurricular.findMany({
      where: { id: { in: materiasIds } }
    })

    let orden = 1
    for (const u of unidades) {
      await prisma.asignacionDocente.create({
        data: {
          cronogramaId: nuevoCronograma.id,
          unidadId: u.id,
          modalidad: (modalidad || 'PRESENCIAL') as any,
          horaInicio: '08:00',
          horaFin: '10:00',
          uc: u.creditos,
          cantHoras: u.horas,
          orden: orden++,
        }
      })
    }

    await logAction(
      'CRONOGRAMAS',
      'CREAR',
      `Se agregó la Sección ${cleanSeccion} en ${targetAula.nombre} (${cleanTrimestre} Trimestre) con ${unidades.length} materia(s)`
    )

    const cronogramaCreado = await prisma.cronograma.findUnique({
      where: { id: nuevoCronograma.id },
      include: {
        periodo: true,
        aulaTerritorial: { include: { region: true } },
        asignaciones: {
          include: {
            docente: true,
            unidad: true,
            fechas: { orderBy: { fecha: 'asc' } }
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: cronogramaCreado }, { status: 201 })
  } catch (error: any) {
    console.error('Error al agregar sección:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un cronograma para esta sede, trimestre y sección' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Error interno al agregar sección' }, { status: 500 })
  }
}
