import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  try {
    const res = await prisma.cronograma.findMany({
      where: { periodo: { estado: 'ACTIVO' } }
    })
    console.log('Success:', res.length)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}
test()
