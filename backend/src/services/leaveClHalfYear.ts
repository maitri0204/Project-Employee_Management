import prisma from "../config/database";
import { getFinancialYear } from "./leaveCalendar";
import { calculateLeaveDays } from "./leaveCalculation";
import { getRequestBreakdown } from "./leaveBreakdown";

export type FinancialHalf = "H1" | "H2";

export function getFinancialYearHalfRanges(startYear: number) {
  return {
    h1Start: new Date(startYear, 3, 1),
    h1End: new Date(startYear, 8, 30),
    h2Start: new Date(startYear, 9, 1),
    h2End: new Date(startYear + 1, 2, 31),
  };
}

export function getCurrentFinancialHalf(referenceDate = new Date()): FinancialHalf {
  const month = referenceDate.getMonth();
  return month >= 3 && month <= 8 ? "H1" : "H2";
}

function overlapLeaveDays(
  leaveStart: Date,
  leaveEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const start = new Date(leaveStart.getFullYear(), leaveStart.getMonth(), leaveStart.getDate());
  const end = new Date(leaveEnd.getFullYear(), leaveEnd.getMonth(), leaveEnd.getDate());
  const rangeS = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const rangeE = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  const overlapStart = start > rangeS ? start : rangeS;
  const overlapEnd = end < rangeE ? end : rangeE;
  if (overlapStart > overlapEnd) return 0;

  return calculateLeaveDays(overlapStart, overlapEnd).totalDays;
}

type LeaveRequestRow = {
  startDate: Date;
  endDate: Date;
  leaveType: string;
  days: number | null;
  leaveBreakdown: unknown;
};

type FetchClOptions = {
  excludeRequestId?: string;
  includePending?: boolean;
};

async function fetchLeaveRequestsForCl(
  employeeId: string,
  options: FetchClOptions = {}
): Promise<LeaveRequestRow[]> {
  const statuses = options.includePending ? ["APPROVED", "PENDING"] : ["APPROVED"];
  return prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: statuses },
      ...(options.excludeRequestId ? { NOT: { id: options.excludeRequestId } } : {}),
    },
    select: {
      startDate: true,
      endDate: true,
      leaveType: true,
      days: true,
      leaveBreakdown: true,
    },
  });
}

export function splitClDaysByHalf(
  startDate: Date,
  endDate: Date,
  startYear: number
): { h1Days: number; h2Days: number } {
  const { h1Start, h1End, h2Start, h2End } = getFinancialYearHalfRanges(startYear);
  return {
    h1Days: overlapLeaveDays(startDate, endDate, h1Start, h1End),
    h2Days: overlapLeaveDays(startDate, endDate, h2Start, h2End),
  };
}

function allocateClDaysToHalf(
  request: LeaveRequestRow,
  startYear: number,
  half: FinancialHalf
): number {
  const clDays = getRequestBreakdown(request).CL;
  if (clDays <= 0) return 0;

  const { h1Days, h2Days } = splitClDaysByHalf(request.startDate, request.endDate, startYear);
  const totalWorking = h1Days + h2Days;

  if (totalWorking === 0) {
    const inH1 = getCurrentFinancialHalf(request.startDate) === "H1";
    return half === "H1" ? (inH1 ? clDays : 0) : inH1 ? 0 : clDays;
  }

  const inHalf = half === "H1" ? h1Days : h2Days;
  return Math.round((clDays * inHalf) / totalWorking);
}

function sumClDaysInHalf(
  requests: LeaveRequestRow[],
  startYear: number,
  half: FinancialHalf
): number {
  return requests.reduce((sum, request) => sum + allocateClDaysToHalf(request, startYear, half), 0);
}

export type ClHalfYearInfo = {
  available: number;
  annualCl: number;
  firstHalfMax: number;
  secondHalfMax: number;
  h1Used: number;
  h2Used: number;
  carriedFromH1: number;
  currentHalf: FinancialHalf;
  totalUsed: number;
  annualRemaining: number;
};

