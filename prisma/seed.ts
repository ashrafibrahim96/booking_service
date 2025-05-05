import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.provider.create({
    data: {
      id: 'provider-1',
      name: 'Dr. Example',
      timezone: 'Europe/Berlin',
    },
  });
}

main()
  .then(() => {
    console.log('Seed complete.');
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
