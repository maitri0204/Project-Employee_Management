/** Date helpers, holidays (Sundays + 2nd Saturday), joining & financial year rules. */

import { getCompanyHolidayName } from "../services/holiday.service";

export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Latest calendar date allowed when applying sick leave (yesterday). */
export function getLatestSlLeaveDate(): Date {
  const today = parseDateOnly(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export function isSlLeaveDateRangeValid(end: Date): boolean {
  return end < parseDateOnly(new Date());
}

export function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = parseDateOnly(start);
  const last = parseDateOnly(end);

  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function saturdayOfMonth(date: Date): number {
  if (date.getDay() !== 6) return 0;

  let count = 0;
  const day = date.getDate();
  for (let d = 1; d <= day; d++) {
    const probe = new Date(date.getFullYear(), date.getMonth(), d);
    if (probe.getDay() === 6) count += 1;
  }
  return count;
}

export function isSecondSaturday(date: Date): boolean {
  return saturdayOfMonth(date) === 2;
}


export function isNonWorkingDay(date: Date): boolean {
  return isSunday(date) || isSecondSaturday(date) || Boolean(getCompanyHolidayName(dateKey(date)));
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function previousCalendarMonth(reference = new Date()): {
  year: number;
  month: number;
  period: string;
} {
  const year = reference.getMonth() === 0 ? reference.getFullYear() - 1 : reference.getFullYear();
  const month = reference.getMonth() === 0 ? 12 : reference.getMonth();
  return { year, month, period: periodKey(year, month) };
}

/** Join on/after 20th → effective joining is 1st of next month; otherwise 1st of current month. */
export function getEffectiveJoiningDate(addedDate: Date): Date {
  const parsed = parseDateOnly(addedDate);
  if (parsed.getDate() >= 20) {
    return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

/** Indian financial year: April to March (e.g. Apr 2025 - Mar 2026 → "2025-26"). */
export function getFinancialYear(reference = new Date()): {
  label: string;
  startYear: number;
} {
  const month = reference.getMonth();
  const year = reference.getFullYear();

  if (month >= 3) {
    return { label: `${year}-${String(year + 1).slice(-2)}`, startYear: year };
  }
  return { label: `${year - 1}-${String(year).slice(-2)}`, startYear: year - 1 };
}

/** Completed calendar months from joining month through previous month (inclusive). */
export function getCompletedMonthPeriods(
  joiningDate: Date,
  referenceDate = new Date()
): string[] {
  const { period: endPeriod } = previousCalendarMonth(referenceDate);
  const periods: string[] = [];
  const effectiveJoin = getEffectiveJoiningDate(joiningDate);
  const cursor = new Date(effectiveJoin.getFullYear(), effectiveJoin.getMonth(), 1);

  while (true) {
    const period = periodKey(cursor.getFullYear(), cursor.getMonth() + 1);
    if (period > endPeriod) break;
    periods.push(period);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return periods;
}
