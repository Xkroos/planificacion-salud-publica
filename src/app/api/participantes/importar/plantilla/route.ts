import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generarPlantillaExcel } from '@/lib/services/importacionParticipantes'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const buffer = generarPlantillaExcel()

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_participantes_unerg.xlsx"'
      }
    })
  } catch (error: any) {
    console.error('Error al generar plantilla Excel:', error)
    return NextResponse.json({ error: 'Error al generar la plantilla' }, { status: 500 })
  }
}
