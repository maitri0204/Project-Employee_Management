import {
  eachDayInRange,
  isNonWorkingDay,
  parseDateOnly,
} from "./leaveCalendar";

export type LeaveDayBreakdown = {
  totalDays: number;
  workingDays: number;
  sandwichDays: number;
};

/**
 * Count leave days using working-day rules with sandwich leave:
 * - Sundays and 2nd Saturdays are holidays (not counted unless sandwiched).
 * - Holidays/weekends between leave days are counted when sandwiched.
 */
export function calculateLeaveDays(startDate: Date | string, endDate: Date | string): LeaveDayBreakdown {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (start > end) {
    return { totalDays: 0, workingDays: 0, sandwichDays: 0 };
  }

  const allDays = eachDayInRange(start, end);
  const workingLeaveDays = allDays.filter((day) => !isNonWorkingDay(day));

  if (workingLeaveDays.length === 0) {
    return { totalDays: 0, workingDays: 0, sandwichDays: 0 };
  }

  const minTime = Math.min(...workingLeaveDays.map((day) => day.getTime()));
  const maxTime = Math.max(...workingLeaveDays.map((day) => day.getTime()));

  const leaveDaySet = new Set(workingLeaveDays.map((day) => day.getTime()));

  for (const day of allDays) {
    if (!isNonWorkingDay(day)) continue;
    const time = day.getTime();
    if (time > minTime && time < maxTime) {
      leaveDaySet.add(time);
    }
  }

  const sandwichDays = allDays.filter(
    (day) => isNonWorkingDay(day) && leaveDaySet.has(day.getTime())
  ).length;

  return {
    totalDays: leaveDaySet.size,
    workingDays: workingLeaveDays.length,
    sandwichDays,
  };
}
