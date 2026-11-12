import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import {
  validarLoteExcelParticipantes,
  FilaExcelRaw
} from '@/lib/services/importacionParticipantes'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    let filasRaw: FilaExcelRaw[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('archivo') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Leer el libro de Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        return NextResponse.json({ error: 'El archivo Excel no contiene hojas de cálculo' }, { status: 400 })
      }

      const sheet = workbook.Sheets[firstSheetName]
      filasRaw = XLSX.utils.sheet_to_json<FilaExcelRaw>(sheet, { defval: '' })
    } else {
      const body = await req.json()
      filasRaw = body.filas || []
    }

    if (filasRaw.length === 0) {
      return NextResponse.json({
        error: 'El archivo Excel está vacío o no contiene registros en la primera hoja'
      }, { status: 400 })
    }

    // Ejecutar validación exhaustiva
    const resultado = await validarLoteExcelParticipantes(filasRaw)

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Error al validar archivo Excel:', error)
    return NextResponse.json({
      error: error?.message || 'Error interno al procesar el archivo Excel'
    }, { status: 500 })
  }
}

