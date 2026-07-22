import prisma from "../config/database";
import { LeaveType } from "../types";
import { getCompletedMonthPeriods } from "./leaveCalendar";
import { getLeavePolicy } from "./leavePolicy";
import { processMonthlyPlAccrual } from "./leaveAccrual";
import { LeaveUsageBreakdown } from "./leaveUsage";

const emptyUsage = (): LeaveUsageBreakdown => ({ PL: 0, CL: 0, SL: 0, LWP: 0 });

function accumulateUsage(
  map: Map<string, LeaveUsageBreakdown>,
  employeeId: string,
  leaveType: string,
  days: number
) {
  const usage = map.get(employeeId) ?? emptyUsage();
  const type = leaveType as LeaveType;
  if (type in usage) {
    usage[type] += days;
  }
  map.set(employeeId, usage);
}

export type LeaveTotals = { PL: number; CL: number; SL: number };

export type EmployeeLeaveSummaryData = {
  usage: LeaveUsageBreakdown;
  totals: LeaveTotals;
  plTotal: number;
  clTotal: number;
  slTotal: number;
};

/** Fast batch summaries for list views — one policy fetch, bulk queries (no accrual on read). */
export async function batchGetEmployeeLeaveSummaries(
  employeeIds: string[],
  options: { runAccrual?: boolean } = { runAccrual: false }
): Promise<Map<string, EmployeeLeaveSummaryData>> {
  const result = new Map<string, EmployeeLeaveSummaryData>();
  if (employeeIds.length === 0) return result;

  if (options.runAccrual) {
    await processMonthlyPlAccrual();
  }

  const [policy, balances, approvedRequests, employees] = await Promise.all([
    getLeavePolicy(),
    prisma.leaveBalance.findMany({ where: { employeeId: { in: employeeIds } } }),
    prisma.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: "APPROVED" },
      select: { employeeId: true, leaveType: true, days: true },
    }),
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, joiningDate: true, createdAt: true },
    }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.employeeId, b]));
  const usageMap = new Map<string, LeaveUsageBreakdown>();

  for (const request of approvedRequests) {
    accumulateUsage(usageMap, request.employeeId, request.leaveType, request.days ?? 0);
  }

  for (const employee of employees) {
    const usage = usageMap.get(employee.id) ?? emptyUsage();
    const balance = balanceMap.get(employee.id);
    const joinDate = employee.joiningDate ?? employee.createdAt;
    const plMonths =
      policy.plRepeatMonthly && policy.plMonthlyAllowance > 0
        ? getCompletedMonthPeriods(joinDate).length
        : 0;
    const plEntitled = plMonths * policy.plMonthlyAllowance;
    const plTotal = Math.max(plEntitled, usage.PL + (balance?.pl ?? 0));

    result.set(employee.id, {
      usage,
      totals: { PL: plTotal, CL: policy.annualCl, SL: policy.annualSl },
      plTotal,
      clTotal: policy.annualCl,
      slTotal: policy.annualSl,
    });
  }

  return result;
}
