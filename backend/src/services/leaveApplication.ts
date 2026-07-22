import prisma from "../config/database";
import { LeaveType } from "../types";
import { getLeavePolicy } from "./leavePolicy";
import { getPendingLeaveDays } from "./leavePending";
import { validateClDayAllocation, getClHalfYearInfo } from "./leaveClHalfYear";
import {
  LeaveBreakdown,
  LEAVE_TYPES,
  sumLeaveBreakdown,
} from "./leaveBreakdown";

type BalanceRow = { pl: number; cl: number; sl: number };

export async function validateLeaveBreakdownApplication(params: {
  employeeId: string;
  balance: BalanceRow;
  breakdown: LeaveBreakdown;
  totalDays: number;
  start: Date;
  end: Date;
  sandwichDays: number;
  excludeRequestId?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { employeeId, balance, breakdown, totalDays, start, end, sandwichDays, excludeRequestId } =
    params;

  const allocated = sumLeaveBreakdown(breakdown);
  if (allocated !== totalDays) {
    return {
      ok: false,
      message: `Please allocate exactly ${totalDays} day(s) across leave types. You have allocated ${allocated} day(s).`,
    };
  }

  const policy = await getLeavePolicy();
  const sandwichNote = sandwichDays > 0 ? ` (includes ${sandwichDays} sandwich day(s))` : "";

  if (breakdown.CL > 0) {
    const clCheck = await validateClDayAllocation(
      employeeId,
      policy.annualCl,
      breakdown.CL,
      start,
      end,
      excludeRequestId
    );
    if (!clCheck.ok) {
      return { ok: false, message: clCheck.message ?? "CL limit exceeded for this period." };
    }

    const clInfo = await getClHalfYearInfo(employeeId, policy.annualCl, new Date(), {
      includePending: true,
      excludeRequestId,
    });

    if (breakdown.CL > clInfo.annualRemaining) {
      return {
        ok: false,
        message: `Insufficient CL balance. Required: ${breakdown.CL}${sandwichNote}. Available after pending requests: ${clInfo.annualRemaining} day(s). Leave is deducted only after admin approval.`,
      };
    }

    if (breakdown.CL > clInfo.available) {
      const halfLabel = clInfo.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar";
      return {
        ok: false,
        message: `You can use only ${clInfo.available} CL day(s) in ${halfLabel} (half-year limit). Leave is deducted only after admin approval.`,
      };
    }
  }

  const balanceMap: Record<"PL" | "SL", keyof BalanceRow> = { PL: "pl", SL: "sl" };

  for (const type of ["PL", "SL"] as const) {
    const needed = breakdown[type];
    if (needed <= 0) continue;

    const pendingSameType = await getPendingLeaveDays(employeeId, type, excludeRequestId);
    const available = balance[balanceMap[type]] - pendingSameType;

    if (needed > available) {
      const pendingNote =
        pendingSameType > 0 ? ` (${pendingSameType} day(s) already in pending requests)` : "";
      return {
        ok: false,
        message: `Insufficient ${type} leave balance. Required: ${needed}${sandwichNote}. Available: ${Math.max(0, available)} day(s)${pendingNote}. Leave is deducted only after admin approval.`,
      };
    }
  }

  if (breakdown.LWP > 0 && breakdown.LWP > totalDays) {
    return { ok: false, message: "Invalid LWP allocation." };
  }

  return { ok: true };
}

export async function validateLeaveBreakdownApproval(params: {
  employeeId: string;
  balance: BalanceRow & { lwpUsed: number; id: string };
  breakdown: LeaveBreakdown;
  start: Date;
  end: Date;
  excludeRequestId?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return validateLeaveBreakdownApplication({
    employeeId: params.employeeId,
    balance: params.balance,
    breakdown: params.breakdown,
    totalDays: sumLeaveBreakdown(params.breakdown),
    start: params.start,
    end: params.end,
    sandwichDays: 0,
    excludeRequestId: params.excludeRequestId,
  });
}

export async function deductApprovedLeaveBreakdown(
  balanceId: string,
  balance: BalanceRow & { lwpUsed: number },
  breakdown: LeaveBreakdown
): Promise<void> {
  const data: { pl?: number; cl?: number; sl?: number; lwpUsed?: number } = {};

  if (breakdown.PL > 0) data.pl = balance.pl - breakdown.PL;
  if (breakdown.CL > 0) data.cl = Math.max(0, balance.cl - breakdown.CL);
  if (breakdown.SL > 0) data.sl = balance.sl - breakdown.SL;
  if (breakdown.LWP > 0) data.lwpUsed = balance.lwpUsed + breakdown.LWP;

  if (Object.keys(data).length > 0) {
    await prisma.leaveBalance.update({
      where: { id: balanceId },
      data,
    });
  }
}

export function hasPaidLeaveInBreakdown(breakdown: LeaveBreakdown): boolean {
  return LEAVE_TYPES.some((type) => type !== "LWP" && breakdown[type] > 0);
}
