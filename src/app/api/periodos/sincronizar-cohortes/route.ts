import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sincronizarCohortesHistoricas } from '@/lib/services/sincronizarCohortes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol ADMIN.' }, { status: 403 })
    }

    const sincronizados = await sincronizarCohortesHistoricas(true)

    return NextResponse.json({
      success: true,
      mensaje: 'Cohortes y períodos sincronizados exitosamente',
      sincronizados
    })
  } catch (error: any) {
    console.error('Error sincronizar cohortes:', error)
    return NextResponse.json({ error: error?.message || 'Error interno al sincronizar cohortes' }, { status: 500 })
  }
}
