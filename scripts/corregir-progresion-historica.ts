import 'dotenv/config'
import { PrismaClient, CondicionAcademica } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🚀 Iniciando sincronización de cohortes y progresión histórica de participantes...')

  // 1. Asegurar existencia de los tres períodos base
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

  console.log('📅 Períodos verificados: 2025-3 (CERRADO), 2026-1 (CERRADO), 2026-2 (ACTIVO)')

  const prismaDir = path.join(__dirname, '../prisma')

  // 2. Extraer cédulas de 2025-3 (Lote 2025-3)
  const cedulas2025_3: string[] = []
  const file2025_3 = path.join(prismaDir, 'participantes_lote_2025_3.json')
  if (fs.existsSync(file2025_3)) {
    const data = JSON.parse(fs.readFileSync(file2025_3, 'utf8'))
    data.forEach((p: any) => p.cedula && cedulas2025_3.push(String(p.cedula).trim()))
  }
  console.log(`📋 Cédulas identificadas en Cohorte 2025-3: ${cedulas2025_3.length}`)

  // 3. Extraer cédulas de 2026-1 (Lotes 2, 3, 4 y Excel inicial)
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
  console.log(`📋 Cédulas identificadas en Cohorte 2026-1: ${cedulas2026_1.length}`)

  // 4. Asignar el período de inicio (Cohorte) en la tabla Participantes
  console.log('🔄 Actualizando período de inicio para cada cohorte...')

  const upd2025_3 = await prisma.participante.updateMany({
    where: { cedula: { in: cedulas2025_3 } },
    data: { periodoId: p2025_3.id }
  })
  console.log(`   - Participantes vinculados a Cohorte 2025-3: ${upd2025_3.count}`)

  const upd2026_1 = await prisma.participante.updateMany({
    where: {
      cedula: { in: cedulas2026_1 },
      NOT: { cedula: { in: cedulas2025_3 } }
    },
    data: { periodoId: p2026_1.id }
  })
  console.log(`   - Participantes vinculados a Cohorte 2026-1: ${upd2026_1.count}`)

  const upd2026_2 = await prisma.participante.updateMany({
    where: {
      NOT: {
        cedula: { in: [...cedulas2025_3, ...cedulas2026_1] }
      }
    },
    data: { periodoId: p2026_2.id }
  })
  console.log(`   - Participantes vinculados a Cohorte 2026-2: ${upd2026_2.count}`)

  // 5. Poblar y normalizar cronológicamente el historial completo de inscripciones_periodo
  console.log('🌱 Creando y corrigiendo historial cronológico de inscripciones por período...')

  const SECUENCIA_NIVELES = [
    'Introductorio',
    'I',
    'II',
    'III',
    'IV',
    'V',
    'Comisión Técnica',
    'Finalizado'
  ] as const

  const todosPeriodos = await prisma.periodo.findMany({
    orderBy: [{ anio: 'asc' }, { numero: 'asc' }]
  })

  const valorCronologico = (anio: number, numero: number) => anio * 10 + numero

  const todosParticipantes = await prisma.participante.findMany({
    include: {
      periodo: true,
      inscripciones: {
        include: { periodo: true },
        orderBy: [
          { periodo: { anio: 'asc' } },
          { periodo: { numero: 'asc' } }
        ]
      }
    }
  })

  for (const participante of todosParticipantes) {
    if (!participante.periodo) continue

    const inicioVal = valorCronologico(participante.periodo.anio, participante.periodo.numero)
    const idxNivelActual = SECUENCIA_NIVELES.indexOf((participante.trimestre || 'Introductorio') as any)
    const periodosDesdeInicio = todosPeriodos.filter(p => valorCronologico(p.anio, p.numero) >= inicioVal)

    const cantidadEsperada = Math.max(
      participante.inscripciones.filter(i => i.periodo && valorCronologico(i.periodo.anio, i.periodo.numero) >= inicioVal).length,
      idxNivelActual >= 0 ? idxNivelActual + 1 : 1
    )

    const periodosTrayecto = periodosDesdeInicio.slice(0, cantidadEsperada)
    if (periodosTrayecto.length === 0) continue

    const mapExistentes = new Map(
      participante.inscripciones.map(i => [i.periodoId, i])
    )

    let cursorNivel = 0
    let ultimoTrimestreCalculado = 'Introductorio'

    for (let i = 0; i < periodosTrayecto.length; i++) {
      const per = periodosTrayecto[i]
      const esUltimoPeriodo = i === periodosTrayecto.length - 1
      const existente = mapExistentes.get(per.id)

      const trimestreCorrespondiente = SECUENCIA_NIVELES[Math.min(cursorNivel, SECUENCIA_NIVELES.length - 1)]
      ultimoTrimestreCalculado = trimestreCorrespondiente

      const condicionExplicitaPausa =
        existente &&
        (existente.condicion === CondicionAcademica.REPROBADO ||
          existente.condicion === CondicionAcademica.RETIRADO ||
          existente.condicion === CondicionAcademica.INACTIVO)

      let condicionCorrespondiente: CondicionAcademica
      if (condicionExplicitaPausa) {
        condicionCorrespondiente = existente.condicion
      } else if (!esUltimoPeriodo) {
        condicionCorrespondiente = CondicionAcademica.APROBADO
      } else {
        condicionCorrespondiente =
          per.estado === 'ACTIVO'
            ? CondicionAcademica.REGULAR
            : existente?.condicion === CondicionAcademica.APROBADO
            ? CondicionAcademica.APROBADO
            : CondicionAcademica.REGULAR
      }

      await prisma.inscripcionPeriodo.upsert({
        where: {
          participanteId_periodoId: {
            participanteId: participante.id,
            periodoId: per.id
          }
        },
        create: {
          participanteId: participante.id,
          periodoId: per.id,
          trimestre: trimestreCorrespondiente,
          condicion: condicionCorrespondiente,
          aulaTerritorialId: participante.aulaTerritorialId
        },
        update: {
          trimestre: trimestreCorrespondiente,
          condicion: condicionCorrespondiente
        }
      })

      if (condicionCorrespondiente === CondicionAcademica.APROBADO) {
        cursorNivel++
      }
    }

    if (participante.trimestre !== ultimoTrimestreCalculado) {
      await prisma.participante.update({
        where: { id: participante.id },
        data: { trimestre: ultimoTrimestreCalculado }
      })
    }
  }

  console.log('')
  console.log('✅ Sincronización completa:')
  console.log(`   - Cohorte 2025-3: ${upd2025_3.count} participantes`)
  console.log(`   - Cohorte 2026-1: ${upd2026_1.count} participantes`)
  console.log(`   - Cohorte 2026-2: ${upd2026_2.count} participantes`)
  console.log('')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Error en sincronización:', e)
  await prisma.$disconnect()
  process.exit(1)
})