function buildClHalfYearInfo(
  annualCl: number,
  h1Used: number,
  h2Used: number,
  referenceDate = new Date()
): ClHalfYearInfo {
  const firstHalfMax = Math.floor(annualCl / 2);
  const secondHalfMax = annualCl - firstHalfMax;
  const carriedFromH1 = Math.max(0, firstHalfMax - h1Used);
  const currentHalf = getCurrentFinancialHalf(referenceDate);

  let periodAvailable: number;
  if (currentHalf === "H1") {
    periodAvailable = Math.max(0, firstHalfMax - h1Used);
  } else {
    periodAvailable = Math.max(0, secondHalfMax + carriedFromH1 - h2Used);
  }

  const totalUsed = h1Used + h2Used;
  const annualRemaining = Math.max(0, annualCl - totalUsed);
  const available = Math.min(periodAvailable, annualRemaining);

  return {
    available,
    annualCl,
    firstHalfMax,
    secondHalfMax,
    h1Used,
    h2Used,
    carriedFromH1,
    currentHalf,
    totalUsed,
    annualRemaining,
  };
}

export async function getClHalfYearInfo(
  employeeId: string,
  annualCl: number,
  referenceDate = new Date(),
  options: FetchClOptions = {}
): Promise<ClHalfYearInfo> {
  const { startYear } = getFinancialYear(referenceDate);
  const requests = await fetchLeaveRequestsForCl(employeeId, options);
  const h1Used = sumClDaysInHalf(requests, startYear, "H1");
  const h2Used = sumClDaysInHalf(requests, startYear, "H2");
  return buildClHalfYearInfo(annualCl, h1Used, h2Used, referenceDate);
}

function allocateNewClDaysToHalves(
  clDays: number,
  startDate: Date,
  endDate: Date,
  startYear: number
): { clH1: number; clH2: number } {
  const { h1Days, h2Days } = splitClDaysByHalf(startDate, endDate, startYear);
  const totalWorking = h1Days + h2Days;

  if (totalWorking === 0) {
    const half = getCurrentFinancialHalf(startDate);
    return half === "H1" ? { clH1: clDays, clH2: 0 } : { clH1: 0, clH2: clDays };
  }

  const clH1 = Math.round((clDays * h1Days) / totalWorking);
  return { clH1, clH2: clDays - clH1 };
}

export async function validateClDayAllocation(
  employeeId: string,
  annualCl: number,
  clDays: number,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<{ ok: boolean; message?: string }> {
  if (clDays <= 0) return { ok: true };

  const { startYear } = getFinancialYear(startDate);
  const { clH1, clH2 } = allocateNewClDaysToHalves(clDays, startDate, endDate, startYear);

  const firstHalfMax = Math.floor(annualCl / 2);
  const secondHalfMax = annualCl - firstHalfMax;

  const requests = await fetchLeaveRequestsForCl(employeeId, {
    includePending: true,
    excludeRequestId,
  });
  const h1Used = sumClDaysInHalf(requests, startYear, "H1");
  const h2Used = sumClDaysInHalf(requests, startYear, "H2");

  const newH1Used = h1Used + clH1;
  const newH2Used = h2Used + clH2;

  if (newH1Used > firstHalfMax) {
    const left = Math.max(0, firstHalfMax - h1Used);
    return {
      ok: false,
      message: `CL limit for Apr–Sep is ${firstHalfMax} day(s). You have ${left} day(s) left in this half.`,
    };
  }

  const carriedToH2 = Math.max(0, firstHalfMax - newH1Used);
  const h2Limit = secondHalfMax + carriedToH2;

  if (newH2Used > h2Limit) {
    const left = Math.max(0, h2Limit - h2Used);
    return {
      ok: false,
      message: `CL limit for Oct–Mar is ${h2Limit} day(s) (including ${carriedToH2} carried from Apr–Sep). You have ${left} day(s) left.`,
    };
  }

  if (newH1Used + newH2Used > annualCl) {
    return {
      ok: false,
      message: `Annual CL limit is ${annualCl} day(s). Only ${Math.max(0, annualCl - h1Used - h2Used)} day(s) remain this year.`,
    };
  }

  return { ok: true };
}

/** Full-range CL validation (legacy single-type CL requests). */
export async function validateClLeaveRequest(
  employeeId: string,
  annualCl: number,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<{ ok: boolean; message?: string }> {
  const { startYear } = getFinancialYear(startDate);
  const { h1Days, h2Days } = splitClDaysByHalf(startDate, endDate, startYear);
  const requestDays = h1Days + h2Days;
  if (requestDays === 0) return { ok: true };
  return validateClDayAllocation(
    employeeId,
    annualCl,
    requestDays,
    startDate,
    endDate,
    excludeRequestId
  );
}
