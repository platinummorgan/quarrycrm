// Release Prisma's PostgreSQL advisory lock
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('SELECT pg_advisory_unlock_all()');
    console.log('✓ Released all advisory locks');
  } catch (err) {
    console.error('Failed to release locks:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
