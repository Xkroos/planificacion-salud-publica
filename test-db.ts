import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    const user = await prisma.usuario.findUnique({ where: { email: 'admin@unerg.edu.ve' } });
    console.log('User:', user);
    if (user) {
      const match = await bcrypt.compare('admin123', user.password);
      console.log('Password match:', match);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
