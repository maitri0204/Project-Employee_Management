import prisma from "../config/database";
import { LeaveType } from "../types";
import { calculateLeaveDays } from "./leaveCalculation";
import {
  emptyLeaveBreakdown,
  getRequestBreakdown,
  LeaveBreakdown,
  LEAVE_TYPES,
} from "./leaveBreakdown";

/** Sum pending days per leave type (from breakdown on each pending request). */
export async function getPendingLeaveDays(
  employeeId: string,
  leaveType: LeaveType,
  excludeRequestId?: string
): Promise<number> {
  const pending = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "PENDING",
      ...(excludeRequestId ? { NOT: { id: excludeRequestId } } : {}),
    },
    select: {
      days: true,
      startDate: true,
      endDate: true,
      leaveType: true,
      leaveBreakdown: true,
    },
  });

  return pending.reduce((sum, request) => {
    const breakdown = getRequestBreakdown(request);
    return sum + (breakdown[leaveType] ?? 0);
  }, 0);
}

export async function getPendingBreakdownTotal(
  employeeId: string,
  excludeRequestId?: string
): Promise<LeaveBreakdown> {
  const pending = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "PENDING",
      ...(excludeRequestId ? { NOT: { id: excludeRequestId } } : {}),
    },
    select: {
      days: true,
      startDate: true,
      endDate: true,
      leaveType: true,
      leaveBreakdown: true,
    },
  });

  const total = emptyLeaveBreakdown();
  for (const request of pending) {
    const breakdown = getRequestBreakdown(request);
    for (const type of LEAVE_TYPES) {
      total[type] += breakdown[type];
    }
  }
  return total;
}
