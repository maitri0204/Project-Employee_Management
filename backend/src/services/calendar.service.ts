import prisma from "../config/database";
import { AuthRequest } from "../types";
import {
  dateKey,
  eachDayInRange,
  isNonWorkingDay,
  isSecondSaturday,
  isSunday,
  parseDateOnly,
} from "./leaveCalendar";
import { getCompanyHolidayName, getCompanyHolidaysInRange } from "../data/companyHolidays";
import { formatLeaveBreakdownLabel, getRequestBreakdown } from "./leaveBreakdown";

export type CalendarLeaveEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
};

export type CalendarDayInfo = {
  date: string;
  isSunday: boolean;
  isSecondSaturday: boolean;
  isCompanyHoliday: boolean;
  holidayName?: string;
  isNonWorking: boolean;
  leaves: CalendarLeaveEntry[];
};

function formatEmployeeName(emp: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end, startKey: dateKey(start), endKey: dateKey(end) };
}

export async function getCalendarForMonth(
  year: number,
  month: number,
  user: NonNullable<AuthRequest["user"]>
): Promise<{ year: number; month: number; days: CalendarDayInfo[]; holidays: { date: string; name: string }[] }> {
  const { start, end, startKey, endKey } = monthRange(year, month);

  const leaveWhere =
    user!.role === "ADMIN"
      ? {
          status: { in: ["APPROVED", "PENDING"] as string[] },
          startDate: { lte: end },
          endDate: { gte: start },
          employee: { NOT: { isArchived: true }, user: { role: "EMPLOYEE" } },
        }
      : {
          status: { in: ["APPROVED", "PENDING"] as string[] },
          startDate: { lte: end },
          endDate: { gte: start },
          employee: { userId: user!.userId },
        };

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: leaveWhere,
    include: {
      employee: {
        select: { id: true, firstName: true, middleName: true, lastName: true },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const days: CalendarDayInfo[] = [];
  const allDays = eachDayInRange(start, end);

  for (const day of allDays) {
    const key = dateKey(day);
    const companyName = getCompanyHolidayName(key);
    const sunday = isSunday(day);
    const secondSat = isSecondSaturday(day);

    const leaves: CalendarLeaveEntry[] = [];
    for (const request of leaveRequests) {
      const reqStart = parseDateOnly(request.startDate);
      const reqEnd = parseDateOnly(request.endDate);
      if (day < reqStart || day > reqEnd) continue;

      leaves.push({
        id: request.id,
        employeeId: request.employeeId,
        employeeName: formatEmployeeName(request.employee),
        leaveType: formatLeaveBreakdownLabel(getRequestBreakdown(request)),
        status: request.status,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
      });
    }

    days.push({
      date: key,
      isSunday: sunday,
      isSecondSaturday: secondSat,
      isCompanyHoliday: Boolean(companyName),
      holidayName: companyName,
      isNonWorking: sunday || secondSat || Boolean(companyName),
      leaves,
    });
  }

  return {
    year,
    month,
    days,
    holidays: getCompanyHolidaysInRange(startKey, endKey),
  };
}

/** Used by leave calculation — company holidays are non-working. */
export function isCompanyHolidayDate(date: Date): boolean {
  return Boolean(getCompanyHolidayName(dateKey(date)));
}

export function isCalendarNonWorkingDay(date: Date): boolean {
  return isNonWorkingDay(date) || isCompanyHolidayDate(date);
}
