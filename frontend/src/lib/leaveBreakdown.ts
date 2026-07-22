import { LeaveBalanceSummary, LeaveRequest, LeaveType } from "@/types";
import { getLeaveTotals } from "./leaveFormat";

export type LeaveBreakdown = Record<LeaveType, number>;

export const LEAVE_TYPES: LeaveType[] = ["PL", "CL", "SL", "LWP"];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  PL: "Privilege Leave (PL)",
  CL: "Casual Leave (CL)",
  SL: "Sick Leave (SL)",
  LWP: "Leave Without Pay (LWP)",
};

export function emptyLeaveBreakdown(): LeaveBreakdown {
  return { PL: 0, CL: 0, SL: 0, LWP: 0 };
}

export function sumLeaveBreakdown(breakdown: LeaveBreakdown): number {
  return LEAVE_TYPES.reduce((sum, type) => sum + (breakdown[type] ?? 0), 0);
}

export function formatLeaveBreakdownLabel(
  breakdown?: LeaveBreakdown | null,
  fallbackType?: string
): string {
  if (breakdown) {
    const parts = LEAVE_TYPES.filter((type) => breakdown[type] > 0).map(
      (type) => `${type}: ${breakdown[type]}`
    );
    if (parts.length > 0) return parts.join(" · ");
  }
  return fallbackType ?? "—";
}

export function getRequestBreakdownDisplay(request: {
  leaveType: string;
  days?: number | null;
  leaveBreakdown?: LeaveBreakdown | null;
}): string {
  if (request.leaveBreakdown) {
    return formatLeaveBreakdownLabel(request.leaveBreakdown);
  }
  if (request.days && request.leaveType && request.leaveType !== "MIXED") {
    return `${request.leaveType}: ${request.days}`;
  }
  return request.leaveType ?? "—";
}

export function breakdownFromRequest(request: {
  leaveType: string;
  days?: number | null;
  leaveBreakdown?: LeaveBreakdown | null;
}): LeaveBreakdown {
  if (request.leaveBreakdown) return { ...request.leaveBreakdown };
  const breakdown = emptyLeaveBreakdown();
  const type = request.leaveType as LeaveType;
  if (LEAVE_TYPES.includes(type) && (request.days ?? 0) > 0) {
    breakdown[type] = request.days!;
  }
  return breakdown;
}

export function sumPendingBreakdown(
  requests: { status: string; leaveType: string; days?: number | null; leaveBreakdown?: LeaveBreakdown | null }[]
): LeaveBreakdown {
  const total = emptyLeaveBreakdown();
  for (const request of requests) {
    if (request.status !== "PENDING") continue;
    const breakdown = breakdownFromRequest(request);
    for (const type of LEAVE_TYPES) {
      total[type] += breakdown[type];
    }
  }
  return total;
}

/** Available days per type after subtracting other pending requests. */
export function getAvailableLeaveByType(
  balance: LeaveBalanceSummary,
  pendingRequests: LeaveRequest[]
): LeaveBreakdown {
  const pending = sumPendingBreakdown(pendingRequests);
  const totals = getLeaveTotals(balance);
  const usage = balance.usage ?? { PL: 0, CL: 0, SL: 0, LWP: 0 };

  const clHalfAvailable = balance.clUsableThisHalf ?? balance.clHalfYear?.available ?? 0;
  const clAnnualRemaining = Math.max(0, (totals.CL ?? 0) - usage.CL - pending.CL);

  return {
    PL: Math.max(0, (balance.pl ?? 0) - pending.PL),
    SL: Math.max(0, (balance.sl ?? 0) - pending.SL),
    CL: Math.max(0, Math.min(clHalfAvailable, clAnnualRemaining)),
    LWP: Number.MAX_SAFE_INTEGER,
  };
}

export function validateLeaveAllocationAgainstBalance(
  allocation: LeaveBreakdown,
  available: LeaveBreakdown
): string[] {
  const errors: string[] = [];
  for (const type of ["PL", "CL", "SL"] as LeaveType[]) {
    if (allocation[type] > available[type]) {
      errors.push(
        `Insufficient ${type} balance. Available: ${available[type]} day(s), but you allocated ${allocation[type]}.`
      );
    }
  }
  return errors;
}

export function typeExceedsAvailable(
  type: LeaveType,
  allocation: LeaveBreakdown,
  available: LeaveBreakdown
): boolean {
  if (type === "LWP") return false;
  return allocation[type] > available[type];
}
