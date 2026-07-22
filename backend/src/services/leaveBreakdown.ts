import { LeaveType } from "../types";

export type LeaveBreakdown = Record<LeaveType, number>;

export const LEAVE_TYPES: LeaveType[] = ["PL", "CL", "SL", "LWP"];

export function emptyLeaveBreakdown(): LeaveBreakdown {
  return { PL: 0, CL: 0, SL: 0, LWP: 0 };
}

export function sumLeaveBreakdown(breakdown: LeaveBreakdown): number {
  return LEAVE_TYPES.reduce((sum, type) => sum + (breakdown[type] ?? 0), 0);
}

export function parseLeaveBreakdownInput(raw: unknown): LeaveBreakdown | null {
  if (!raw || typeof raw !== "object") return null;

  const breakdown = emptyLeaveBreakdown();
  let hasPositive = false;

  for (const type of LEAVE_TYPES) {
    const value = (raw as Record<string, unknown>)[type];
    if (value === undefined || value === null || value === "") continue;
    const days = Number(value);
    if (!Number.isFinite(days) || days < 0 || !Number.isInteger(days)) return null;
    breakdown[type] = days;
    if (days > 0) hasPositive = true;
  }

  return hasPositive ? breakdown : null;
}

export function getRequestBreakdown(request: {
  leaveType: string;
  days?: number | null;
  leaveBreakdown?: unknown;
}): LeaveBreakdown {
  const parsed = parseLeaveBreakdownInput(request.leaveBreakdown);
  if (parsed) return parsed;

  const days = request.days ?? 0;
  const breakdown = emptyLeaveBreakdown();
  const type = request.leaveType as LeaveType;
  if (LEAVE_TYPES.includes(type) && days > 0) {
    breakdown[type] = days;
  }
  return breakdown;
}

export function resolveLeaveTypeLabel(breakdown: LeaveBreakdown): string {
  const used = LEAVE_TYPES.filter((type) => breakdown[type] > 0);
  if (used.length === 0) return "-";
  if (used.length === 1) return used[0];
  return "MIXED";
}

export function formatLeaveBreakdownLabel(breakdown: LeaveBreakdown): string {
  const parts = LEAVE_TYPES.filter((type) => breakdown[type] > 0).map(
    (type) => `${type}: ${breakdown[type]}`
  );
  return parts.length > 0 ? parts.join(" · ") : "-";
}

export function addBreakdownToUsage(
  usage: LeaveBreakdown,
  breakdown: LeaveBreakdown
): LeaveBreakdown {
  const next = { ...usage };
  for (const type of LEAVE_TYPES) {
    next[type] += breakdown[type] ?? 0;
  }
  return next;
}
