
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear configuración del sistema
  await prisma.configuracionSistema.upsert({
    where: { id: 'config-1' },
    update: {},
    create: {
      id: 'config-1',
      registroDocentesAbierto: true,
      asignacionCargaAbierta: true,
    },
  })

  // Crear usuario administrador
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@unerg.edu.ve' },
    update: {},
    create: {
      nombre: 'Administrador UNERG',
      email: 'admin@unerg.edu.ve',
      password: hashedPassword,
      rol: 'ADMIN',
    },
  })

  const operador = await prisma.usuario.upsert({
    where: { email: 'operador@unerg.edu.ve' },
    update: {},
    create: {
      nombre: 'Operador Sistema',
      email: 'operador@unerg.edu.ve',
      password: await bcrypt.hash('operador123', 12),
      rol: 'OPERADOR',
    },
  })

  console.log('✅ Usuarios creados:', { admin: admin.email, operador: operador.email })

  // Crear unidades curriculares
  const unidadesCurriculares = [
    // INTRODUCTORIO
    { id: 'uc-bioestadistica', nombre: 'BIOESTADISTICA BASICA Y PROCEDIMIENTOS DE DATOS', creditos: 2, horas: 32, trimestre: 'Introductorio' },
    { id: 'uc-politicas-publicas', nombre: 'POLITICAS PUBLICAS Y DESARROLLO ECONOMICO', creditos: 2, horas: 32, trimestre: 'Introductorio' },
    { id: 'uc-bases-eticas', nombre: 'BASES ETICAS Y EPISTEMOLOGICAS DE LA SALUD', creditos: 2, horas: 32, trimestre: 'Introductorio' },
    { id: 'uc-metodologia', nombre: 'METODOLOGIA DE LA INVESTIGACION', creditos: 2, horas: 32, trimestre: 'Introductorio' },
    
    // I TRIMESTRE
    { id: 'uc-economia-salud', nombre: 'ECONOMIA DE LA SALUD', creditos: 2, horas: 32, trimestre: 'I' },
    { id: 'uc-legislacion', nombre: 'LEGISLACION EN SALUD', creditos: 2, horas: 32, trimestre: 'I' },
    { id: 'uc-atencion-primaria', nombre: 'ATENCION PRIMARIA Y PROMOCION DE LA SALUD', creditos: 2, horas: 32, trimestre: 'I' },
    { id: 'uc-proyecto-i', nombre: 'PROYECTO I', creditos: 3, horas: 48, trimestre: 'I' },

    // II TRIMESTRE
    { id: 'uc-gerencia-i', nombre: 'GERENCIA EN SALUD I: SISTEMA DE SALUD EN VENEZUELA', creditos: 3, horas: 48, trimestre: 'II' },
    { id: 'uc-modelos-gerenciales', nombre: 'MODELOS GERENCIALES EN SALUD', creditos: 2, horas: 32, trimestre: 'II' },
    { id: 'uc-epidemiologia-i', nombre: 'EPIDEMIOLOGIA I', creditos: 2, horas: 32, trimestre: 'II' },

    // III TRIMESTRE
    { id: 'uc-gerencia-ii', nombre: 'GERENCIA EN SALUD II: POLITICAS, PLANES Y PROGRAMAS DE SALUD', creditos: 3, horas: 48, trimestre: 'III' },
    { id: 'uc-proyecto-ii', nombre: 'PROYECTO II', creditos: 3, horas: 48, trimestre: 'III' },
    { id: 'uc-epidemiologia-ii', nombre: 'EPIDEMIOLOGIA II', creditos: 2, horas: 32, trimestre: 'III' },

    // IV TRIMESTRE
    { id: 'uc-gerencia-iii', nombre: 'GERENCIA EN SALUD III: PLANIFICACION ESTRATEGICA EN SALUD', creditos: 3, horas: 48, trimestre: 'IV' },
    { id: 'uc-control-gestion', nombre: 'CONTROL DE GESTION', creditos: 2, horas: 32, trimestre: 'IV' },

    // V TRIMESTRE
    { id: 'uc-proyectos-salud', nombre: 'DISEÑO, EJECUCION Y EVALUACION DE PROYECTOS EN SALUD PUBLICA', creditos: 3, horas: 48, trimestre: 'V' },
    { id: 'uc-practica-gerencial', nombre: 'PRACTICA GERENCIAL (PRIMARIO, SECUNDARIO Y TERCIARIO)', creditos: 3, horas: 48, trimestre: 'V' },
    { id: 'uc-proyecto-iii', nombre: 'PROYECTO III', creditos: 3, horas: 48, trimestre: 'V' },
  ];

  for (const uc of unidadesCurriculares) {
    await prisma.unidadCurricular.upsert({
      where: { id: uc.id },
      update: {
        nombre: uc.nombre,
        creditos: uc.creditos,
        horas: uc.horas,
        trimestre: uc.trimestre,
      },
      create: uc,
    });
  }

  console.log('✅ Unidades curriculares creadas')
  console.log('')
  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('📋 Credenciales de acceso:')
  console.log('   Administrador: admin@unerg.edu.ve / admin123')
  console.log('   Operador:      operador@unerg.edu.ve / operador123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
