import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { role: "SUPERADMIN" },
    data: { role: "ADMIN" },
  });

  const adminProfiles = [
    {
      email: "maitripatel2608@gmail.com",
      firstName: "Maitri",
      lastName: "Patel",
      gender: "FEMALE",
      phone: "+919999999999",
      panNumber: "MAITR2608A",
      aadharNumber: "260826082608",
    },
    {
      email: "hello@admitra.io",
      firstName: "Makrand",
      lastName: "Bhatt",
      gender: "MALE",
      phone: "+919999999998",
      panNumber: "MAKRBHATT1A",
      aadharNumber: "260826082609",
    },
  ];

  for (const profile of adminProfiles) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { role: "ADMIN" },
      create: {
        email: profile.email,
        role: "ADMIN",
      },
      include: { employee: true },
    });

    if (user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
      });
      continue;
    }

    await prisma.employee.create({
      data: {
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: new Date("1990-01-01"),
        gender: profile.gender,
        jobRole: "Admin",
        addressLine1: "Main Street",
        country: "India",
        state: "Gujarat",
        city: "Ahmedabad",
        pincode: "380001",
        phone: profile.phone,
        panNumber: profile.panNumber,
        aadharNumber: profile.aadharNumber,
        bankAccountNumber: "0000000000",
        accountType: "INDIVIDUAL",
        ifscCode: "SBIN0000000",
        bankName: "State Bank of India",
        bankBranchName: "Main Branch",
        degreeCertificateUrls: [],
        leaveBalance: { create: { pl: 0, cl: 0, sl: 0 } },
      },
    });
  }

  console.log("Seed complete:");
  console.log("  Admin: maitripatel2608@gmail.com");
  console.log("  Admin: hello@admitra.io");
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
