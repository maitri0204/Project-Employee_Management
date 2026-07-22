"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { formatUsedTotal } from "@/lib/leaveFormat";
import { Employee } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

function formatName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(() => {
    employeeApi.getAll().then((res) => {
      if (res.data) setEmployees(res.data);
    });
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleArchive = async (emp: Employee) => {
    const name = formatName(emp);
    const confirmed = window.confirm(
      `Archive ${name}? They will be removed from the active employees list.`
    );
    if (!confirmed) return;

    setArchivingId(emp.id);
    try {
      await employeeApi.archive(emp.id);
      fetchEmployees();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive employee");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Employees</h1>
            <p className="mt-1 text-sm text-black">Manage your team members and their details.</p>
          </div>
          <Link href="/admin/employees/add">
            <Button>+ Add Employee</Button>
          </Link>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-black">Name</th>
                  <th className="px-6 py-3 font-medium text-black">Email</th>
                  <th className="px-6 py-3 font-medium text-black">Phone</th>
                  <th className="px-6 py-3 font-medium text-black">Job Role</th>
                  <th className="px-6 py-3 font-medium text-black">PL / CL / SL (used/total)</th>
                  <th className="px-6 py-3 font-medium text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-black">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-black">{formatName(emp)}</td>
                      <td className="px-6 py-4 text-black">{emp.user?.email}</td>
                      <td className="px-6 py-4 text-black">{emp.phone}</td>
                      <td className="px-6 py-4">
                        <Badge>{emp.jobRole || "-"}</Badge>
                      </td>
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
                            variant="secondary"
                            className="text-xs"
                            onClick={() => router.push(`/admin/employees/${emp.id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            className="text-xs"
                            disabled={archivingId === emp.id}
                            onClick={() => void handleArchive(emp)}
                          >
                            {archivingId === emp.id ? "Archiving..." : "Archive"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
