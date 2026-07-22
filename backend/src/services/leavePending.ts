import prisma from "../config/database";
import { LeaveType } from "../types";
import { calculateLeaveDays } from "./leaveCalculation";

/** Sum days from pending leave requests of a given type (not yet approved). */
export async function getPendingLeaveDays(
  employeeId: string,
  leaveType: LeaveType,
  excludeRequestId?: string
): Promise<number> {
  const pending = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      leaveType,
      status: "PENDING",
      ...(excludeRequestId ? { NOT: { id: excludeRequestId } } : {}),
    },
    select: { days: true, startDate: true, endDate: true },
  });

  return pending.reduce((sum, request) => {
    const days =
      request.days ?? calculateLeaveDays(request.startDate, request.endDate).totalDays;
    return sum + days;
  }, 0);
}
