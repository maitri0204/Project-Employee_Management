"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Plane } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LeaveCalendar from "@/components/LeaveCalendar";
import { calendarApi, leaveApi } from "@/lib/services";
import {
  emptyLeaveBreakdown,
  formatLeaveBreakdownLabel,
  getAvailableLeaveByType,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  sumLeaveBreakdown,
  typeExceedsAvailable,
  validateLeaveAllocationAgainstBalance,
} from "@/lib/leaveBreakdown";
import {
  CalendarMonthData,
  LeaveBalanceSummary,
  LeaveBreakdown,
  LeaveDayBreakdown,
  LeaveRequest,
  LeaveType,
} from "@/types";
import { formatUsedTotal, getLeaveTotals } from "@/lib/leaveFormat";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";

const statusVariant = {
  PENDING: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
};

const BALANCE_STYLES = [
  { type: "PL" as const, gradient: "from-blue-500 to-indigo-600", light: "bg-blue-50 text-blue-700" },
  { type: "CL" as const, gradient: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-700" },
  { type: "SL" as const, gradient: "from-amber-500 to-orange-500", light: "bg-amber-50 text-amber-700" },
];

const INITIAL_FORM = {
  startDate: "",
  endDate: "",
  reason: "",
};

export default function LeavesPage() {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalanceSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarMonthData | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [leaveBreakdown, setLeaveBreakdown] = useState<LeaveBreakdown>(emptyLeaveBreakdown());
  const [dayPreview, setDayPreview] = useState<LeaveDayBreakdown | null>(null);
  const [sandwichConfirm, setSandwichConfirm] = useState<LeaveDayBreakdown | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allocatedDays = useMemo(() => sumLeaveBreakdown(leaveBreakdown), [leaveBreakdown]);
  const requiredDays = dayPreview?.totalDays ?? 0;
  const allocationComplete = requiredDays > 0 && allocatedDays === requiredDays;

  const availableByType = useMemo(
    () => (balance ? getAvailableLeaveByType(balance, requests) : emptyLeaveBreakdown()),
    [balance, requests]
  );

  const balanceErrors = useMemo(() => {
    if (allocatedDays === 0) return [];
    return validateLeaveAllocationAgainstBalance(leaveBreakdown, availableByType);
  }, [leaveBreakdown, availableByType, allocatedDays]);

  const hasBalanceError = balanceErrors.length > 0;
  const canSubmit = allocationComplete && !hasBalanceError && !isSubmitting;

  const loadOverview = useCallback(async (year: number, month: number, initial = false) => {
    if (initial) setPageLoading(true);
    else setCalendarLoading(true);

    try {
      const res = await leaveApi.getMyOverview(year, month);
      if (res.data) {
        setBalance(res.data.balance);
        setRequests(res.data.requests);
        setCalendar(res.data.calendar);
      }
    } finally {
      if (initial) setPageLoading(false);
      else setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview(today.getFullYear(), today.getMonth() + 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOverview]);

  const handlePeriodChange = async (year: number, month: number) => {
    setCalYear(year);
    setCalMonth(month);
    setCalendarLoading(true);
    try {
      const res = await calendarApi.getMonth(year, month);
      if (res.data) setCalendar(res.data);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setDayPreview(null);
      setLeaveBreakdown(emptyLeaveBreakdown());
      return;
    }

    leaveApi
      .previewDays(formData.startDate, formData.endDate)
      .then((res) => {
        if (res.data) {
          setDayPreview(res.data);
          setLeaveBreakdown(emptyLeaveBreakdown());
        }
      })
      .catch(() => setDayPreview(null));
  }, [formData.startDate, formData.endDate]);

  const sanitizeBreakdownInput = (value: string): number => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly === "") return 0;
    const parsed = parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return 0;
    if (requiredDays > 0) return Math.min(parsed, requiredDays);
    return parsed;
  };

  const updateBreakdown = (type: LeaveType, value: string) => {
    setLeaveBreakdown((prev) => ({ ...prev, [type]: sanitizeBreakdownInput(value) }));
  };

  const handleBreakdownKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const handleBreakdownPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    type: LeaveType
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    updateBreakdown(type, pasted);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setLeaveBreakdown(emptyLeaveBreakdown());
    setDayPreview(null);
  };

  const submitLeave = async () => {
    setIsSubmitting(true);

    try {
      await leaveApi.apply({
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        leaveBreakdown,
      });
      setShowForm(false);
      setSandwichConfirm(null);
      setError("");
      resetForm();
      await loadOverview(calYear, calMonth, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dayPreview || dayPreview.totalDays === 0) {
      setError("Please select valid leave dates with at least one working day.");
      return;
    }

    if (allocatedDays === 0) {
      setError("Please allocate at least one leave day across PL, CL, SL, or LWP.");
      return;
    }

    if (allocatedDays !== dayPreview.totalDays) {
      setError(
        `Please allocate exactly ${dayPreview.totalDays} day(s). You have allocated ${allocatedDays} day(s).`
      );
      return;
    }

    if (hasBalanceError) {
      setError(balanceErrors[0]);
      return;
    }

    if (dayPreview.sandwichDays > 0) {
      setSandwichConfirm(dayPreview);
      return;
    }

    await submitLeave();
  };

  if (pageLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-600">Loading your leaves & calendar...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-6 text-white shadow-2xl shadow-blue-200/40 sm:p-8">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <CalendarDays className="h-3.5 w-3.5" />
                Leaves & Calendar
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Leaves</h1>
              <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
                Apply using a combination of PL, CL, SL, or LWP. Balance is reduced only after admin
                approval.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setError("");
                  resetForm();
                }
              }}
              className="shrink-0 border-2 border-white bg-white px-5 py-2.5 text-indigo-700 shadow-lg hover:bg-blue-50"
            >
              <span className="inline-flex items-center gap-2">
                <Plane className="h-4 w-4" />
                {showForm ? "Cancel" : "Apply for Leave"}
              </span>
            </Button>
          </div>
        </div>

        {balance && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BALANCE_STYLES.map(({ type, gradient, light }) => {
              const totals = getLeaveTotals(balance);
              const used = balance.usage?.[type] ?? 0;
              const total = totals[type];
              return (
                <div
                  key={type}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md"
                >
                  <div className={`bg-gradient-to-r ${gradient} px-4 py-2 text-xs font-bold uppercase tracking-wider text-white`}>
                    {type}
                  </div>
                  <div className="p-4 text-center">
                    <p className={`text-2xl font-bold ${light.split(" ")[1]}`}>
                      {formatUsedTotal(used, total)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">used / total</p>
                  </div>
                </div>
              );
            })}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
              <div className="bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
                LWP
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-rose-600">{balance.lwpTaken ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">days taken</p>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <Card className="border-indigo-100 shadow-lg">
            {error && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 text-xs font-semibold text-red-600 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />

              {dayPreview && dayPreview.totalDays > 0 && (
                <>
                  <div className="md:col-span-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-sm text-blue-900">
                    <strong>{dayPreview.totalDays} leave day(s)</strong> required for these dates
                    {dayPreview.sandwichDays > 0 && (
                      <span>
                        {" "}
                        (includes {dayPreview.sandwichDays} sandwich holiday day
                        {dayPreview.sandwichDays > 1 ? "s" : ""})
                      </span>
                    )}
                    . Working days: {dayPreview.workingDays}. Deducted only after approval.
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">Allocate leave by type</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          hasBalanceError
                            ? "bg-red-100 text-red-800"
                            : allocationComplete
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {allocatedDays} / {requiredDays} days allocated
                      </span>
                    </div>
                    <p className="mb-4 text-xs text-slate-600">
                      Split the {requiredDays} day(s) across one or more types - e.g. 1 CL + 1 SL.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {LEAVE_TYPES.map((type) => {
                        const exceeds = typeExceedsAvailable(
                          type,
                          leaveBreakdown,
                          availableByType
                        );
                        const avail =
                          type === "LWP" ? null : availableByType[type];
                        return (
                          <div key={type}>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              {LEAVE_TYPE_LABELS[type]}
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="off"
                              min={0}
                              max={requiredDays}
                              value={leaveBreakdown[type] === 0 ? "" : leaveBreakdown[type]}
                              onChange={(e) => updateBreakdown(type, e.target.value)}
                              onKeyDown={handleBreakdownKeyDown}
                              onPaste={(e) => handleBreakdownPaste(e, type)}
                              placeholder="0"
                              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 ${
                                exceeds
                                  ? "border-red-400 ring-red-200 focus:ring-red-300"
                                  : "border-slate-200 focus:ring-indigo-300"
                              }`}
                            />
                            {avail !== null && (
                              <p
                                className={`mt-1 text-[10px] ${exceeds ? "font-semibold text-red-600" : "text-slate-500"}`}
                              >
                                Available: {avail}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {hasBalanceError && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {balanceErrors.map((msg) => (
                          <p key={msg}>{msg}</p>
                        ))}
                      </div>
                    )}
                    {balance?.clHalfYear && leaveBreakdown.CL > 0 && (
                      <p className="mt-3 text-xs text-slate-600">
                        CL usable this half (
                        {balance.clHalfYear.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar"}):{" "}
                        <strong>{balance.clUsableThisHalf ?? balance.clHalfYear.available}</strong>
                      </p>
                    )}
                    {allocatedDays > 0 && (
                      <p className="mt-3 text-xs font-medium text-indigo-800">
                        Selected: {formatLeaveBreakdownLabel(leaveBreakdown)}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Textarea
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <LeaveCalendar
              year={calYear}
              month={calMonth}
              data={calendar}
              loading={calendarLoading}
              onPeriodChange={handlePeriodChange}
            />
          </div>

          <div className="xl:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900">My Leave Requests</h2>
                <span className="ml-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  {requests.length}
                </span>
              </div>
              <div className="max-h-[600px] overflow-y-auto p-3">
                {requests.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">No leave requests yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {requests.map((req) => (
                      <li
                        key={req.id}
                        className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 transition hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white">
                            {req.leaveType === "MIXED"
                              ? "Mixed"
                              : req.leaveBreakdown
                                ? formatLeaveBreakdownLabel(req.leaveBreakdown)
                                : req.leaveType}
                          </span>
                          <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                        </div>
                        {req.leaveBreakdown && (
                          <p className="mt-2 text-xs font-medium text-indigo-700">
                            {formatLeaveBreakdownLabel(req.leaveBreakdown)}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {new Date(req.startDate).toLocaleDateString("en-IN")} –{" "}
                          {new Date(req.endDate).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {req.days ?? "-"} day(s)
                          {req.sandwichDays ? ` · +${req.sandwichDays} sandwich` : ""}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-600">{req.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {sandwichConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-amber-900">Sandwich leave applies</h2>
            <p className="mt-2 text-sm text-slate-600">
              Holidays or weekly offs between your dates will be counted as leave.
            </p>
            <ul className="mt-4 space-y-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <li>
                <strong>Working days:</strong> {sandwichConfirm.workingDays}
              </li>
              <li>
                <strong>Sandwich days:</strong> {sandwichConfirm.sandwichDays}
              </li>
              <li className="border-t border-amber-200/80 pt-2 font-bold">
                Total if approved: {sandwichConfirm.totalDays} ({formatLeaveBreakdownLabel(leaveBreakdown)})
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSandwichConfirm(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitLeave()}
                disabled={isSubmitting || hasBalanceError}
                className="bg-amber-600 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Proceed"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
