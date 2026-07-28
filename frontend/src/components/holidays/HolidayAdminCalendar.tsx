"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDisplayDate, toDateInputValue } from "@/lib/dateUtils";
import { ManagedHoliday } from "@/types";
import { Button, Input } from "@/components/ui";

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

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  return toDateInputValue(new Date());
}

type HolidayAdminCalendarProps = {
  holidays: ManagedHoliday[];
  loading: boolean;
  saving: boolean;
  deletingId: string | null;
  onSave: (dateKey: string, description: string) => Promise<void>;
  onDelete: (holiday: ManagedHoliday) => Promise<void>;
  onDateSelect?: (dateKey: string) => void;
};

export default function HolidayAdminCalendar({
  holidays,
  loading,
  saving,
  deletingId,
  onSave,
  onDelete,
  onDateSelect,
}: HolidayAdminCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");

  const holidayMap = useMemo(() => {
    const map = new Map<string, ManagedHoliday>();
    holidays.forEach((holiday) => map.set(holiday.dateKey, holiday));
    return map;
  }, [holidays]);

  const monthHolidayCount = useMemo(
    () =>
      holidays.filter((holiday) => {
        const [y, m] = holiday.dateKey.split("-").map(Number);
        return y === year && m === month;
      }).length,
    [holidays, year, month]
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = new Date(year, month - 1, 1).getDay();

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y += 1) list.push(y);
    return list;
  }, []);

  const selectedHoliday = selectedDateKey ? holidayMap.get(selectedDateKey) ?? null : null;

  useEffect(() => {
    setEditDescription(selectedHoliday?.description ?? "");
  }, [selectedHoliday?.id, selectedHoliday?.description, selectedDateKey]);

  const setPeriod = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setSelectedDateKey(null);
  };

  const shiftMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1);
    setPeriod(date.getFullYear(), date.getMonth() + 1);
  };

  const handleDaySelect = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    onDateSelect?.(dateKey);
    const holiday = holidayMap.get(dateKey);
    setEditDescription(holiday?.description ?? "");
  };

  const handleSave = async () => {
    if (!selectedDateKey || !editDescription.trim()) return;
    await onSave(selectedDateKey, editDescription.trim());
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Holiday calendar</h2>
                <p className="text-xs text-orange-100">
                  {monthHolidayCount} holiday{monthHolidayCount === 1 ? "" : "s"} this month ·{" "}
                  {holidays.length} total
                </p>
              </div>
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
                className="rounded-lg border-0 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
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
                className="rounded-lg border-0 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
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
                  handleDaySelect(todayKey());
                }}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-orange-700 shadow hover:bg-orange-50"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm" />
              Company holiday
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white shadow-sm" />
              Today
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-slate-300 bg-white shadow-sm" />
              Regular day — click to add
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[92px] animate-pulse rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: leadingBlanks }).map((_, index) => (
                  <div key={`blank-${index}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateKey = dateKeyFromParts(year, month, day);
                  const holiday = holidayMap.get(dateKey);
                  const isToday = dateKey === todayKey();
                  const isSelected = selectedDateKey === dateKey;
                  const isSunday = new Date(year, month - 1, day).getDay() === 0;

                  let cellClass =
                    "relative min-h-[92px] cursor-pointer rounded-xl border p-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ";

                  if (holiday) {
                    cellClass +=
                      "border-amber-300/70 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 hover:border-amber-400";
                  } else if (isSunday) {
                    cellClass +=
                      "border-rose-200/80 bg-gradient-to-br from-rose-50 to-red-50 hover:border-rose-300";
                  } else {
                    cellClass += "border-slate-200/80 bg-white hover:border-slate-300";
                  }

                  if (isToday) {
                    cellClass += " ring-2 ring-indigo-500 ring-offset-2";
                  }
                  if (isSelected) {
                    cellClass += " shadow-lg ring-2 ring-orange-500 ring-offset-1";
                  }

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => handleDaySelect(dateKey)}
                      className={cellClass}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                            isToday ? "bg-indigo-600 text-white" : "text-slate-800"
                          }`}
                        >
                          {day}
                        </span>
                        {holiday && (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            OFF
                          </span>
                        )}
                      </div>

                      {holiday ? (
                        <p className="mt-1.5 line-clamp-3 text-[10px] font-semibold leading-tight text-amber-900">
                          {holiday.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] font-medium text-slate-400">Click to add</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedDateKey && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-orange-50/40 p-5 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                {selectedHoliday ? "Edit holiday" : "Add holiday"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                {formatDisplayDate(selectedDateKey)}
              </h3>
              {selectedHoliday && (
                <p className="mt-1 text-sm text-slate-500">
                  Click save to update the description, or delete to remove this holiday.
                </p>
              )}
            </div>

            {selectedHoliday && (
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                Scheduled
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <Input
              label="Holiday name"
              placeholder="e.g. Independence Day"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={saving || !editDescription.trim()}
                className="gap-2"
                onClick={() => void handleSave()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedHoliday ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {selectedHoliday ? "Update holiday" : "Add holiday"}
              </Button>

              {selectedHoliday && (
                <Button
                  type="button"
                  variant="danger"
                  className="gap-2"
                  disabled={deletingId === selectedHoliday.id}
                  onClick={() => void onDelete(selectedHoliday)}
                >
                  {deletingId === selectedHoliday.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
