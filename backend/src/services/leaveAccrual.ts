import prisma from "../config/database";
import { getCompletedMonthPeriods, getFinancialYear } from "./leaveCalendar";
import { getLeavePolicy } from "./leavePolicy";
import { syncEmployeeClSlBalance } from "./leaveBalance";

/** Credit pending PL months for one employee using global policy and joining date. */
export async function creditPendingPlForEmployee(
  employeeId: string,
  referenceDate = new Date()
): Promise<number> {
  const policy = await getLeavePolicy();
  if (!policy.plRepeatMonthly || policy.plMonthlyAllowance <= 0) return 0;

  let balance = await prisma.leaveBalance.findUnique({
    where: { employeeId },
    include: {
      employee: {
        select: { joiningDate: true, createdAt: true, firstName: true, lastName: true, isArchived: true },
      },
    },
  });

  if (!balance) {
    const { label: fyLabel } = getFinancialYear(referenceDate);
    await prisma.leaveBalance.create({
      data: {
        employeeId,
        pl: 0,
        cl: 0,
        sl: 0,
        lwpUsed: 0,
        lastClSlCreditFY: fyLabel,
      },
    });
    balance = await prisma.leaveBalance.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: { joiningDate: true, createdAt: true, firstName: true, lastName: true, isArchived: true },
        },
      },
    });
  }

  if (!balance || balance.employee.isArchived) return 0;

  const periods = getCompletedMonthPeriods(
    balance.employee.joiningDate ?? balance.employee.createdAt,
    referenceDate
  );
  let pl = balance.pl;
  let lastCredited = balance.lastPlAccrualPeriod;
  let monthsCredited = 0;

  for (const period of periods) {
    if (lastCredited && period <= lastCredited) continue;
    pl += policy.plMonthlyAllowance;
    lastCredited = period;
    monthsCredited += 1;
  }

  if (monthsCredited > 0) {
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { pl, lastPlAccrualPeriod: lastCredited },
    });
    console.log(
      `PL accrual: +${policy.plMonthlyAllowance * monthsCredited} for ${balance.employee.firstName} ${balance.employee.lastName}`
    );
  }

  return monthsCredited;
}

/** Credit or reset CL/SL for financial year (April–March). PL is not touched (carry forward). */
export async function creditClSlForFinancialYear(
  employeeId: string,
  referenceDate = new Date()
): Promise<boolean> {
  const policy = await getLeavePolicy();
  const { label: fyLabel } = getFinancialYear(referenceDate);

  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId },
    include: { employee: { select: { isArchived: true, firstName: true, lastName: true } } },
  });

  if (!balance || balance.employee.isArchived) return false;
  if (balance.lastClSlCreditFY === fyLabel) return false;

  await syncEmployeeClSlBalance(employeeId);
  await prisma.leaveBalance.update({
    where: { employeeId },
    data: { lastClSlCreditFY: fyLabel },
  });

  console.log(
    `FY ${fyLabel} CL/SL: ${policy.annualCl}/${policy.annualSl} for ${balance.employee.firstName} ${balance.employee.lastName}`
  );
  return true;
}

export async function processMonthlyPlAccrual(referenceDate = new Date()) {
  const employees = await prisma.employee.findMany({
    where: { NOT: { isArchived: true }, user: { role: "EMPLOYEE" } },
    select: { id: true },
  });

  let credited = 0;
  for (const employee of employees) {
    credited += await creditPendingPlForEmployee(employee.id, referenceDate);
  }
  return credited;
}

export async function processFinancialYearClSl(referenceDate = new Date()) {
  const employees = await prisma.employee.findMany({
    where: { NOT: { isArchived: true }, user: { role: "EMPLOYEE" } },
    select: { id: true },
  });

  let credited = 0;
  for (const employee of employees) {
    if (await creditClSlForFinancialYear(employee.id, referenceDate)) credited += 1;
  }
  return credited;
}

/** Initialize balance for a new employee from global policy. */
export async function initializeEmployeeLeaveBalance(employeeId: string) {
  const { label: fyLabel } = getFinancialYear();

  await prisma.leaveBalance.upsert({
    where: { employeeId },
    create: {
      employeeId,
      pl: 0,
      cl: 0,
      sl: 0,
      lwpUsed: 0,
      lastClSlCreditFY: fyLabel,
    },
    update: {},
  });

  await syncEmployeeClSlBalance(employeeId);
  await creditPendingPlForEmployee(employeeId);
}

export async function runLeaveAccrualJobs() {
  const plCount = await processMonthlyPlAccrual();
  const fyCount = await processFinancialYearClSl();
  if (plCount > 0 || fyCount > 0) {
    console.log(`Leave accrual: PL months=${plCount}, FY CL/SL employees=${fyCount}`);
  }
}

/** After global policy update, sync CL/SL for all employees and run PL catch-up. */
export async function applyPolicyToAllEmployees() {
  const employees = await prisma.employee.findMany({
    where: { NOT: { isArchived: true }, user: { role: "EMPLOYEE" } },
    select: { id: true },
  });

  for (const employee of employees) {
    await initializeEmployeeLeaveBalance(employee.id);
    await creditPendingPlForEmployee(employee.id);
    await syncEmployeeClSlBalance(employee.id);
  }
}
