
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

  // Crear regiones y aulas territoriales
  const carabobo = await prisma.region.upsert({
    where: { nombre: 'CARABOBO' },
    update: {},
    create: { nombre: 'CARABOBO' },
  })

  const guarico = await prisma.region.upsert({
    where: { nombre: 'GUÁRICO' },
    update: {},
    create: { nombre: 'GUÁRICO' },
  })

  await prisma.region.upsert({
    where: { nombre: 'LARA' },
    update: {},
    create: { nombre: 'LARA' },
  })

  await prisma.aulaTerritorial.upsert({
    where: { id: 'aula-puerto-cabello' },
    update: {},
    create: {
      id: 'aula-puerto-cabello',
      nombre: 'PUERTO CABELLO',
      coordinador: 'DRA. MILDRE PÉREZ',
      enlace: '',
      regionId: carabobo.id,
      costo: 50.0,
    },
  })

  await prisma.aulaTerritorial.upsert({
    where: { id: 'aula-valencia' },
    update: {},
    create: {
      id: 'aula-valencia',
      nombre: 'VALENCIA',
      coordinador: '',
      enlace: '',
      regionId: carabobo.id,
      costo: 60.0,
    },
  })

  await prisma.aulaTerritorial.upsert({
    where: { id: 'aula-san-juan' },
    update: {},
    create: {
      id: 'aula-san-juan',
      nombre: 'SAN JUAN DE LOS MORROS',
      coordinador: '',
      enlace: '',
      regionId: guarico.id,
      costo: 45.0,
    },
  })

  console.log('✅ Regiones y aulas territoriales creadas')

  // Crear período académico de ejemplo
  await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 2 } },
    update: {},
    create: {
      anio: 2026,
      numero: 2,
      modalidad: 'MULTIMODAL',
    },
  })

  console.log('✅ Período académico creado')

  // Crear docentes de ejemplo
  await prisma.docente.upsert({
    where: { cedula: '12345678' },
    update: {},
    create: {
      id: 'docente-yuli-rengifo',
      nombre: 'YULI RENGIFO',
      cedula: '12345678',
      categoria: 'CONTRATADO',
      dedicacion: 'HP',
    },
  })

  await prisma.docente.upsert({
    where: { cedula: '23456789' },
    update: {},
    create: {
      id: 'docente-yaneth-santana',
      nombre: 'YANETH SANTANA',
      cedula: '23456789',
      categoria: 'CONTRATADO',
      dedicacion: 'HP',
    },
  })

  await prisma.docente.upsert({
    where: { cedula: '34567890' },
    update: {},
    create: {
      id: 'docente-freddy-sojo',
      nombre: 'FREDDY SOJO (Docente San Juan)',
      cedula: '34567890',
      categoria: 'CONTRATADO',
      dedicacion: 'HP',
    },
  })

  console.log('✅ Docentes creados')

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
