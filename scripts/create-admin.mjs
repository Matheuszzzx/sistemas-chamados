import { PrismaClient, PersonRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;

if (!name || !email || !password) {
  throw new Error('Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env.');
}
if (password.length < 12 || password.length > 128) {
  throw new Error('ADMIN_PASSWORD deve ter entre 12 e 128 caracteres.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('Defina DATABASE_URL no arquivo .env.');
}
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve conter pelo menos 32 caracteres.');
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.person.findUnique({ where: { email } });
  if (existing && !existing.isAdmin) {
    throw new Error(
      'Já existe uma pessoa com ADMIN_EMAIL. Use outro e-mail para a conta administrativa.',
    );
  }
  const passwordHash = await hash(password, 12);
  const admin = existing
    ? await prisma.person.update({
        where: { id: existing.id },
        data: { name, active: true, isAdmin: true, passwordHash },
        select: { id: true, name: true, email: true },
      })
    : await prisma.person.create({
        data: {
          name,
          email,
          role: PersonRole.TECHNICIAN,
          isAdmin: true,
          passwordHash,
        },
        select: { id: true, name: true, email: true },
      });
  console.log(`Administrador configurado: ${admin.email}`);
} finally {
  await prisma.$disconnect();
}
