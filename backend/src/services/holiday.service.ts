import prisma from "../config/database";
import { dateKey, parseDateOnly } from "./leaveCalendar";
import { COMPANY_HOLIDAYS } from "../data/companyHolidays";

export type HolidayRecord = { date: string; name: string };

let holidayCache: Map<string, string> = new Map();

export async function refreshHolidayCache(): Promise<void> {
  const rows = await prisma.companyHoliday.findMany({
    orderBy: { dateKey: "asc" },
  });
  holidayCache = new Map(rows.map((row) => [row.dateKey, row.description]));
}

export async function ensureHolidayCache(): Promise<void> {
  if (holidayCache.size === 0) {
    await refreshHolidayCache();
  }
}

export function getCompanyHolidayName(dateKeyStr: string): string | undefined {
  return holidayCache.get(dateKeyStr);
}

export function isCompanyHoliday(dateKeyStr: string): boolean {
  return holidayCache.has(dateKeyStr);
}

export function getCompanyHolidaysInRange(startKey: string, endKey: string): HolidayRecord[] {
  return Array.from(holidayCache.entries())
    .filter(([key]) => key >= startKey && key <= endKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, name]) => ({ date, name }));
}

export function getAllCachedHolidays(): HolidayRecord[] {
  return Array.from(holidayCache.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, name]) => ({ date, name }));
}

export async function seedDefaultHolidaysIfEmpty(): Promise<number> {
  const count = await prisma.companyHoliday.count();
  if (count > 0) return 0;

  await prisma.companyHoliday.createMany({
    data: COMPANY_HOLIDAYS.map((holiday) => ({
      dateKey: holiday.date,
      description: holiday.name,
    })),
  });

  await refreshHolidayCache();
  return COMPANY_HOLIDAYS.length;
}

export async function listManagedHolidays() {
  return prisma.companyHoliday.findMany({
    orderBy: { dateKey: "asc" },
  });
}

export async function upsertHoliday(dateKeyStr: string, description: string) {
  const holiday = await prisma.companyHoliday.upsert({
    where: { dateKey: dateKeyStr },
    create: {
      dateKey: dateKeyStr,
      description: description.trim(),
    },
    update: {
      description: description.trim(),
    },
  });
  await refreshHolidayCache();
  return holiday;
}

export async function deleteHolidayById(id: string) {
  await prisma.companyHoliday.delete({ where: { id } });
  await refreshHolidayCache();
}

export function parseHolidayDateInput(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateKey(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 86400000);
    if (!Number.isNaN(parsed.getTime())) return dateKey(parsed);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, "0");
      const month = slashMatch[2].padStart(2, "0");
      const year = slashMatch[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = parseDateOnly(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return dateKey(parsed);
    }
  }

  return null;
}

export function normalizeHolidayDescription(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}
