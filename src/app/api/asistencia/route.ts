import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cronogramaId = searchParams.get('cronogramaId')
    const fechaId = searchParams.get('fechaId')

    if (!cronogramaId || !fechaId) {
      return NextResponse.json({ error: 'cronogramaId y fechaId requeridos' }, { status: 400 })
    }

    const [participantes, asistencias] = await Promise.all([
      prisma.participante.findMany({
        where: { cronogramas: { some: { cronogramaId } } },
        orderBy: { nombre: 'asc' },
      }),
      prisma.asistencia.findMany({
        where: { fechaEncuentroId: fechaId },
      }),
    ])

    return NextResponse.json({ participantes, asistencias })
  } catch {
    return NextResponse.json({ error: 'Error al obtener asistencia' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // body.registros = [{ participanteId, fechaEncuentroId, estado, observacion }]
    const results = await Promise.all(
      body.registros.map((r: { participanteId: string; fechaEncuentroId: string; estado: any; observacion?: string }) =>
        prisma.asistencia.upsert({
          where: {
            participanteId_fechaEncuentroId: {
              participanteId: r.participanteId,
              fechaEncuentroId: r.fechaEncuentroId,
            },
          },
          create: {
            participanteId: r.participanteId,
            fechaEncuentroId: r.fechaEncuentroId,
            estado: r.estado,
            observacion: r.observacion || null,
          },
          update: {
            estado: r.estado,
            observacion: r.observacion || null,
          },
        })
      )
    )
    return NextResponse.json({ success: true, count: results.length })
  } catch {
    return NextResponse.json({ error: 'Error al registrar asistencia' }, { status: 500 })
  }
}
