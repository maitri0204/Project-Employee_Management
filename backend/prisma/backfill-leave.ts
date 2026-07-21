import { PrismaClient } from "@prisma/client";
import { getEffectiveJoiningDate } from "../src/services/leaveCalendar";
import { initializeEmployeeLeaveBalance } from "../src/services/leaveAccrual";
import { getLeavePolicy } from "../src/services/leavePolicy";

const prisma = new PrismaClient();

async function main() {
  await getLeavePolicy();

  const employees = await prisma.employee.findMany({
    where: { user: { role: "EMPLOYEE" } },
    include: { leaveBalance: true },
  });

  for (const employee of employees) {
    const joiningDate = employee.joiningDate
      ? employee.joiningDate
      : getEffectiveJoiningDate(employee.createdAt);

    await prisma.employee.update({
      where: { id: employee.id },
      data: { joiningDate },
    });

    await initializeEmployeeLeaveBalance(employee.id);
    console.log(`Migrated: ${employee.firstName} ${employee.lastName}`);
  }

  console.log("Leave migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
