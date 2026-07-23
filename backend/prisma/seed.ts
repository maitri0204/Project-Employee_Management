import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "maitripatel2608@gmail.com" },
    update: { role: "ADMIN" },
    create: {
      email: "maitripatel2608@gmail.com",
      role: "ADMIN",
      employee: {
        create: {
          firstName: "Maitri",
          lastName: "Patel",
          dateOfBirth: new Date("1990-01-01"),
          gender: "FEMALE",
          jobRole: null,
          addressLine1: "Main Street",
          country: "India",
          state: "Gujarat",
          city: "Ahmedabad",
          pincode: "380001",
          phone: "+919999999999",
          panNumber: "MAITR2608A",
          aadharNumber: "260826082608",
          bankAccountNumber: "0000000000",
          accountType: "INDIVIDUAL",
          ifscCode: "SBIN0000000",
          bankName: "State Bank of India",
          bankBranchName: "Main Branch",
          degreeCertificateUrls: [],
          leaveBalance: { create: { pl: 0, cl: 0, sl: 0 } },
        },
      },
    },
  });

  console.log("Seed complete:");
  console.log("  Admin: maitripatel2608@gmail.com");
  console.log("\nLogin with OTP - check server console for the 6-digit code.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
