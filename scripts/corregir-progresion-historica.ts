import 'dotenv/config'
import { PrismaClient, CondicionAcademica } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  SECUENCIA_TRIMESTRES,
  normalizarTrimestre
} from '../src/lib/services/progresionAcademica'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🚀 Iniciando script de corrección y migración de progresión histórica...')

  // 1. Obtener todos los períodos ordenados cronológicamente
  const periodos = await prisma.periodo.findMany({
    orderBy: [
      { anio: 'asc' },
      { numero: 'asc' }
    ]
  })

  console.log(`📅 Períodos encontrados: ${periodos.map(p => `${p.anio}-${p.numero} (${p.estado})`).join(', ')}`)

  if (periodos.length === 0) {
    console.warn('⚠️ No se encontraron períodos registrados.')
    return
  }

  // 2. Obtener todos los participantes del sistema
  const participantes = await prisma.participante.findMany({
    include: {
      periodo: true,
      historial: {
        orderBy: { createdAt: 'asc' }
      },
      cronogramas: {
        include: {
          cronograma: {
            include: { periodo: true }
          }
        }
      }
    }
  })

  console.log(`👥 Total de participantes a evaluar: ${participantes.length}`)

  let creadas = 0
  let actualizadas = 0
  let inconsistenciasCorregidas = 0

  for (const p of participantes) {
    // Determinar el período de ingreso inicial
    // Si tiene un periodo asignado inicialmente, lo tomamos; sino buscamos en cronogramas
    let periodoIngreso = p.periodo
    if (!periodoIngreso && p.cronogramas.length > 0) {
      // Ordenar cronogramas por período
      const crons = [...p.cronogramas].sort((a, b) => {
        const valA = (a.cronograma.periodo.anio * 10) + a.cronograma.periodo.numero
        const valB = (b.cronograma.periodo.anio * 10) + b.cronograma.periodo.numero
        return valA - valB
      })
      periodoIngreso = crons[0].cronograma.periodo
    }

    // Si aún no tiene período conocido, asumimos el primer período del sistema
    if (!periodoIngreso) {
      periodoIngreso = periodos[0]
    }

    const valorIngreso = (periodoIngreso.anio * 10) + periodoIngreso.numero

    // Recorrer los períodos desde su ingreso en adelante
    let nivelActual = 'Introductorio'

    for (const per of periodos) {
      const valorPeriodo = (per.anio * 10) + per.numero
      if (valorPeriodo < valorIngreso) {
        // Aún no había ingresado
        continue
      }

      // Buscar si ya tiene una inscripción registrada en este período
      const inscExistente = await prisma.inscripcionPeriodo.findUnique({
        where: {
          participanteId_periodoId: {
            participanteId: p.id,
            periodoId: per.id
          }
        }
      })

      if (valorPeriodo === valorIngreso) {
        // En el período de ingreso, comienza en Introductorio (o en el nivel que tenía registrado si es especial)
        const nivelInicial = p.trimestre && valorIngreso === 20261 && p.trimestre === 'I' 
          ? 'I' 
          : 'Introductorio'

        nivelActual = nivelInicial

        if (!inscExistente) {
          await prisma.inscripcionPeriodo.create({
            data: {
              participanteId: p.id,
              periodoId: per.id,
              trimestre: nivelActual,
              condicion: per.estado === 'CERRADO' ? CondicionAcademica.APROBADO : CondicionAcademica.REGULAR,
              aulaTerritorialId: p.aulaTerritorialId,
            }
          })
          creadas++
        }
      } else {
        // Período subsiguiente: evaluar según el período previo
        // Obtener la condición del período anterior
        const anteriorInsc = await prisma.inscripcionPeriodo.findFirst({
          where: {
            participanteId: p.id,
            periodo: {
              OR: [
                { anio: { lt: per.anio } },
                { anio: per.anio, numero: { lt: per.numero } }
              ]
            }
          },
          include: { periodo: true },
          orderBy: [
            { periodo: { anio: 'desc' } },
            { periodo: { numero: 'desc' } }
          ]
        })

        if (anteriorInsc) {
          const cond = anteriorInsc.condicion
          const normAnterior = normalizarTrimestre(anteriorInsc.trimestre)
          const idx = SECUENCIA_TRIMESTRES.indexOf(normAnterior as any)

          if (cond === CondicionAcademica.REPROBADO || cond === CondicionAcademica.RETIRADO) {
            // Mantiene el mismo nivel
            nivelActual = normAnterior
          } else {
            // APROBADO o CERRADO regular -> avanza al siguiente
            if (idx >= 0 && idx < SECUENCIA_TRIMESTRES.length - 1) {
              nivelActual = SECUENCIA_TRIMESTRES[idx + 1]
            } else {
              nivelActual = 'Finalizado'
            }
          }
        }

        if (!inscExistente) {
          await prisma.inscripcionPeriodo.create({
            data: {
              participanteId: p.id,
              periodoId: per.id,
              trimestre: nivelActual,
              condicion: per.estado === 'CERRADO' ? CondicionAcademica.APROBADO : CondicionAcademica.REGULAR,
              aulaTerritorialId: p.aulaTerritorialId,
            }
          })
          creadas++
        } else {
          // Si ya existía pero tenía un nivel inconsistente
          if (inscExistente.trimestre !== nivelActual) {
            await prisma.inscripcionPeriodo.update({
              where: { id: inscExistente.id },
              data: { trimestre: nivelActual }
            })
            actualizadas++
          }
        }
      }
    }

    // Finalmente, sincronizar el participante con el último período activo
    const ultimoPeriodo = periodos[periodos.length - 1]
    const ultimaInsc = await prisma.inscripcionPeriodo.findUnique({
      where: {
        participanteId_periodoId: {
          participanteId: p.id,
          periodoId: ultimoPeriodo.id
        }
      }
    })

    if (ultimaInsc && (p.trimestre !== ultimaInsc.trimestre || p.periodoId !== ultimoPeriodo.id)) {
      await prisma.participante.update({
        where: { id: p.id },
        data: {
          trimestre: ultimaInsc.trimestre,
          periodoId: ultimoPeriodo.id
        }
      })
      inconsistenciasCorregidas++
    }
  }

  console.log('')
  console.log('✅ Migración y corrección de datos completada exitosamente:')
  console.log(`   - Nuevas inscripciones históricas registradas: ${creadas}`)
  console.log(`   - Inscripciones actualizadas con nivel correcto: ${actualizadas}`)
  console.log(`   - Participantes con nivel sincronizado al último período: ${inconsistenciasCorregidas}`)
  console.log('')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Error en script de migración:', e)
  await prisma.$disconnect()
  process.exit(1)
})

