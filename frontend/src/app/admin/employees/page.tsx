"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { Employee } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

function formatName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    employeeApi.getAll().then((res) => {
      if (res.data) setEmployees(res.data);
    });
  }, []);

  return (
    <ProtectedRoute adminOnly>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Employees</h1>
          <Link href="/admin/employees/add">
            <Button>+ Add Employee</Button>
          </Link>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-border bg-primary">
                <tr>
                  <th className="px-6 py-3 font-medium text-text-secondary">Name</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Email</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Phone</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Job Role</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">PL / CL / SL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-primary/50">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      {formatName(emp)}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{emp.user?.email}</td>
                    <td className="px-6 py-4 text-text-secondary">{emp.phone}</td>
                    <td className="px-6 py-4">
                      <Badge>{emp.jobRole}</Badge>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {emp.leaveBalance
                        ? `${emp.leaveBalance.pl} / ${emp.leaveBalance.cl} / ${emp.leaveBalance.sl}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
