import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({ select: { id: true, isArchived: true } });

  let updated = 0;
  for (const employee of employees) {
    if (employee.isArchived !== true) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { isArchived: false },
      });
      updated += 1;
    }
  }

  console.log(`Backfilled isArchived on ${updated} employee record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
