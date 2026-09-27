const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT
      name,
      default_version,
      installed_version
    FROM pg_available_extensions
    WHERE name = 'vector'
  `;

  console.log(result);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });