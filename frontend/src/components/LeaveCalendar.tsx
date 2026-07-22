"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { calendarApi } from "@/lib/services";
import { CalendarDayInfo, CalendarMonthData } from "@/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEAR_MIN = 2025;
const YEAR_MAX = 2100;

const LEAVE_COLORS: Record<string, string> = {
  PL: "bg-blue-500",
  CL: "bg-emerald-500",
  SL: "bg-amber-500",
  LWP: "bg-rose-500",
};

const LEGEND = [
  { label: "Company holiday", className: "bg-gradient-to-br from-amber-400 to-orange-500" },
  { label: "Sunday", className: "bg-gradient-to-br from-rose-300 to-red-400" },
  { label: "2nd Saturday", className: "bg-gradient-to-br from-violet-500 to-purple-700" },
  { label: "On leave", className: "bg-gradient-to-br from-sky-400 to-blue-600" },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayStyle(day: CalendarDayInfo, isToday: boolean, isSelected: boolean) {
  const base =
    "relative min-h-[88px] rounded-xl border p-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

  let colors = "border-slate-200/80 bg-white hover:border-slate-300";
  if (day.isCompanyHoliday) {
    colors = "border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100";
  } else if (day.isSunday) {
    colors = "border-rose-300/90 bg-gradient-to-br from-rose-100 to-red-200";
  } else if (day.isSecondSaturday) {
    colors =
      "border-purple-500/80 bg-gradient-to-br from-violet-300 via-purple-300 to-violet-400 shadow-sm";
  } else if (day.leaves.length > 0) {
    colors = "border-sky-300/70 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50";
  }

  if (isToday) {
    colors += " ring-2 ring-indigo-500 ring-offset-2";
  }
  if (isSelected) {
    colors += " shadow-lg ring-2 ring-blue-600 ring-offset-1";
  }

  return `${base} ${colors}`;
}

type LeaveCalendarProps = {
  adminView?: boolean;
  /** When provided, calendar skips its own fetch (controlled mode). */
  data?: CalendarMonthData | null;
  loading?: boolean;
  year?: number;
  month?: number;
  onPeriodChange?: (year: number, month: number) => void;
};

export default function LeaveCalendar({
  adminView = false,
  data: controlledData,
  loading: controlledLoading,
  year: controlledYear,
  month: controlledMonth,
  onPeriodChange,
}: LeaveCalendarProps) {
  const today = new Date();
  const [internalYear, setInternalYear] = useState(today.getFullYear());
  const [internalMonth, setInternalMonth] = useState(today.getMonth() + 1);
  const [internalData, setInternalData] = useState<CalendarMonthData | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarDayInfo | null>(null);

  const isControlled = controlledYear !== undefined && controlledMonth !== undefined;
  const year = isControlled ? controlledYear : internalYear;
  const month = isControlled ? controlledMonth : internalMonth;
  const data = isControlled ? controlledData : internalData;
  const loading = isControlled ? (controlledLoading ?? false) : internalLoading;

  const setPeriod = (nextYear: number, nextMonth: number) => {
    if (onPeriodChange) {
      onPeriodChange(nextYear, nextMonth);
    }
    if (!isControlled) {
      setInternalYear(nextYear);
      setInternalMonth(nextMonth);
    }
    setSelected(null);
  };

  useEffect(() => {
    if (isControlled) return;

    setInternalLoading(true);
    calendarApi
      .getMonth(internalYear, internalMonth)
      .then((res) => {
        if (res.data) setInternalData(res.data);
      })
      .finally(() => setInternalLoading(false));
  }, [isControlled, internalYear, internalMonth]);

  const leadingBlanks = useMemo(() => {
    if (!data?.days.length) return 0;
    return new Date(data.days[0].date).getDay();
  }, [data]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) list.push(y);
    return list;
  }, []);

  const shiftMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1);
    setPeriod(date.getFullYear(), date.getMonth() + 1);
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-bold tracking-tight">
                {adminView ? "Team Leave Calendar" : "Leave Calendar"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg bg-white/15 p-2 hover:bg-white/25"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={month}
                onChange={(e) => setPeriod(year, Number(e.target.value))}
                className="rounded-lg border-0 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-cyan-300"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setPeriod(Number(e.target.value), month)}
                className="rounded-lg border-0 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-cyan-300"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg bg-white/15 p-2 hover:bg-white/25"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setPeriod(now.getFullYear(), now.getMonth() + 1);
                }}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow hover:bg-cyan-50"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full shadow-sm ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[88px] animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {data?.days.map((day) => {
                  const isToday = day.date === todayKey();
                  const isSelected = selected?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelected(day)}
                      className={dayStyle(day, isToday, isSelected)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                            isToday ? "bg-indigo-600 text-white" : "text-slate-800"
                          }`}
                        >
                          {Number(day.date.slice(-2))}
                        </span>
                        {day.leaves.length > 0 && (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {day.leaves.length}
                          </span>
                        )}
                      </div>
                      {day.holidayName && (
                        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight text-amber-800">
                          {day.holidayName}
                        </p>
                      )}
                      {day.isSecondSaturday && !day.holidayName && (
                        <p className="mt-1 text-[10px] font-bold leading-tight text-purple-900">
                          2nd Saturday
                        </p>
                      )}
                      {day.leaves.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {(adminView
                            ? [...new Set(day.leaves.map((l) => l.leaveType))]
                            : day.leaves.map((l) => l.leaveType)
                          )
                            .slice(0, 3)
                            .map((type, idx) => (
                              <span
                                key={`${type}-${idx}`}
                                className={`rounded px-1 py-0.5 text-[9px] font-bold text-white ${LEAVE_COLORS[type] ?? "bg-slate-500"}`}
                              >
                                {type}
                              </span>
                            ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-lg">
          <h3 className="text-base font-bold text-slate-900">
            {new Date(selected.date).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {selected.holidayName && (
              <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
                🎉 {selected.holidayName}
              </p>
            )}
            {selected.isSunday && (
              <p className="text-slate-600">Weekly off — Sunday</p>
            )}
            {selected.isSecondSaturday && (
              <p className="text-slate-600">Weekly off — 2nd Saturday</p>
            )}
            {selected.leaves.length === 0 ? (
              <p className="text-slate-500">No leave scheduled on this day.</p>
            ) : (
              <ul className="space-y-2 pt-1">
                {selected.leaves.map((leave) => (
                  <li
                    key={`${leave.id}-${leave.employeeId}`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    {adminView && (
                      <p className="font-semibold text-slate-900">{leave.employeeName}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${LEAVE_COLORS[leave.leaveType] ?? "bg-slate-500"}`}
                      >
                        {leave.leaveType}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          leave.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : leave.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(leave.startDate).toLocaleDateString("en-IN")} –{" "}
                      {new Date(leave.endDate).toLocaleDateString("en-IN")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
