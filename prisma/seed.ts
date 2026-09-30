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

  // ============================================================================
  // CARGA DE REGIONES Y AULAS TERRITORIALES
  // ============================================================================
  console.log('🌱 Creando Regiones y Aulas Territoriales con viáticos y costos...')
  const regionesPath = path.join(__dirname, 'regiones_aulas.json');
  if (fs.existsSync(regionesPath)) {
    const regionesData = JSON.parse(fs.readFileSync(regionesPath, 'utf8'));
    for (const r of regionesData) {
      const region = await prisma.region.upsert({
        where: { nombre: r.nombre },
        update: {},
        create: { nombre: r.nombre },
      });

      for (const aula of r.aulas) {
        const existingAula = await prisma.aulaTerritorial.findFirst({
          where: { nombre: aula.nombre, regionId: region.id }
        });

        const aulaData = {
          nombre: aula.nombre,
          coordinador: aula.coordinador,
          enlace: aula.enlace,
          costo: aula.costo || 0,
          preinscripcion: aula.preinscripcion || 0,
          inscripcion: aula.inscripcion || 0,
          gastosAdministrativos: aula.gastosAdministrativos || 0,
          limpieza: aula.limpieza || 0,
          vigilancia: aula.vigilancia || 0,
          aporteCoordinacion: aula.aporteCoordinacion || 0,
          viatico: aula.viatico || 0,
          viaticoZona: aula.viaticoZona || 0,
          regionId: region.id
        };

        if (existingAula) {
          await prisma.aulaTerritorial.update({
            where: { id: existingAula.id },
            data: aulaData
          });
        } else {
          await prisma.aulaTerritorial.create({
            data: aulaData
          });
        }
      }
    }
    console.log('✅ Regiones y Aulas Territoriales creadas');
  } else {
    console.log('⚠️ Archivo regiones_aulas.json no encontrado, omitiendo carga de regiones.');
  }

  // Helper para normalizar texto (sin tildes, mayúsculas y sin espacios extra)
  const normalizeText = (text?: string | null) =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  // Helpers para caché
  const aulasCache: Record<string, string> = {};
  const regionesCache: Record<string, string> = {};

  const getRegionId = async (nombre: string) => {
    if (!nombre) return undefined;
    const clean = normalizeText(nombre);
    if (regionesCache[clean]) return regionesCache[clean];

    // Alias conocidos para regiones
    let searchName = clean;
    if (clean === 'DISTRITO CAPITAL') searchName = 'CARACAS';

    // 1. Búsqueda directa o insensible a mayúsculas
    let r = await prisma.region.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } }
    });

    // 2. Búsqueda normalizada en caso de diferencias de tildes
    if (!r) {
      const allRegiones = await prisma.region.findMany();
      r = allRegiones.find(reg => normalizeText(reg.nombre) === searchName) || null;
    }

    if (r) {
      regionesCache[clean] = r.id;
      regionesCache[nombre] = r.id;
      return r.id;
    }
    return undefined;
  }

  const getAulaId = async (nombre: string, regionId: string) => {
    if (!nombre || !regionId) return undefined;
    const clean = normalizeText(nombre);
    const cacheKey = `${clean}-${regionId}`;
    if (aulasCache[cacheKey]) return aulasCache[cacheKey];

    // Alias conocidos para aulas
    let searchName = clean;
    if (clean === 'SAN JUAN') searchName = 'SAN JUAN DE LOS MORROS';
    if (clean === 'MARGARITA') searchName = 'PORLAMAR';

    // 1. Búsqueda directa o insensible a mayúsculas
    let a = await prisma.aulaTerritorial.findFirst({
      where: {
        regionId,
        nombre: { equals: searchName, mode: 'insensitive' }
      }
    });

    // 2. Búsqueda normalizada o por inclusión
    if (!a) {
      const allAulas = await prisma.aulaTerritorial.findMany({ where: { regionId } });
      a = allAulas.find(aula => {
        const aulaNorm = normalizeText(aula.nombre);
        return (
          aulaNorm === searchName ||
          aulaNorm === clean ||
          (clean === 'SAN JUAN' && aulaNorm.includes('SAN JUAN'))
        );
      }) || null;
    }

    if (a) {
      aulasCache[cacheKey] = a.id;
      aulasCache[`${nombre}-${regionId}`] = a.id;
      return a.id;
    }
    return undefined;
  }


  // ============================================================================
  // CARGA DEL PERIODO 2026-1
  // ============================================================================
  console.log('🌱 Creando periodo 2026-1 y participantes...')

  const regionAnzoategui = await prisma.region.findUnique({ where: { nombre: 'ANZOATEGUI' } })
  let aulaElTigre = null
  if (regionAnzoategui) {
    aulaElTigre = await prisma.aulaTerritorial.findFirst({
      where: { nombre: 'EL TIGRE', regionId: regionAnzoategui.id }
    })
  }

  const periodo1 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 1 } },
    update: { estado: 'CERRADO' },
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
          trimestre: 'I',
          periodoId: periodo1.id,
          regionId: regionAnzoategui?.id,
          aulaTerritorialId: aulaElTigre?.id,
        }
      })
      participantesCreados2026_1++;
    } else {
      // Actualizar campos vacíos en registros existentes
      if (!existe.trimestre || !existe.regionId) {
        await prisma.participante.update({
          where: { id: existe.id },
          data: {
            trimestre: existe.trimestre || 'I',
            regionId: existe.regionId || regionAnzoategui?.id,
            aulaTerritorialId: existe.aulaTerritorialId || aulaElTigre?.id,
          }
        })
      }
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
              trimestre: 'I',
              periodoId: periodo1.id,
              regionId: rId,
              aulaTerritorialId: aId,
            }
          })
          participantesCreados2026_1++;
        } else {
          // Corregir campos vacíos en existentes
          if (!existe.trimestre || !existe.regionId || !existe.aulaTerritorialId) {
            const rId = await getRegionId(p.region);
            const aId = rId ? await getAulaId(p.aula, rId) : undefined;
            await prisma.participante.update({
              where: { id: existe.id },
              data: {
                trimestre: existe.trimestre || 'I',
                regionId: rId || existe.regionId,
                aulaTerritorialId: aId || existe.aulaTerritorialId,
              }
            })
          }
        }
      }
    }
  }
  console.log(`✅ ${participantesCreados2026_1} nuevos participantes creados en el Periodo 2026-1.`)


  // ============================================================================
  // CARGA DEL PERIODO 2026-2
  // ============================================================================
  console.log('🌱 Creando periodo 2026-2 y participantes (Nuevos Ingresos)...')

  const periodo2 = await prisma.periodo.upsert({
    where: { anio_numero: { anio: 2026, numero: 2 } },
    update: { estado: 'ACTIVO' },
    create: {
      anio: 2026,
      numero: 2,
      modalidad: 'PRESENCIAL',
      estado: 'ACTIVO',
    }
  })

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
              trimestre: 'Introductorio', // ← valor correcto que coincide con el filtro de la UI
              periodoId: periodo2.id,
              regionId: rId,
              aulaTerritorialId: aId,
            }
          })
          participantesCreados2026_2++;
        } else {
          // Corregir case incorrecto y actualizar aula/región/periodo si faltaba o cambió
          const rId = await getRegionId(p.region);
          const aId = rId ? await getAulaId(p.aula, rId) : undefined;

          // Solo actualizamos si tenemos IDs válidos o si hay valores incorrectos que corregir
          const needsUpdate =
            existe.trimestre === 'INTRODUCTORIO' ||
            (!existe.periodoId) ||
            (!existe.aulaTerritorialId && aId) ||
            (!existe.regionId && rId) ||
            (aId && existe.aulaTerritorialId !== aId) ||
            (rId && existe.regionId !== rId);

          if (needsUpdate) {
            await prisma.participante.update({
              where: { id: existe.id },
              data: {
                trimestre: (existe.trimestre === 'INTRODUCTORIO') ? 'Introductorio' : existe.trimestre,
                periodoId: periodo2.id,
                // Solo sobreescribir region/aula si tenemos un valor válido nuevo
                ...(rId ? { regionId: rId } : {}),
                ...(aId ? { aulaTerritorialId: aId } : {}),
              }
            })
          }
        }
      }
    } else {
      console.error(`❌ No se encontró el archivo: ${filePath}`);
    }
  }

  console.log(`✅ ${participantesCreados2026_2} nuevos participantes creados en el Periodo 2026-2.`)

  // ============================================================================
  // SINCRONIZACIÓN DE SEGURIDAD: AULA SAN JUAN DE LOS MORROS (GUARICO)
  // ============================================================================
  console.log('🔄 Sincronizando y verificando participantes de San Juan de los Morros...')

  // NOTA: No usar mode:'insensitive' con operador 'in' — no está soportado por Prisma.
  // Buscar la región con OR explícito.
  const rGuarico = await prisma.region.findFirst({
    where: {
      OR: [
        { nombre: { equals: 'GUARICO', mode: 'insensitive' } },
        { nombre: { equals: 'GUÁRICO', mode: 'insensitive' } },
      ]
    }
  });

  if (rGuarico) {
    const aSanJuan = await prisma.aulaTerritorial.findFirst({
      where: {
        regionId: rGuarico.id,
        nombre: { contains: 'SAN JUAN', mode: 'insensitive' }
      }
    });

    if (aSanJuan) {
      // Lista completa de todos los participantes de San Juan de los Morros del lote 9
      const cedulasSanJuan = [
        "26680223", "19472503", "26051054", "19725322", "21574002", "20588924", "18972883",
        "28482996", "19985484", "28482417", "17353724", "28531232", "20233797", "27238538",
        "25887930", "20876287", "27238875", "10665343", "23564799", "22262963", "19461976",
        "15038349", "17251811", "17252776", "24237097", "21337857", "16098565", "27665428",
        "20587403", "22447656", "17271729", "27665403", "10668550", "26920246", "17272807",
        "20586003", "11683200", "18519777", "25480159", "17582790", "11117607", "13144756",
        "14146762", "16363102", "16804782", "15711551", "15081719", "25717399", "21335177",
        "26378002", "18617018", "19942258", "12842897", "10666999", "13152316", "12153754",
        "10674560", "27463347", "29761240", "26100506", "11119138"
      ];

      // Sincronización forzada: asignar región, aula y periodo a TODOS los participantes de SJM
      const resSj = await prisma.participante.updateMany({
        where: { cedula: { in: cedulasSanJuan } },
        data: {
          regionId: rGuarico.id,
          aulaTerritorialId: aSanJuan.id,
          periodoId: periodo2.id,
          trimestre: 'Introductorio',
        }
      });
      console.log(`✅ ${resSj.count} participantes vinculados correctamente al aula ${aSanJuan.nombre} (Región: ${rGuarico.nombre}, Periodo: 2026-2).`);
    } else {
      console.warn('⚠️  No se encontró el aula SAN JUAN DE LOS MORROS en la región GUARICO.');
    }
  } else {
    console.warn('⚠️  No se encontró la región GUARICO en la base de datos.');
  }

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
