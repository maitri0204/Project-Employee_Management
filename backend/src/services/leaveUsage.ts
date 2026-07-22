import prisma from "../config/database";
import { LeaveType } from "../types";
import { getLeavePolicy } from "./leavePolicy";
import { creditPendingPlForEmployee } from "./leaveAccrual";
import { refreshEmployeeLeaveBalances } from "./leaveSync";
import { getClHalfYearInfo } from "./leaveClHalfYear";
import { getCompletedMonthPeriods } from "./leaveCalendar";
import { batchGetEmployeeLeaveSummaries } from "./leaveSummaryBatch";
import { addBreakdownToUsage, emptyLeaveBreakdown, getRequestBreakdown } from "./leaveBreakdown";

export type LeaveUsageBreakdown = {
  PL: number;
  CL: number;
  SL: number;
  LWP: number;
};

export async function getApprovedLeaveUsage(employeeId: string): Promise<LeaveUsageBreakdown> {
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId, status: "APPROVED" },
    select: { leaveType: true, days: true, leaveBreakdown: true },
  });

  let usage = emptyLeaveBreakdown();

  for (const request of requests) {
    usage = addBreakdownToUsage(usage, getRequestBreakdown(request));
  }

  return usage;
}

export async function getEmployeeLeaveSummary(
  employeeId: string,
  options: { refresh?: boolean | "pl-only" } = {}
) {
  const refresh = options.refresh ?? false;

  if (refresh === true) {
    await refreshEmployeeLeaveBalances(employeeId);
  } else if (refresh === "pl-only") {
    await creditPendingPlForEmployee(employeeId);
  }

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
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    getLeavePolicy(),
  ]);

  const clHalfYear = await getClHalfYearInfo(employeeId, policy.annualCl);

  const joinDate = employee?.joiningDate ?? employee?.createdAt ?? new Date();
  const plAccruedMonths =
    policy.plRepeatMonthly && policy.plMonthlyAllowance > 0
      ? getCompletedMonthPeriods(joinDate).length
      : 0;
  const plEntitledFromPolicy = plAccruedMonths * policy.plMonthlyAllowance;
  const plFromBalance = usage.PL + (balance?.pl ?? 0);
  const plTotal = Math.max(plEntitledFromPolicy, plFromBalance);

  return {
    employee,
    balance: balance ?? { pl: 0, cl: 0, sl: 0, lwpUsed: 0 },
    usage,
    totals: {
      PL: plTotal,
      CL: policy.annualCl,
      SL: policy.annualSl,
    },
    available: {
      pl: balance?.pl ?? 0,
      cl: clHalfYear.annualRemaining,
      sl: balance?.sl ?? 0,
    },
    clTotal: policy.annualCl,
    slTotal: policy.annualSl,
    plTotal,
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
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      joiningDate: true,
      user: { select: { email: true } },
    },
  });

  const ids = employees.map((e) => e.id);
  const summaries = await batchGetEmployeeLeaveSummaries(ids);

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: { in: ids } },
  });
  const balanceMap = new Map(balances.map((b) => [b.employeeId, b]));

  return employees.map((employee) => {
    const summary = summaries.get(employee.id);
    const balance = balanceMap.get(employee.id);
    return {
      employee,
      balance: balance ?? { pl: 0, cl: 0, sl: 0, lwpUsed: 0 },
      usage: summary?.usage ?? { PL: 0, CL: 0, SL: 0, LWP: 0 },
      totals: summary?.totals ?? { PL: 0, CL: 0, SL: 0 },
      available: {
        pl: balance?.pl ?? 0,
        cl: summary?.totals.CL ?? 0,
        sl: balance?.sl ?? 0,
      },
      clTotal: summary?.clTotal ?? 0,
      slTotal: summary?.slTotal ?? 0,
      plTotal: summary?.plTotal ?? 0,
      lwpTaken: summary?.usage?.LWP ?? balance?.lwpUsed ?? 0,
    };
  });
}
