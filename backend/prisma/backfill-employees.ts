import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();

  let updated = 0;

  for (const employee of employees) {
    const needsUpdate =
      !employee.jobRole ||
      !employee.addressLine1 ||
      !employee.country ||
      !employee.state ||
      !employee.city ||
      !employee.pincode ||
      !employee.accountType ||
      !employee.degreeCertificateUrls;

    if (!needsUpdate) continue;

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        jobRole: employee.jobRole || "Ops",
        addressLine1: employee.addressLine1 || "Not provided",
        country: employee.country || "India",
        state: employee.state || "Not provided",
        city: employee.city || "Not provided",
        pincode: employee.pincode || "000000",
        accountType: employee.accountType || "INDIVIDUAL",
        degreeCertificateUrls: employee.degreeCertificateUrls?.length
          ? employee.degreeCertificateUrls
          : [],
      },
    });

    updated++;
  }

  console.log(`Backfilled ${updated} employee record(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
