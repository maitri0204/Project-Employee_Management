"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Inbox,
  XCircle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LeaveNotificationBadge from "@/components/LeaveNotificationBadge";
import { useLeaveNotifications } from "@/context/LeaveNotificationContext";
import { UPLOADS_BASE } from "@/lib/api";
import { leaveApi } from "@/lib/services";
import { breakdownFromRequest } from "@/lib/leaveBreakdown";
import { formatUsedTotal, getLeaveTotals } from "@/lib/leaveFormat";
import { EmployeeLeaveUsageRow, LeaveRequest, LeaveStatus } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

const statusVariant = {
  PENDING: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
};

const LEAVE_CHIP: Record<string, string> = {
  PL: "bg-blue-100 text-blue-800 border-blue-200",
  CL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SL: "bg-amber-100 text-amber-800 border-amber-200",
  LWP: "bg-rose-100 text-rose-800 border-rose-200",
};

type RequestFilter = "ALL" | LeaveStatus;

function formatName(row: EmployeeLeaveUsageRow) {
  const e = row.employee;
  if (!e) return "-";
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");
}

function formatReqName(req: LeaveRequest) {
  const e = req.employee;
  if (!e) return "-";
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.charAt(0).toUpperCase() || "?";
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = new Date(start).toLocaleDateString("en-IN", opts);
  const e = new Date(end).toLocaleDateString("en-IN", opts);
  return s === e ? s : `${s} → ${e}`;
}

