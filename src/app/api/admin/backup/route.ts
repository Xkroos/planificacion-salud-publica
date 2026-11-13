import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/bitacora'

export const dynamic = 'force-dynamic'

// Orden topológico de las tablas del sistema para una restauración limpia
const TABLE_ORDER = [
  '_prisma_migrations',
  'configuracion_sistema',
  'usuarios',
  'regiones',
  'aulas_territoriales',
  'periodos',
  'unidades_curriculares',
  'secciones',
  'docentes',
  'participantes',
  'inscripciones_periodo',
  'cronogramas',
  'asignaciones_docente',
  'fechas_encuentro',
  'cronograma_participantes',
  'asistencias',
  'participante_historial',
  'bitacora',
]

function escapeSqlString(val: string): string {
  // Escapar comillas simples duplicándolas y manejar saltos de línea con E'...' si contiene backslash
  if (val.includes('\\') || val.includes('\n') || val.includes('\r')) {
    const escaped = val
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
    return `E'${escaped}'`
  }
  return `'${val.replace(/'/g, "''")}'`
}

function formatSqlValue(val: any, udtName?: string): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number' || typeof val === 'bigint') return String(val)
  if (val instanceof Date) return `'${val.toISOString()}'`

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return `'{}'`
    }
    const items = val.map((item) => {
      if (item === null || item === undefined) return 'NULL'
      return escapeSqlString(String(item))
    })
    return `ARRAY[${items.join(', ')}]`
  }

  if (typeof val === 'object') {
    return `${escapeSqlString(JSON.stringify(val))}::jsonb`
  }

  return escapeSqlString(String(val))
}

export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el Administrador puede descargar respaldos de la base de datos.' },
        { status: 403 }
      )
    }

    // 1. Obtener todas las tablas existentes en el esquema public
    const existingTablesRaw = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `)

    const existingSet = new Set(existingTablesRaw.map((t) => t.table_name))
    const orderedTables: string[] = []

    for (const t of TABLE_ORDER) {
      if (existingSet.has(t)) {
        orderedTables.push(t)
        existingSet.delete(t)
      }
    }
    // Agregar cualquier tabla adicional no listada explícitamente
    for (const remaining of existingSet) {
      orderedTables.push(remaining)
    }

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fechaArchivo = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`
    const fileName = `respaldo_unerg_${fechaArchivo}.sql`

    const lines: string[] = []
    lines.push('-- ============================================================================')
    lines.push('-- RESPALDO COMPLETO DE BASE DE DATOS - SISTEMA UNERG POSTGRADO (SALUD PÚBLICA)')
    lines.push(`-- Fecha de generación : ${now.toISOString()}`)
    lines.push(`-- Generado por        : ${session.user.name || 'Administrador'} (${session.user.email || 'ADMIN'})`)
    lines.push(`-- Total de tablas     : ${orderedTables.length}`)
    lines.push('-- ============================================================================')
    lines.push('')
    lines.push('BEGIN;')
    lines.push('SET client_encoding = \'UTF8\';')
    lines.push('SET standard_conforming_strings = on;')
    lines.push('-- Desactivar temporalmente triggers/FKs durante la carga del respaldo')
    lines.push("SET session_replication_role = 'replica';")
    lines.push('')

    let totalRegistros = 0

    for (const tableName of orderedTables) {
      // Obtener columnas de la tabla
      const colsMeta = await prisma.$queryRawUnsafe<{ column_name: string; udt_name: string }[]>(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position ASC`,
        tableName
      )

      if (colsMeta.length === 0) continue

      const rows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
        `SELECT * FROM "${tableName}"`
      )

      lines.push(`-- ----------------------------------------------------------------------------`)
      lines.push(`-- Tabla: "${tableName}" (${rows.length} registros)`)
      lines.push(`-- ----------------------------------------------------------------------------`)

      if (rows.length === 0) {
        lines.push('')
        continue
      }

      totalRegistros += rows.length
      const colNamesSql = colsMeta.map((c) => `"${c.column_name}"`).join(', ')

      // Agrupar en bloques de 100 filas por INSERT para que el archivo sea compacto y rápido al restaurar
      const batchSize = 100
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const valuesList = batch.map((row) => {
          const vals = colsMeta.map((c) => formatSqlValue(row[c.column_name], c.udt_name))
          return `  (${vals.join(', ')})`
        })

        lines.push(`INSERT INTO "${tableName}" (${colNamesSql}) VALUES`)
        lines.push(`${valuesList.join(',\n')}`)
        lines.push('ON CONFLICT DO NOTHING;')
        lines.push('')
      }
    }

    lines.push("SET session_replication_role = 'origin';")
    lines.push('COMMIT;')
    lines.push('')
    lines.push(`-- Fin del respaldo (${totalRegistros} registros exportados exitosamente)`)

    await logAction(
      'SISTEMA',
      'RESPALDO_BD',
      `Se descargó respaldo completo de la base de datos (${fileName} — ${totalRegistros} registros en ${orderedTables.length} tablas)`
    )

    const sqlContent = lines.join('\n')

    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Error al generar respaldo SQL:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno al generar el respaldo de la base de datos' },
      { status: 500 }
    )
  }
}

