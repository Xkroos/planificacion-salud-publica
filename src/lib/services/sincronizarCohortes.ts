import { prisma } from '@/lib/prisma'
import { CondicionAcademica } from '@prisma/client'
import fs from 'fs'
import path from 'path'

let tablaVerificada = false

export async function asegurarTablaInscripcionesPeriodo() {
  if (tablaVerificada) return
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
          CREATE TYPE "CondicionAcademica" AS ENUM ('REGULAR', 'APROBADO', 'REPROBADO', 'RETIRADO', 'INACTIVO');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "inscripciones_periodo" (
          "id" TEXT NOT NULL,
          "participanteId" TEXT NOT NULL,
          "periodoId" TEXT NOT NULL,
          "trimestre" TEXT NOT NULL,
          "condicion" "CondicionAcademica" NOT NULL DEFAULT 'REGULAR',
          "notaPromedio" DOUBLE PRECISION,
          "aulaTerritorialId" TEXT,
          "seccion" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "inscripciones_periodo_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "inscripciones_periodo_participanteId_periodoId_key" ON "inscripciones_periodo"("participanteId", "periodoId");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "inscripciones_periodo_participanteId_trimestre_idx" ON "inscripciones_periodo"("participanteId", "trimestre");
    `)
    tablaVerificada = true
  } catch (err) {
    console.warn('Aviso al verificar tabla inscripciones_periodo:', err)
  }
}

export async function sincronizarCohortesHistoricas(incluirInscripciones = true) {
  await asegurarTablaInscripcionesPeriodo()
  // 1. Obtener o crear los períodos base
  const p2025_3 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2025, numero: 3 } },
    update: {},
    create: {
      anio: 2025,
      numero: 3,
      modalidad: 'PRESENCIAL',
      estado: 'CERRADO'
    }
  })

  const p2026_1 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 1 } },
    update: {},
    create: {
      anio: 2026,
      numero: 1,
      modalidad: 'PRESENCIAL',
      estado: 'CERRADO'
    }
  })

  const p2026_2 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 2 } },
    update: {},
    create: {
      anio: 2026,
      numero: 2,
      modalidad: 'PRESENCIAL',
      estado: 'ACTIVO'
    }
  })

  const prismaDir = path.join(process.cwd(), 'prisma')

  // 2. Extraer cédulas de 2025-3
  const cedulas2025_3: string[] = []
  const file2025_3 = path.join(prismaDir, 'participantes_lote_2025_3.json')
  if (fs.existsSync(file2025_3)) {
    const data = JSON.parse(fs.readFileSync(file2025_3, 'utf8'))
    data.forEach((p: any) => p.cedula && cedulas2025_3.push(String(p.cedula).trim()))
  }

  // 3. Extraer cédulas de 2026-1
  const cedulas2026_1: string[] = []
  ;['participantes_lote2.json', 'participantes_lote3.json', 'participantes_lote4.json'].forEach(f => {
    const fp = path.join(prismaDir, f)
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
      data.forEach((p: any) => p.cedula && cedulas2026_1.push(String(p.cedula).trim()))
    }
  })

  const excel2026_1 = [
    "30730949", "20747517", "18228317", "18229463", "28664629", "23997251", "15717545",
    "19785957", "22860489", "17242241", "17747572", "16318477", "16141395", "14188660",
    "13472297", "22786655", "17871053", "25487178", "10759337", "16963447", "26479858",
    "13258636", "22992683", "22858557", "28658698", "17901272", "13814162", "12740833",
    "26748380", "18316252", "14029167", "13752679", "20446583", "17434293", "19630453",
    "15376354", "19629603"
  ]
  cedulas2026_1.push(...excel2026_1)

  // Extraer cédulas de 2026-2
  const cedulas2026_2: string[] = []
  ;[
    'participantes_lote5_2026_2.json',
    'participantes_lote6_2026_2.json',
    'participantes_lote7_2026_2.json',
    'participantes_lote8_2026_2.json',
    'participantes_lote9_2026_2.json',
    'participantes_lote10_2026_2.json'
  ].forEach(f => {
    const fp = path.join(prismaDir, f)
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
      data.forEach((p: any) => p.cedula && cedulas2026_2.push(String(p.cedula).trim()))
    }
  })

  // 4. Asignar periodoId correcto a cada cohorte en la base de datos
  const res2025_3 = cedulas2025_3.length > 0
    ? await prisma.participante.updateMany({
        where: { cedula: { in: cedulas2025_3 } },
        data: { periodoId: p2025_3.id }
      })
    : { count: 0 }

  const res2026_1 = cedulas2026_1.length > 0
    ? await prisma.participante.updateMany({
        where: {
          cedula: { in: cedulas2026_1 },
          NOT: { cedula: { in: cedulas2025_3 } }
        },
        data: { periodoId: p2026_1.id }
      })
    : { count: 0 }

  const res2026_2 = await prisma.participante.updateMany({
    where: {
      OR: [
        { cedula: { in: cedulas2026_2 } },
        { periodoId: null }
      ],
      NOT: {
        cedula: { in: [...cedulas2025_3, ...cedulas2026_1] }
      }
    },
    data: { periodoId: p2026_2.id }
  })

  // 5. Poblar las inscripciones_periodo si se solicita y la tabla ya fue migrada
  if (incluirInscripciones) {
    try {
      const part2025_3 = await prisma.participante.findMany({
        where: { periodoId: p2025_3.id },
        select: { id: true, aulaTerritorialId: true, trimestre: true }
      })

      for (const p of part2025_3) {
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2025_3.id } },
          create: { participanteId: p.id, periodoId: p2025_3.id, trimestre: 'Introductorio', condicion: CondicionAcademica.APROBADO, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: 'Introductorio', condicion: CondicionAcademica.APROBADO }
        })
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2026_1.id } },
          create: { participanteId: p.id, periodoId: p2026_1.id, trimestre: 'I', condicion: CondicionAcademica.APROBADO, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: 'I', condicion: CondicionAcademica.APROBADO }
        })
        const trimActual = p.trimestre || 'II'
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2026_2.id } },
          create: { participanteId: p.id, periodoId: p2026_2.id, trimestre: trimActual, condicion: CondicionAcademica.REGULAR, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: trimActual, condicion: CondicionAcademica.REGULAR }
        })
      }

      const part2026_1 = await prisma.participante.findMany({
        where: { periodoId: p2026_1.id },
        select: { id: true, aulaTerritorialId: true, trimestre: true }
      })

      for (const p of part2026_1) {
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2026_1.id } },
          create: { participanteId: p.id, periodoId: p2026_1.id, trimestre: 'I', condicion: CondicionAcademica.APROBADO, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: 'I', condicion: CondicionAcademica.APROBADO }
        })
        const trimActual = p.trimestre || 'I'
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2026_2.id } },
          create: { participanteId: p.id, periodoId: p2026_2.id, trimestre: trimActual, condicion: CondicionAcademica.REGULAR, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: trimActual, condicion: CondicionAcademica.REGULAR }
        })
      }

      const part2026_2 = await prisma.participante.findMany({
        where: { periodoId: p2026_2.id },
        select: { id: true, aulaTerritorialId: true, trimestre: true }
      })

      for (const p of part2026_2) {
        const trimActual = p.trimestre || 'Introductorio'
        await prisma.inscripcionPeriodo.upsert({
          where: { participanteId_periodoId: { participanteId: p.id, periodoId: p2026_2.id } },
          create: { participanteId: p.id, periodoId: p2026_2.id, trimestre: trimActual, condicion: CondicionAcademica.REGULAR, aulaTerritorialId: p.aulaTerritorialId },
          update: { trimestre: trimActual, condicion: CondicionAcademica.REGULAR }
        })
      }
    } catch (err) {
      console.warn('Aviso al sincronizar inscripciones_periodo:', err)
    }
  }

  return {
    '2025-3': res2025_3.count,
    '2026-1': res2026_1.count,
    '2026-2': res2026_2.count
  }
}

