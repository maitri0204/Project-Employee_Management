import { LeaveUsageBreakdown } from "@/types";

export function formatUsedTotal(used: number, total: number | undefined | null): string {
  if (total === undefined || total === null) return String(used);
  return `${used}/${total}`;
}

export type LeaveTotals = {
  PL?: number;
  CL?: number;
  SL?: number;
};

export function getLeaveTotals(summary: {
  totals?: LeaveTotals;
  plTotal?: number;
  clTotal?: number;
  slTotal?: number;
  policy?: { annualCl?: number; annualSl?: number };
  usage?: LeaveUsageBreakdown;
  balance?: { pl?: number; cl?: number; sl?: number };
}): LeaveTotals {
  const usage = summary.usage ?? { PL: 0, CL: 0, SL: 0, LWP: 0 };
  return {
    PL:
      summary.totals?.PL ??
      summary.plTotal ??
      usage.PL + (summary.balance?.pl ?? 0),
    CL: summary.totals?.CL ?? summary.clTotal ?? summary.policy?.annualCl ?? 0,
    SL: summary.totals?.SL ?? summary.slTotal ?? summary.policy?.annualSl ?? 0,
  };
}
