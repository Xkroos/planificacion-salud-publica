import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseHoraTo24 } from '@/lib/utils'

// Asignaciones de docente
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (session.user.role === 'OPERADOR') {
      // Permitimos la creación de la asignación
    }

    const body = await req.json()

    // Calcular viático automáticamente según el aulaOrigen
    let viatico = 0;
    if (body.docenteId && body.cronogramaId) {
      const cronograma = await prisma.cronograma.findUnique({
        where: { id: body.cronogramaId },
        include: { aulaTerritorial: true }
      });
      const docente = await prisma.docente.findUnique({
        where: { id: body.docenteId }
      });
      
      if (cronograma?.aulaTerritorialId && docente?.aulaOrigenId) {
        if (cronograma.aulaTerritorialId !== docente.aulaOrigenId) {
          viatico = cronograma.aulaTerritorial?.viatico || 0;
        }
      }
    }

    // Validar choque de horarios
    if (body.docenteId && body.fechas && body.fechas.length > 0 && body.horaInicio && body.horaFin) {
      const { checkDocenteAvailability } = await import('@/lib/validations');
      const horaInicioStr = parseHoraTo24(body.horaInicio) || '08:00';
      const horaFinStr = parseHoraTo24(body.horaFin) || '10:00';
      
      const availability = await checkDocenteAvailability(
        body.docenteId,
        body.fechas,
        horaInicioStr,
        horaFinStr
      );

      if (!availability.isAvailable) {
        return NextResponse.json({ error: availability.message });
      }
    }

    const asignacion = await prisma.asignacionDocente.create({
      data: {
        cronogramaId: body.cronogramaId,
        docenteId: body.docenteId,
        unidadId: body.unidadId,
        viatico: viatico, // Asignar viático calculado
        lugar: body.lugar || null,
        horaInicio: parseHoraTo24(body.horaInicio) || '08:00',
        horaFin: parseHoraTo24(body.horaFin) || '10:00',
        modalidad: body.modalidad,
        uc: parseInt(body.uc),
        cantHoras: parseInt(body.cantHoras),
        orden: parseInt(body.orden) || 0,
        fechas: {
          create: (body.fechas || []).map((f: string) => ({
            fecha: new Date(f.includes('T') ? f : `${f}T12:00:00Z`),
            modalidad: body.modalidad,
          })),
        },
      },
      include: {
        docente: true,
        unidad: true,
        fechas: { orderBy: { fecha: 'asc' } },
      },
    })
    return NextResponse.json(asignacion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear asignación' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { updates } = body // Array of { id, viatico, hp }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    const results = await prisma.$transaction(
      updates.map((u: any) => 
        prisma.asignacionDocente.update({
          where: { id: u.id },
          data: {
            viatico: u.viatico !== undefined ? parseFloat(u.viatico) : undefined,
            hp: u.hp !== undefined ? parseFloat(u.hp) : undefined,
          }
        })
      )
    )

    return NextResponse.json({ success: true, updated: results.length })
  } catch (e) {
    console.error('Error actualizando asignaciones:', e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
