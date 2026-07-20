"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { leaveApi } from "@/lib/services";
import { LeaveBalance } from "@/types";
import { Badge, Card } from "@/components/ui";

function formatName(first?: string, middle?: string | null, last?: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    if (user?.role === "EMPLOYEE") {
      leaveApi.getMyBalance().then((res) => {
        if (res.data) setBalance(res.data);
      });
    }
  }, [user]);

  const employee = user?.employee;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Profile</h2>
            {employee ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Name</dt>
                  <dd className="text-right font-medium text-text-primary">
                    {formatName(employee.firstName, employee.middleName, employee.lastName)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Email</dt>
                  <dd className="font-medium text-text-primary">{user?.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Gender</dt>
                  <dd className="font-medium text-text-primary">{employee.gender}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Phone</dt>
                  <dd className="font-medium text-text-primary">{employee.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Date of Birth</dt>
                  <dd className="font-medium text-text-primary">
                    {new Date(employee.dateOfBirth).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Address</dt>
                  <dd className="max-w-[60%] text-right font-medium text-text-primary">
                    {employee.address}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Role</dt>
                  <dd>
                    <Badge>{user?.role}</Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-text-muted">No employee profile found.</p>
            )}
          </Card>

          {user?.role === "EMPLOYEE" && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Leave Balance
              </h2>
              {balance ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-accent-light p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{balance.pl}</p>
                    <p className="text-xs font-medium text-text-secondary">PL (Privilege)</p>
                  </div>
                  <div className="rounded-lg bg-primary-dark p-4 text-center">
                    <p className="text-2xl font-bold text-text-primary">{balance.cl}</p>
                    <p className="text-xs font-medium text-text-secondary">CL (Casual)</p>
                  </div>
                  <div className="rounded-lg bg-primary p-4 text-center">
                    <p className="text-2xl font-bold text-text-primary">{balance.sl}</p>
                    <p className="text-xs font-medium text-text-secondary">SL (Sick)</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted">Loading leave balance...</p>
              )}
            </Card>
          )}

          {user?.role === "ADMIN" && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Admin Quick Actions
              </h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>• Add new employees with full details and documents</li>
                <li>• Set individual PL, CL, SL leave balances per employee</li>
                <li>• Review and approve/reject leave requests</li>
              </ul>
            </Card>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
