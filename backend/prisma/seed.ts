import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const adminEmployeeData = {
  firstName: "Admin",
  lastName: "User",
  dateOfBirth: new Date("1990-01-01"),
  gender: "MALE",
  jobRole: "Ops",
  addressLine1: "123 Admin Street",
  addressLine2: null,
  addressLine3: null,
  country: "India",
  state: "Maharashtra",
  city: "Mumbai",
  pincode: "400001",
  phone: "+919876543210",
  panNumber: "AAAAA0000A",
  aadharNumber: "123456789012",
  bankAccountNumber: "1234567890",
  accountType: "INDIVIDUAL",
  ifscCode: "SBIN0001234",
  bankName: "State Bank of India",
  bankBranchName: "Mumbai Main",
  degreeCertificateUrls: [],
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      role: "ADMIN",
      employee: {
        create: {
          ...adminEmployeeData,
          leaveBalance: { create: { pl: 0, cl: 0, sl: 0 } },
        },
      },
    },
  });

  const maitriAdmin = await prisma.user.upsert({
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
          jobRole: "Ops",
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

  const employee = await prisma.user.upsert({
    where: { email: "employee@company.com" },
    update: {},
    create: {
      email: "employee@company.com",
      role: "EMPLOYEE",
      employee: {
        create: {
          firstName: "John",
          middleName: "Kumar",
          lastName: "Doe",
          dateOfBirth: new Date("1995-06-15"),
          gender: "MALE",
          jobRole: "Education Counselor",
          addressLine1: "456 Employee Lane",
          country: "India",
          state: "Karnataka",
          city: "Bangalore",
          pincode: "560001",
          phone: "+919876543211",
          panNumber: "BBBBB0000B",
          aadharNumber: "987654321098",
          bankAccountNumber: "0987654321",
          accountType: "INDIVIDUAL",
          ifscCode: "HDFC0001234",
          bankName: "HDFC Bank",
          bankBranchName: "Bangalore Koramangala",
          degreeCertificateUrls: [],
          leaveBalance: { create: { pl: 12, cl: 8, sl: 6 } },
        },
      },
    },
  });

  console.log("Seed data created:");
  console.log(`  Admin:    ${admin.email}`);
  console.log(`  Admin:    ${maitriAdmin.email}`);
  console.log(`  Employee: ${employee.email}`);
  console.log("\nLogin with OTP – check server console for the 6-digit code.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
