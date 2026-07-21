import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_EMAILS = new Set(["s@s.com", "maitripatel2608@gmail.com"]);

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  const toDelete = users.filter((user) => !KEEP_EMAILS.has(user.email.toLowerCase()));

  if (toDelete.length === 0) {
    console.log("No users to delete. Database already contains only the allowed accounts.");
    return;
  }

  for (const user of toDelete) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted: ${user.email}`);
  }

  console.log(`\nCleanup complete. Kept: ${[...KEEP_EMAILS].join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
