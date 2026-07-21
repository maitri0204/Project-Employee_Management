import prisma from "../config/database";
import { LeaveType } from "../types";
import { getLeavePolicy } from "./leavePolicy";
import { syncEmployeeClSlBalance } from "./leaveBalance";
import { getClHalfYearInfo } from "./leaveClHalfYear";

export type LeaveUsageBreakdown = {
  PL: number;
  CL: number;
  SL: number;
  LWP: number;
};

export async function getApprovedLeaveUsage(employeeId: string): Promise<LeaveUsageBreakdown> {
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId, status: "APPROVED" },
    select: { leaveType: true, days: true },
  });

  const usage: LeaveUsageBreakdown = { PL: 0, CL: 0, SL: 0, LWP: 0 };

  for (const request of requests) {
    const type = request.leaveType as LeaveType;
    if (type in usage) {
      usage[type] += request.days ?? 0;
    }
  }

  return usage;
}

export async function getEmployeeLeaveSummary(employeeId: string) {
  await syncEmployeeClSlBalance(employeeId);

  const [balance, usage, employee, policy] = await Promise.all([
    prisma.leaveBalance.findUnique({ where: { employeeId } }),
    getApprovedLeaveUsage(employeeId),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        joiningDate: true,
        user: { select: { email: true } },
      },
    }),
    getLeavePolicy(),
  ]);

  const clHalfYear = await getClHalfYearInfo(employeeId, policy.annualCl);

  return {
    employee,
    balance: balance ?? { pl: 0, cl: 0, sl: 0, lwpUsed: 0 },
    usage,
    available: {
      pl: balance?.pl ?? 0,
      cl: clHalfYear.annualRemaining,
      sl: balance?.sl ?? 0,
    },
    clTotal: policy.annualCl,
    clUsableThisHalf: clHalfYear.available,
    clHalfYear,
    lwpTaken: usage.LWP || balance?.lwpUsed || 0,
  };
}

export async function getAllEmployeesLeaveUsage() {
  const employees = await prisma.employee.findMany({
    where: {
      NOT: { isArchived: true },
      user: { role: "EMPLOYEE" },
    },
    select: { id: true },
  });

  const summaries = await Promise.all(
    employees.map((employee) => getEmployeeLeaveSummary(employee.id))
  );

  return summaries;
}
