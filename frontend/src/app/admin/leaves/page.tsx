"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { leaveApi } from "@/lib/services";
import { formatUsedTotal, getLeaveTotals } from "@/lib/leaveFormat";
import { EmployeeLeaveUsageRow, LeaveRequest } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

const statusVariant = {
  PENDING: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
};

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

export default function AdminLeavesPage() {
  const [tab, setTab] = useState<"usage" | "requests">("usage");
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

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Leaves</h1>
            <p className="mt-1 text-sm text-black">
              Track leave usage per employee and manage requests.
            </p>
          </div>
          <Link href="/admin/leave-assign">
            <Button variant="secondary">Edit Leave Assign</Button>
          </Link>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("usage")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "usage" ? "bg-blue-600 text-white" : "bg-slate-100 text-black"
            }`}
          >
            Leave Usage
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "requests" ? "bg-blue-600 text-white" : "bg-slate-100 text-black"
            }`}
          >
            Leave Requests
          </button>
        </div>

        {tab === "usage" ? (
          <Card className="overflow-hidden p-0">
            {usageData && (
              <p className="border-b border-slate-100 px-6 py-3 text-sm text-slate-600">
                Financial year: <strong>{usageData.financialYear}</strong> (April – March)
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
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-black">Employee</th>
                    <th className="px-6 py-3 font-medium text-black">Type</th>
                    <th className="px-6 py-3 font-medium text-black">Dates</th>
                    <th className="px-6 py-3 font-medium text-black">Days</th>
                    <th className="px-6 py-3 font-medium text-black">Reason</th>
                    <th className="px-6 py-3 font-medium text-black">Status</th>
                    <th className="px-6 py-3 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-black">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-black">{formatReqName(req)}</p>
                          <p className="text-xs text-black">{req.employee?.user?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-black">{req.leaveType}</td>
                        <td className="px-6 py-4 text-black">
                          {new Date(req.startDate).toLocaleDateString()} –{" "}
                          {new Date(req.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-black">{req.days ?? "-"}</td>
                        <td className="px-6 py-4 text-black">{req.reason}</td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                variant="success"
                                onClick={() => void handleStatusUpdate(req.id, "APPROVED")}
                                disabled={processingId === req.id}
                                className="!px-3 !py-1 text-xs"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => void handleStatusUpdate(req.id, "REJECTED")}
                                disabled={processingId === req.id}
                                className="!px-3 !py-1 text-xs"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
