import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/periodos/[id]/aulas/[cronogramaId]/docentes
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const { cronogramaId } = await params
    const asignaciones = await prisma.asignacionDocente.findMany({
      where: { cronogramaId },
      include: {
        docente: true,
        unidad: true,
        fechas: { orderBy: { fecha: 'asc' } },
      },
      orderBy: { horaInicio: 'asc' },
    })
    return NextResponse.json(asignaciones)
  } catch {
    return NextResponse.json({ error: 'Error al obtener docentes' }, { status: 500 })
  }
}

// POST /api/periodos/[id]/aulas/[cronogramaId]/docentes — asignar docente a sección
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.asignacionCargaAbierta) {
        return NextResponse.json({ error: 'El proceso de asignación de carga horaria está cerrado' }, { status: 403 })
      }
    }

    const { cronogramaId } = await params
    const body = await req.json()

    // Calcular viático automáticamente según el aulaOrigen
    let viatico = 0;
    if (body.docenteId && cronogramaId) {
      const cronograma = await prisma.cronograma.findUnique({
        where: { id: cronogramaId },
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

    const asignacion = await prisma.asignacionDocente.create({
      data: {
        cronogramaId,
        docenteId: body.docenteId,
        unidadId: body.unidadId,
        viatico: viatico, // Asignar viático calculado
        lugar: body.lugar || null,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        modalidad: body.modalidad,
        uc: parseInt(body.uc),
        cantHoras: parseInt(body.cantHoras),
        orden: parseInt(body.orden) || 0,
        fechas: {
          create: (body.fechas || []).map((f: string) => ({
            fecha: new Date(f),
            modalidad: body.modalidad,
          })),
        },
      },
      include: { docente: true, unidad: true },
    })
    return NextResponse.json(asignacion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al asignar docente' }, { status: 500 })
  }
}
