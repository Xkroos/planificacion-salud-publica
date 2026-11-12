import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/bitacora'
import {
  ejecutarImportacionParticipantes,
  FilaValidada
} from '@/lib/services/importacionParticipantes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({
          error: 'El proceso de inscripción de participantes está cerrado'
        }, { status: 403 })
      }
    }

    const body = await req.json()
    const filasValidas: FilaValidada[] = body.filas || []

    if (filasValidas.length === 0) {
      return NextResponse.json({
        error: 'No se enviaron filas válidas para importar'
      }, { status: 400 })
    }

    const usuario = session.user.name || session.user.email || 'Sistema'
    const resultado = await ejecutarImportacionParticipantes(filasValidas, usuario)

    await logAction(
      'PARTICIPANTES',
      'IMPORTACION_MASIVA',
      `Se importaron exitosamente ${resultado.totalInsertados} participantes desde Excel (${resultado.totalFallos} fallidos)`
    )

    return NextResponse.json({
      success: true,
      mensaje: `Se importaron ${resultado.totalInsertados} participantes exitosamente.`,
      resultado
    })
  } catch (error: any) {
    console.error('Error al ejecutar importación de participantes:', error)
    return NextResponse.json({
      error: error?.message || 'Error interno al guardar los registros en la base de datos'
    }, { status: 500 })
  }
}

