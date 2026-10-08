import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔍 Iniciando detección y limpieza de cronogramas y sedes duplicadas...\n')

  // 1. Detectar y unificar Aulas Territoriales con el mismo nombre en la misma región
  const aulas = await prisma.aulaTerritorial.findMany({
    include: {
      region: true,
      _count: {
        select: { cronogramas: true, participantes: true, docentesOrigen: true }
      }
    }
  })

  const aulasPorRegionYNombre = new Map<string, typeof aulas>()
  for (const a of aulas) {
    const key = `${a.regionId}__${a.nombre.trim().toUpperCase()}`
    if (!aulasPorRegionYNombre.has(key)) {
      aulasPorRegionYNombre.set(key, [])
    }
    aulasPorRegionYNombre.get(key)!.push(a)
  }

  let sedesFusionadas = 0
  for (const [key, grupo] of aulasPorRegionYNombre.entries()) {
    if (grupo.length > 1) {
      console.log(`⚠️ Sede duplicada detectada: "${grupo[0].nombre}" en región "${grupo[0].region.nombre}" (${grupo.length} registros).`)
      
      // Ordenar: el aula con más relaciones es la principal
      grupo.sort((a, b) => {
        const totalA = a._count.cronogramas + a._count.participantes + a._count.docentesOrigen
        const totalB = b._count.cronogramas + b._count.participantes + b._count.docentesOrigen
        return totalB - totalA
      })

      const principal = grupo[0]
      const duplicadas = grupo.slice(1)

      for (const dup of duplicadas) {
        console.log(`   -> Reasignando datos de aula ID ${dup.id} a aula principal ID ${principal.id}...`)
        await prisma.cronograma.updateMany({
          where: { aulaTerritorialId: dup.id },
          data: { aulaTerritorialId: principal.id }
        })
        await prisma.participante.updateMany({
          where: { aulaTerritorialId: dup.id },
          data: { aulaTerritorialId: principal.id }
        })
        await prisma.docente.updateMany({
          where: { aulaOrigenId: dup.id },
          data: { aulaOrigenId: principal.id }
        })
        await prisma.aulaTerritorial.delete({ where: { id: dup.id } })
        sedesFusionadas++
      }
    }
  }

  // 2. Detectar y unificar Cronogramas duplicados (mismo periodo, aula, trimestre y sección)
  const cronogramas = await prisma.cronograma.findMany({
    include: {
      asignaciones: {
        include: { fechas: true }
      },
      participantes: true,
      aulaTerritorial: { include: { region: true } },
      periodo: true
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`\n📋 Total de cronogramas encontrados en base de datos: ${cronogramas.length}`)

  const cronsMap = new Map<string, typeof cronogramas>()
  for (const c of cronogramas) {
    const aulaKey = c.aulaTerritorialId || 'sin-aula'
    const trimKey = (c.trimestre || '').trim().toUpperCase()
    const secKey = (c.seccion || '').trim()
    const key = `${c.periodoId}__${aulaKey}__${trimKey}__${secKey}`
    if (!cronsMap.has(key)) {
      cronsMap.set(key, [])
    }
    cronsMap.get(key)!.push(c)
  }

  let cronogramasEliminados = 0

  for (const [key, grupo] of cronsMap.entries()) {
    if (grupo.length > 1) {
      const item = grupo[0]
      console.log(`\n🚨 Cronograma duplicado detectado:`)
      console.log(`   Periodo: ${item.periodo?.anio}-${item.periodo?.numero} | Sede: ${item.aulaTerritorial?.nombre} | Trimestre: ${item.trimestre} | Sección: ${item.seccion} (${grupo.length} copias)`)

      // Ordenar: el que tenga más asignaciones completas o participantes es el principal
      grupo.sort((a, b) => {
        const docA = a.asignaciones.filter(as => as.docenteId).length
        const docB = b.asignaciones.filter(as => as.docenteId).length
        if (docA !== docB) return docB - docA

        const partA = a.participantes.length
        const partB = b.participantes.length
        if (partA !== partB) return partB - partA

        const matA = a.asignaciones.length
        const matB = b.asignaciones.length
        if (matA !== matB) return matB - matA

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      const principal = grupo[0]
      const duplicados = grupo.slice(1)
      console.log(`   -> Conservando cronograma ID: ${principal.id} (${principal.asignaciones.length} materias, ${principal.participantes.length} participantes)`)

      for (const dup of duplicados) {
        console.log(`   -> Procesando duplicado ID: ${dup.id}...`)
        // Migrar participantes si no estaban en el principal
        for (const rel of dup.participantes) {
          const yaExiste = principal.participantes.some(p => p.participanteId === rel.participanteId)
          if (!yaExiste) {
            await prisma.cronogramaParticipante.create({
              data: {
                cronogramaId: principal.id,
                participanteId: rel.participanteId
              }
            }).catch(() => {})
          }
        }

        // Migrar docentes asignados si el principal no los tenía
        for (const asDup of dup.asignaciones) {
          if (asDup.docenteId) {
            const asPrin = principal.asignaciones.find(ap => ap.unidadId === asDup.unidadId)
            if (asPrin && !asPrin.docenteId) {
              await prisma.asignacionDocente.update({
                where: { id: asPrin.id },
                data: { docenteId: asDup.docenteId }
              }).catch(() => {})
            }
          }
        }

        // Eliminar duplicado
        await prisma.cronograma.delete({ where: { id: dup.id } })
        cronogramasEliminados++
        console.log(`   -> ✅ Duplicado ID ${dup.id} eliminado correctamente.`)
      }
    }
  }

  console.log('\n======================================================')
  console.log(`✨ Resumen de limpieza:`)
  console.log(`   - Sedes duplicadas unificadas: ${sedesFusionadas}`)
  console.log(`   - Cronogramas duplicados eliminados: ${cronogramasEliminados}`)
  console.log('======================================================\n')
}

main()
  .catch(console.error)
  .finally(() => pool.end())
