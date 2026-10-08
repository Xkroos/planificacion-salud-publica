import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const crons = await prisma.cronograma.findMany({
    include: {
      aulaTerritorial: {
        include: { region: true }
      },
      periodo: true,
      asignaciones: {
        include: { unidad: true, docente: true }
      }
    },
    orderBy: [
      { aulaTerritorial: { nombre: 'asc' } },
      { trimestre: 'asc' },
      { seccion: 'asc' }
    ]
  })

  console.log(`Total cronogramas: ${crons.length}`)
  for (const c of crons) {
    console.log(JSON.stringify({
      id: c.id,
      periodo: `${c.periodo.anio}-${c.periodo.numero}`,
      sede: c.aulaTerritorial?.nombre,
      region: c.aulaTerritorial?.region?.nombre,
      trimestre: c.trimestre,
      seccion: c.seccion,
      modalidad: c.modalidad,
      participantesFem: c.participantesFem,
      participantesMasc: c.participantesMasc,
      totalAsignaciones: c.asignaciones.length,
      createdAt: c.createdAt
    }))
  }
}

main().catch(console.error).finally(() => pool.end())
