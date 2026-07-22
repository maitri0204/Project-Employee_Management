import prisma from "../config/database";
import { getFinancialYear, parseDateOnly } from "./leaveCalendar";
import { calculateLeaveDays } from "./leaveCalculation";

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
  const start = parseDateOnly(leaveStart);
  const end = parseDateOnly(leaveEnd);
  const rangeS = parseDateOnly(rangeStart);
  const rangeE = parseDateOnly(rangeEnd);

  const overlapStart = start > rangeS ? start : rangeS;
  const overlapEnd = end < rangeE ? end : rangeE;
  if (overlapStart > overlapEnd) return 0;

  return calculateLeaveDays(overlapStart, overlapEnd).totalDays;
}

type ClRequestRow = { startDate: Date; endDate: Date };

type FetchClOptions = {
  excludeRequestId?: string;
  /** When true, pending requests count toward limits (apply/approve validation). */
  includePending?: boolean;
};

async function fetchClRequests(
  employeeId: string,
  options: FetchClOptions = {}
): Promise<ClRequestRow[]> {
  const statuses = options.includePending ? ["APPROVED", "PENDING"] : ["APPROVED"];
  return prisma.leaveRequest.findMany({
    where: {
      employeeId,
      leaveType: "CL",
      status: { in: statuses },
      ...(options.excludeRequestId ? { NOT: { id: options.excludeRequestId } } : {}),
    },
    select: { startDate: true, endDate: true },
  });
}

function sumClDaysInHalf(
  requests: ClRequestRow[],
  startYear: number,
  half: FinancialHalf
): number {
  const { h1Start, h1End, h2Start, h2End } = getFinancialYearHalfRanges(startYear);
  const rangeStart = half === "H1" ? h1Start : h2Start;
  const rangeEnd = half === "H1" ? h1End : h2End;

  return requests.reduce(
    (sum, request) =>
      sum + overlapLeaveDays(request.startDate, request.endDate, rangeStart, rangeEnd),
    0
  );
}

/** Sum CL days (approved + pending) that fall within a FY half. */
export async function getClDaysInHalf(
  employeeId: string,
  startYear: number,
  half: FinancialHalf,
  options: FetchClOptions = {}
): Promise<number> {
  const requests = await fetchClRequests(employeeId, options);
  return sumClDaysInHalf(requests, startYear, half);
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
  const requests = await fetchClRequests(employeeId, options);
  const h1Used = sumClDaysInHalf(requests, startYear, "H1");
  const h2Used = sumClDaysInHalf(requests, startYear, "H2");
  return buildClHalfYearInfo(annualCl, h1Used, h2Used, referenceDate);
}

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

  if (requestDays === 0) {
    return { ok: true };
  }

  const firstHalfMax = Math.floor(annualCl / 2);
  const secondHalfMax = annualCl - firstHalfMax;

  const requests = await fetchClRequests(employeeId, {
    includePending: true,
    excludeRequestId,
  });
  const h1Used = sumClDaysInHalf(requests, startYear, "H1");
  const h2Used = sumClDaysInHalf(requests, startYear, "H2");

  const newH1Used = h1Used + h1Days;
  const newH2Used = h2Used + h2Days;

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
      message: `Annual CL limit is ${annualCl} day(s). Only ${annualCl - h1Used - h2Used} day(s) remain this year.`,
    };
  }

  return { ok: true };
}
