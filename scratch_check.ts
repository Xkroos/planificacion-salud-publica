import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const regiones = await prisma.region.findMany();
  console.log('Regiones count:', regiones.length);
  const guaricos = regiones.filter(r => r.nombre.toUpperCase().includes('GUARICO'));
  console.log('Guarico regiones:', guaricos);

  const aulas = await prisma.aulaTerritorial.findMany({
    where: { nombre: { contains: 'SAN JUAN', mode: 'insensitive' } },
    include: { region: true }
  });
  console.log('Aulas San Juan:', aulas.map(a => ({ id: a.id, nombre: a.nombre, regionId: a.regionId, region: a.region?.nombre })));

  const partSanJuan = await prisma.participante.count({
    where: { aulaTerritorialId: { in: aulas.map(a => a.id) } }
  });
  console.log('Participantes con aulaTerritorialId de San Juan:', partSanJuan);

  const partGuarico = await prisma.participante.count({
    where: { regionId: { in: guaricos.map(g => g.id) } }
  });
  console.log('Participantes con regionId Guarico:', partGuarico);

  const sampleSJ = await prisma.participante.findFirst({
    where: { cedula: '26680223' }
  });
  console.log('Sample participant (26680223):', sampleSJ);

  const totalPart = await prisma.participante.count();
  console.log('Total participantes in DB:', totalPart);

  await prisma.$disconnect();
}
check();
