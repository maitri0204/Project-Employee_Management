import prisma from "../config/database";
import { getFinancialYear } from "./leaveCalendar";
import { getClHalfYearInfo } from "./leaveClHalfYear";
import { getLeavePolicy } from "./leavePolicy";
import { getApprovedLeaveUsage } from "./leaveUsage";

/** Sync CL/SL balances from global policy minus approved usage (CL uses half-year rules). */
export async function syncEmployeeClSlBalance(employeeId: string): Promise<void> {
  const policy = await getLeavePolicy();
  const usage = await getApprovedLeaveUsage(employeeId);
  const clInfo = await getClHalfYearInfo(employeeId, policy.annualCl);
  const slAvailable = Math.max(0, policy.annualSl - usage.SL);
  const { label: fyLabel } = getFinancialYear();

  await prisma.leaveBalance.upsert({
    where: { employeeId },
    create: {
      employeeId,
      pl: 0,
      cl: clInfo.annualRemaining,
      sl: slAvailable,
      lwpUsed: usage.LWP,
      lastClSlCreditFY: fyLabel,
    },
    update: {
      cl: clInfo.annualRemaining,
      sl: slAvailable,
    },
  });
}