function LeaveTypeChips({ req }: { req: LeaveRequest }) {
  if (req.leaveBreakdown) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(["PL", "CL", "SL", "LWP"] as const).map((type) => {
          const days = req.leaveBreakdown?.[type] ?? 0;
          if (days <= 0) return null;
          return (
            <span
              key={type}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${LEAVE_CHIP[type]}`}
            >
              {type} · {days}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        LEAVE_CHIP[req.leaveType] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {req.leaveType}
    </span>
  );
}

function RequestCard({
  req,
  processingId,
  onApprove,
  onReject,
}: {
  req: LeaveRequest;
  processingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const name = formatReqName(req);
  const isPending = req.status === "PENDING";
  const isProcessing = processingId === req.id;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isPending
          ? "border-amber-200 ring-1 ring-amber-100"
          : req.status === "APPROVED"
            ? "border-emerald-100"
            : "border-slate-200"
      }`}
    >
      {isPending && (
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow ${
                isPending
                  ? "bg-gradient-to-br from-amber-500 to-orange-500"
                  : req.status === "APPROVED"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                    : "bg-gradient-to-br from-slate-400 to-slate-600"
              }`}
            >
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">{name}</h3>
              <p className="truncate text-xs text-slate-500">{req.employee?.user?.email}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Submitted {new Date(req.createdAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
        </div>

        <div className="mt-4">
          <LeaveTypeChips req={req} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dates</p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateRange(req.startDate, req.endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Duration</p>
              <p className="text-sm font-bold text-indigo-900">
                {req.days ?? "-"} day{(req.days ?? 0) === 1 ? "" : "s"}
                {req.sandwichDays ? (
                  <span className="ml-1 text-xs font-medium text-amber-700">
                    (+{req.sandwichDays} sandwich)
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">&ldquo;{req.reason}&rdquo;</p>
        </div>

        {req.medicalCertificateUrl && breakdownFromRequest(req).SL > 0 && (
          <a
            href={`${UPLOADS_BASE}${req.medicalCertificateUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <FileText className="h-4 w-4" />
            View medical certificate
          </a>
        )}

        {isPending && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-100 pt-4">
            <Button
              variant="success"
              onClick={() => onApprove(req.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
            <Button
              variant="danger"
              onClick={() => onReject(req.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdminLeavesPage() {
  const { pendingCount, revision } = useLeaveNotifications();
  const [tab, setTab] = useState<"usage" | "requests">("requests");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("ALL");
  const [usageData, setUsageData] = useState<{
    financialYear: string;
    employees: EmployeeLeaveUsageRow[];
  } | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsage = () => {
    leaveApi.getUsage().then((res) => {
      if (res.data) {
        setUsageData({
          financialYear: res.data.financialYear,
          employees: res.data.employees,
        });
      }
    });
  };

  const fetchRequests = () => {
    leaveApi.getAll().then((res) => {
      if (res.data) setRequests(res.data);
    });
  };

  useEffect(() => {
    fetchUsage();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (revision > 0) {
      fetchRequests();
      fetchUsage();
      setTab("requests");
      setRequestFilter("PENDING");
    }
  }, [revision]);

  const requestStats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
      total: requests.length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const list =
      requestFilter === "ALL"
        ? requests
        : requests.filter((r) => r.status === requestFilter);

    return [...list].sort((a, b) => {
      const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests, requestFilter]);

  const handleStatusUpdate = async (id: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(id);
    try {
      await leaveApi.updateStatus(id, status);
      fetchRequests();
      fetchUsage();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setProcessingId(null);
    }
  };

  const filterButtons: { key: RequestFilter; label: string; count: number; color: string }[] = [
    { key: "ALL", label: "All", count: requestStats.total, color: "bg-slate-100 text-slate-800" },
    { key: "PENDING", label: "Pending", count: requestStats.pending, color: "bg-amber-100 text-amber-900" },
    { key: "APPROVED", label: "Approved", count: requestStats.approved, color: "bg-emerald-100 text-emerald-900" },
    { key: "REJECTED", label: "Rejected", count: requestStats.rejected, color: "bg-rose-100 text-rose-900" },
  ];

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <ClipboardList className="h-3.5 w-3.5" />
                Leave Management
              </div>
              <h1 className="text-2xl font-bold">Leaves</h1>
              <p className="mt-1 text-sm text-indigo-100">
                Review team requests and track leave usage across the organization.
              </p>
            </div>
            <Link href="/admin/leave-assign">
              <Button variant="secondary" className="border-white bg-white text-indigo-700 hover:bg-indigo-50">
                Edit Leave Assign
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("usage")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "usage"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Leave Usage
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "requests"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Leave Requests
            <LeaveNotificationBadge
              count={pendingCount}
              className={tab === "requests" ? "bg-white text-amber-700 ring-indigo-500" : ""}
            />
          </button>
        </div>

        {tab === "usage" ? (
          <Card className="overflow-hidden p-0">
            {usageData && (
              <p className="border-b border-slate-100 px-6 py-3 text-sm text-slate-600">
                Financial year: <strong>{usageData.financialYear}</strong> (April - March)
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-black">Employee</th>
                    <th className="px-6 py-3 font-medium text-black">PL (used/total)</th>
                    <th className="px-6 py-3 font-medium text-black">CL (used/total)</th>
                    <th className="px-6 py-3 font-medium text-black">SL (used/total)</th>
                    <th className="px-6 py-3 font-medium text-black">LWP Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!usageData?.employees.length ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-black">
                        No employee leave data.
                      </td>
                    </tr>
                  ) : (
                    usageData.employees.map((row) => {
                      const totals = getLeaveTotals(row);
                      return (
                        <tr key={row.employee?.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-black">{formatName(row)}</p>
                            <p className="text-xs text-slate-500">{row.employee?.user?.email}</p>
                          </td>
                          <td className="px-6 py-4 text-black">
                            {formatUsedTotal(row.usage.PL, totals.PL)}
                          </td>
                          <td className="px-6 py-4 text-black">
                            <span>{formatUsedTotal(row.usage.CL, totals.CL)}</span>
                            {row.clUsableThisHalf !== undefined && (
                              <span className="block text-xs text-slate-500">
                                Usable this half: {row.clUsableThisHalf}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-black">
                            {formatUsedTotal(row.usage.SL, totals.SL)}
                          </td>
                          <td className="px-6 py-4 font-medium text-amber-700">{row.lwpTaken}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Pending", value: requestStats.pending, gradient: "from-amber-500 to-orange-500" },
                { label: "Approved", value: requestStats.approved, gradient: "from-emerald-500 to-teal-600" },
                { label: "Rejected", value: requestStats.rejected, gradient: "from-rose-500 to-red-600" },
                { label: "Total", value: requestStats.total, gradient: "from-indigo-500 to-blue-600" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <div className={`bg-gradient-to-r ${stat.gradient} px-4 py-2 text-xs font-bold uppercase tracking-wider text-white`}>
                    {stat.label}
                  </div>
                  <p className="p-4 text-center text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {filterButtons.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setRequestFilter(filter.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    requestFilter === filter.key
                      ? "bg-indigo-600 text-white shadow-md"
                      : `${filter.color} hover:opacity-90`
                  }`}
                >
                  {filter.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      requestFilter === filter.key ? "bg-white/20 text-white" : "bg-white/70"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                  <Inbox className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No requests here</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {requestFilter === "PENDING"
                    ? "You're all caught up - no pending leave requests right now."
                    : `No ${requestFilter.toLowerCase()} leave requests to show.`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    processingId={processingId}
                    onApprove={(id) => void handleStatusUpdate(id, "APPROVED")}
                    onReject={(id) => void handleStatusUpdate(id, "REJECTED")}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
