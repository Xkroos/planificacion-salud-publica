import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'
import { procesarInscripcionesNuevoPeriodo } from '@/lib/services/progresionAcademica'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso está cerrado' }, { status: 403 })
      }
    }

    const { periodoId } = await req.json()
    if (!periodoId) return NextResponse.json({ error: 'Falta periodoId' }, { status: 400 })

    const userName = session.user.name || session.user.email || 'Sistema'

    const resultado = await procesarInscripcionesNuevoPeriodo(
      periodoId,
      undefined,
      userName
    )

    await logAction(
      'PARTICIPANTES',
      'ACTUALIZAR',
      `Se procesó la progresión académica de ${resultado.totalProcesados} participantes (Promovidos: ${resultado.totalPromovidos}, Repetidores: ${resultado.totalRepetidores}) en el periodo ${resultado.periodo}`
    )

    return NextResponse.json({
      message: 'Promoción y progresión completada con éxito',
      promovidos: resultado.totalPromovidos,
      repetidores: resultado.totalRepetidores,
      total: resultado.totalProcesados,
      detalles: resultado.muestraDetalles
    })

  } catch (error: any) {
    console.error('Error promoción masiva:', error)
    return NextResponse.json({ error: error?.message || 'Error interno al realizar la promoción' }, { status: 500 })
  }
}
