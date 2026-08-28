import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed maestro para VPS...')

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
  
  // Helpers para caché
  let aulasCache: Record<string, string> = {}; 
  let regionesCache: Record<string, string> = {}; 

  const getRegionId = async (nombre: string) => {
    if (regionesCache[nombre]) return regionesCache[nombre];
    const r = await prisma.region.findUnique({ where: { nombre } });
    if (r) regionesCache[nombre] = r.id;
    return r?.id;
  }

  const getAulaId = async (nombre: string, regionId: string) => {
    const cacheKey = `${nombre}-${regionId}`;
    if (aulasCache[cacheKey]) return aulasCache[cacheKey];
    const a = await prisma.aulaTerritorial.findFirst({ where: { nombre, regionId } });
    if (a) aulasCache[cacheKey] = a.id;
    return a?.id;
  }


  // ============================================================================
  // CARGA DEL PERIODO 2026-1
  // ============================================================================
  console.log('🌱 Creando periodo 2026-1 y participantes...')

  // Obtener región y aula para el excel inicial
  const regionAnzoategui = await prisma.region.findUnique({ where: { nombre: 'ANZOATEGUI' } })
  let aulaElTigre = null
  if (regionAnzoategui) {
    aulaElTigre = await prisma.aulaTerritorial.findFirst({ 
      where: { nombre: 'EL TIGRE', regionId: regionAnzoategui.id } 
    })
  }

  // Crear Periodo 2026-1 (se crea CERRADO para que no choque con 2026-2)
  const periodo1 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 1 } },
    update: { estado: 'CERRADO' }, // Asegurar que esté finalizado
    create: {
      anio: 2026,
      numero: 1,
      modalidad: 'PRESENCIAL',
      estado: 'CERRADO',
    }
  })

  const participantesExcel = [
    { email: "renatodanielalvarado@gmail.com", cedula: "30730949", apellido: "Alvarado Rodriguez", nombre: "Renato Daniel", genero: "MASCULINO", telefono: "04149803561" },
    { email: "lauraxariza06@gmail.com", cedula: "20747517", apellido: "Ariza Mogotocoro", nombre: "Laura Ximena", genero: "FEMENINO", telefono: "04147743766" },
    { email: "eylin.bm@gmail.com", cedula: "18228317", apellido: "Becerra", nombre: "Erika", genero: "FEMENINO", telefono: "04248226054" },
    { email: "rivascarmona288@gmail.com", cedula: "18229463", apellido: "Carmona Rivas", nombre: "Hayme de los Angeles", genero: "FEMENINO", telefono: "04148416228" },
    { email: "mg9486336@gmail.com", cedula: "28664629", apellido: "Guzman Lopez", nombre: "Manuel Alejandro", genero: "MASCULINO", telefono: "04248966998" },
    { email: "kristal@gmail.com", cedula: "23997251", apellido: "Guevara Seijas", nombre: "Kristy Andreina", genero: "FEMENINO", telefono: "04129424157" },
    { email: "carolguevaralista@gmail.com", cedula: "15717545", apellido: "Guevara Lista", nombre: "Milaris Carolina del Valle", genero: "FEMENINO", telefono: "04141906602" },
    { email: "hleidysa@gmail.com", cedula: "19785957", apellido: "Hernandez Marin", nombre: "Leidys Antonieta", genero: "FEMENINO", telefono: "04248285684" },
    { email: "vanesaillas90@gmail.com", cedula: "22860489", apellido: "Illas Guerra", nombre: "Yenifer Vanessa", genero: "FEMENINO", telefono: "04147735923" },
    { email: "norvisydrogo@gmail.com", cedula: "17242241", apellido: "Ydrogo", nombre: "Norvis Yoleima", genero: "FEMENINO", telefono: "04248222973" },
    { email: "lealneilexis@gmail.com", cedula: "17747572", apellido: "Leal", nombre: "Neilexis", genero: "FEMENINO", telefono: "04248610813" },
    { email: "maureidy438@gmail.com", cedula: "16318477", apellido: "Lopez Sandoval", nombre: "Maureidy Lisbeth", genero: "FEMENINO", telefono: "04129029580" },
    { email: "aniluquez5@gmail.com", cedula: "16141395", apellido: "Luquez", nombre: "Anilux Mercedes", genero: "FEMENINO", telefono: "04269228224" },
    { email: "wilmermaitamendez@gmail.com", cedula: "14188660", apellido: "Maita Mendez", nombre: "Wilmer Ramón", genero: "MASCULINO", telefono: "04121817062" },
    { email: "fisiomarca2000@gmail.com", cedula: "13472297", apellido: "Marcano Marcano", nombre: "Carlos Gustavo", genero: "MASCULINO", telefono: "04265826121" },
    { email: "rossiamarcanoc@gmail.com", cedula: "22786655", apellido: "Marcano Crespo", nombre: "Rossi Alejandra", genero: "FEMENINO", telefono: "04220080166" },
    { email: "silvipnm@gmail.com", cedula: "17871053", apellido: "Martinez Pinto", nombre: "Silvania del Carmen", genero: "FEMENINO", telefono: "04248000865" },
    { email: "cesarernestomartinezgarcia@gmail.com", cedula: "25487178", apellido: "Martinez Garcia", nombre: "Cesar Ernesto", genero: "MASCULINO", telefono: "04248101768" },
    { email: "lilimendozap@gmail.com", cedula: "10759337", apellido: "Mendoza Perez", nombre: "Lili de Jesus", genero: "FEMENINO", telefono: "04226380626" },
    { email: "vanesadani09@gmail.com", cedula: "16963447", apellido: "Mejias", nombre: "Vanessa", genero: "FEMENINO", telefono: "04140869069" },
    { email: "javiannafiguera@gmail.com", cedula: "26479858", apellido: "Mejias Figuera", nombre: "Javianna del Carmen", genero: "FEMENINO", telefono: "04248277383" },
    { email: "milagrosmoycolina@gmail.com", cedula: "13258636", apellido: "Moy Colina", nombre: "Milagros del Valle", genero: "FEMENINO", telefono: "04248914072" },
    { email: "celesmm.1999@gmail.com", cedula: "22992683", apellido: "Moya Medina", nombre: "Fabiola Celeste", genero: "FEMENINO", telefono: "04248611489" },
    { email: "greozer1969@gmail.com", cedula: "22858557", apellido: "Parra Guzman", nombre: "Greizer Milelka", genero: "FEMENINO", telefono: "04248956658" },
    { email: "adalismarpradoag@gmail.com", cedula: "28658698", apellido: "Prado Garcia", nombre: "Adalismar de los Angeles", genero: "FEMENINO", telefono: "04122706897" },
    { email: "joryelisabel@gmail.com", cedula: "17901272", apellido: "Pereira Salgado", nombre: "Alejandra Isabel", genero: "FEMENINO", telefono: "04248373201" },
    { email: "rodriguez.irama79@gmail.com", cedula: "13814162", apellido: "Rodriguez Alcala", nombre: "Irama Alejandra", genero: "FEMENINO", telefono: "04265921270" },
    { email: "santamikelsalazar@gmail.com", cedula: "12740833", apellido: "Salazar España", nombre: "Santa Mikel", genero: "FEMENINO", telefono: "04263831862" },
    { email: "andreabartola98@gmail.com", cedula: "26748380", apellido: "Salazar Mata", nombre: "Andrea Carolina", genero: "FEMENINO", telefono: "04140856721" },
    { email: "milagrossalazar_96@gmail.com", cedula: "18316252", apellido: "Salazar Alvarado", nombre: "Milagros Jesus", genero: "FEMENINO", telefono: "04129451303" },
    { email: "rosariodelcarmensalazar11@gmail.com", cedula: "14029167", apellido: "Salazar Rios", nombre: "Rosario del Carmen", genero: "FEMENINO", telefono: "04147782729" },
    { email: "jehisasierragil@gmail.com", cedula: "13752679", apellido: "Sierra Gil", nombre: "Jehisa Enriqueta", genero: "FEMENINO", telefono: "04242594575" },
    { email: "tablantekleiva90@gmail.com", cedula: "20446583", apellido: "Tablante Diaz", nombre: "Kleiva Margarita", genero: "FEMENINO", telefono: "04249178123" },
    { email: "maestriaunerg2026@gmail.com", cedula: "17434293", apellido: "Tarantino Pitino", nombre: "Maria Vannessa", genero: "FEMENINO", telefono: "04260485243" },
    { email: "triasjfisio@gmail.com", cedula: "19630453", apellido: "Trias", nombre: "Jose Manuel", genero: "MASCULINO", telefono: "04147987366" },
    { email: "nathelev@gmail.com", cedula: "15376354", apellido: "Vargas Campos", nombre: "Nathele Lourdes", genero: "FEMENINO", telefono: "04147746750" },
    { email: "josandrycrisbel@gmail.com", cedula: "19629603", apellido: "Zapata Gil", nombre: "Josandry Crisbel", genero: "FEMENINO", telefono: "04248260190" }
  ]

  let participantesCreados2026_1 = 0;

  for (const p of participantesExcel) {
    const existe = await prisma.participante.findFirst({ where: { cedula: p.cedula } })
    if (!existe) {
      await prisma.participante.create({
        data: {
          nombre: p.nombre, apellido: p.apellido, cedula: p.cedula,
          email: p.email, telefono: p.telefono, genero: p.genero as 'MASCULINO' | 'FEMENINO',
          trimestre: 'I', // Avanzado a Trimestre I si corresponde
          periodoId: periodo1.id,
          regionId: regionAnzoategui?.id, aulaTerritorialId: aulaElTigre?.id
        }
      })
      participantesCreados2026_1++;
    }
  }

  // Archivos JSON correspondientes al 2026-1
  const archivos2026_1 = ['participantes_lote2.json', 'participantes_lote3.json', 'participantes_lote4.json'];
  
  for (const archivo of archivos2026_1) {
    const filePath = path.join(__dirname, archivo);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const p of data) {
        const existe = await prisma.participante.findFirst({ where: { cedula: p.cedula } })
        if (!existe) {
          const rId = await getRegionId(p.region);
          const aId = rId ? await getAulaId(p.aula, rId) : undefined;
          await prisma.participante.create({
            data: {
              nombre: p.nombre, apellido: p.apellido, cedula: p.cedula,
              email: p.email || null, telefono: p.telefono || null, genero: p.genero as 'MASCULINO' | 'FEMENINO',
              trimestre: 'I', // Avanzan a I trimestre
              periodoId: periodo1.id,
              regionId: rId, aulaTerritorialId: aId
            }
          })
          participantesCreados2026_1++;
        }
      }
    }
  }
  console.log(`✅ ${participantesCreados2026_1} nuevos participantes creados en el Periodo 2026-1.`)


  // ============================================================================
  // CARGA DEL PERIODO 2026-2
  // ============================================================================
  console.log('🌱 Creando periodo 2026-2 y participantes (Nuevos Ingresos)...')

  // Crear Periodo 2026-2 (ACTIVO)
  const periodo2 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 2 } },
    update: { estado: 'ACTIVO' }, // Actual activo
    create: {
      anio: 2026,
      numero: 2,
      modalidad: 'PRESENCIAL',
      estado: 'ACTIVO',
    }
  })

  // Archivos JSON correspondientes al 2026-2
  const archivos2026_2 = [
    'participantes_lote5_2026_2.json', 
    'participantes_lote6_2026_2.json', 
    'participantes_lote7_2026_2.json', 
    'participantes_lote8_2026_2.json', 
    'participantes_lote9_2026_2.json', 
    'participantes_lote10_2026_2.json'
  ];

  let participantesCreados2026_2 = 0;

  for (const archivo of archivos2026_2) {
    const filePath = path.join(__dirname, archivo);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const p of data) {
        const existe = await prisma.participante.findFirst({ where: { cedula: p.cedula } })
        if (!existe) {
          const rId = await getRegionId(p.region);
          const aId = rId ? await getAulaId(p.aula, rId) : undefined;
          await prisma.participante.create({
            data: {
              nombre: p.nombre, apellido: p.apellido, cedula: p.cedula,
              email: p.email || null, telefono: p.telefono || null, genero: p.genero as 'MASCULINO' | 'FEMENINO',
              trimestre: 'INTRODUCTORIO', // Nuevos ingresos al introductorio
              periodoId: periodo2.id,
              regionId: rId, aulaTerritorialId: aId
            }
          })
          participantesCreados2026_2++;
        }
      }
    } else {
      console.error(`❌ No se encontró el archivo: ${filePath}`);
    }
  }
  
  console.log(`✅ ${participantesCreados2026_2} nuevos participantes creados en el Periodo 2026-2.`)
  
  // ============================================================================
  // FIN
  // ============================================================================
  console.log('')
  console.log('🎉 Seed MAESTRO completado exitosamente!')
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
