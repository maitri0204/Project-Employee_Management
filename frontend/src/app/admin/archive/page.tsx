"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Users } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { formatUsedTotal } from "@/lib/leaveFormat";
import { Employee } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

function formatName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

function formatArchivedDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminArchivePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  const fetchArchivedEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await employeeApi.getArchived();
      setEmployees(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archived employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchArchivedEmployees();
  }, [fetchArchivedEmployees]);

  const handleUnarchive = async (emp: Employee) => {
    const name = formatName(emp);
    const confirmed = window.confirm(
      `Restore ${name} to active employees? They will be able to log in again.`
    );
    if (!confirmed) return;

    setUnarchivingId(emp.id);
    setError("");
    setSuccess("");
    try {
      await employeeApi.unarchive(emp.id);
      setSuccess(`${name} has been restored to active employees.`);
      await fetchArchivedEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore employee");
    } finally {
      setUnarchivingId(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Archive className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Archived Employees</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-300 sm:text-base">
                  Archived employees cannot log in. Restore them here to return them to the active list.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
              <Users className="h-4 w-4" />
              {employees.length} archived
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/employees">
            <Button variant="secondary" size="sm">
              Back to active employees
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading archived employees...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-black">Name</th>
                    <th className="px-6 py-3 font-medium text-black">Email</th>
                    <th className="px-6 py-3 font-medium text-black">Phone</th>
                    <th className="px-6 py-3 font-medium text-black">Job Role</th>
                    <th className="px-6 py-3 font-medium text-black">Archived on</th>
                    <th className="px-6 py-3 font-medium text-black">PL / CL / SL (used/total)</th>
                    <th className="px-6 py-3 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                          <Archive className="h-10 w-10 text-slate-300" />
                          <p className="font-medium text-slate-700">No archived employees</p>
                          <p className="text-sm">
                            When you archive someone from the Employees page, they will appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-black">{formatName(emp)}</span>
                            <Badge variant="warning">Archived</Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-black">{emp.user?.email}</td>
                        <td className="px-6 py-4 text-black">{emp.phone}</td>
                        <td className="px-6 py-4">
                          <Badge>{emp.jobRole || "-"}</Badge>
                        </td>
                        <td className="px-6 py-4 text-black">{formatArchivedDate(emp.updatedAt)}</td>
                        <td className="px-6 py-4 text-black">
                          {emp.leaveUsage && emp.leaveTotals
                            ? `${formatUsedTotal(emp.leaveUsage.PL, emp.leaveTotals.PL)} / ${formatUsedTotal(emp.leaveUsage.CL, emp.leaveTotals.CL)} / ${formatUsedTotal(emp.leaveUsage.SL, emp.leaveTotals.SL)}`
                            : emp.leaveBalance
                              ? `${emp.leaveBalance.pl} / ${emp.leaveBalance.cl} / ${emp.leaveBalance.sl}`
                              : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/employees/${emp.id}`)}
                            >
                              View Details
                            </Button>
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              disabled={unarchivingId === emp.id}
                              onClick={() => void handleUnarchive(emp)}
                            >
                              {unarchivingId === emp.id ? "Restoring..." : "Unarchive"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
