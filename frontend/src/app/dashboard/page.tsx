"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLeaveNotifications } from "@/context/LeaveNotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi, leaveApi } from "@/lib/services";
import { GENDER_OPTIONS } from "@/constants/employee";
import { formatUsedTotal, getLeaveTotals } from "@/lib/leaveFormat";
import { LeaveBalanceSummary } from "@/types";
import { Badge, Card, StatCard } from "@/components/ui";

function formatName(first?: string, middle?: string | null, last?: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

function AdminDashboard() {
  const { user } = useAuth();
  const { pendingCount } = useLeaveNotifications();
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    employeeApi.getAll(false).then((res) => {
      if (res.data) setEmployeeCount(res.data.length);
    });
  }, []);

  const quickActions = [
    {
      label: "Employees",
      desc: "View and manage all employees",
      href: "/admin/employees",
      icon: Users,
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Add Employee",
      desc: "Onboard a new team member",
      href: "/admin/employees/add",
      icon: UserPlus,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      label: "Leave Assign",
      desc: "Assign company-wide PL, CL, SL entitlements",
      href: "/admin/leave-assign",
      icon: ClipboardList,
      gradient: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-blue-100">
          Welcome back{user?.employee?.firstName ? `, ${user.employee.firstName}` : ""}. Manage employees and leave requests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Employees" value={employeeCount} />
        <StatCard label="Pending Leave Requests" value={pendingCount} accentClass="text-amber-600" />
        <StatCard label="Your Role" value="Admin" accentClass="text-blue-700" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-black">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-black">{action.label}</h3>
              <p className="mt-1 text-sm text-black">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<LeaveBalanceSummary | null>(null);
  const employee = user?.employee;

  useEffect(() => {
    leaveApi.getMyBalance().then((res) => {
      if (res.data) setBalance(res.data);
    });
  }, []);

  const totals = balance ? getLeaveTotals(balance) : null;
  const usage = balance?.usage;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <p className="mt-1 text-blue-100">
          Welcome back{employee?.firstName ? `, ${employee.firstName}` : ""}. Track your profile and leave balance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="PL (used/total)"
          value={
            usage && totals
              ? formatUsedTotal(usage.PL, totals.PL)
              : "-"
          }
          accentClass="text-blue-700"
        />
        <StatCard
          label="CL (used/total)"
          value={
            usage && totals
              ? formatUsedTotal(usage.CL, totals.CL)
              : "-"
          }
          accentClass="text-emerald-700"
        />
        <StatCard
          label="SL (used/total)"
          value={
            usage && totals
              ? formatUsedTotal(usage.SL, totals.SL)
              : "-"
          }
          accentClass="text-amber-600"
        />
        <StatCard label="LWP Taken" value={balance?.lwpTaken ?? "-"} accentClass="text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">Profile</h2>
            <Link
              href="/profile"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Complete Profile
            </Link>
          </div>
          {employee ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-black">Name</dt>
                <dd className="text-right font-medium text-black">
                  {formatName(employee.firstName, employee.middleName, employee.lastName)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black">Email</dt>
                <dd className="font-medium text-black">{user?.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black">Job Role</dt>
                <dd>
                    <Badge>{employee.jobRole || "-"}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black">Gender</dt>
                <dd className="font-medium text-black">
                  {GENDER_OPTIONS.find((g) => g.value === employee.gender)?.label ??
                    employee.gender}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black">Phone</dt>
                <dd className="font-medium text-black">{employee.phone}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-black">No employee profile found.</p>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">Leave Balance</h2>
            <Link
              href="/leaves"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Apply for Leave
            </Link>
          </div>
          {balance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {usage && totals ? formatUsedTotal(usage.PL, totals.PL) : "-"}
                  </p>
                  <p className="text-xs font-medium text-black">PL</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {usage && totals ? formatUsedTotal(usage.CL, totals.CL) : "-"}
                  </p>
                  <p className="text-xs font-medium text-black">CL</p>
                  {balance.clUsableThisHalf !== undefined && (
                    <p className="mt-1 text-xs text-emerald-800">
                      Usable this half (
                      {balance.clHalfYear?.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar"}):{" "}
                      {balance.clUsableThisHalf}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {usage && totals ? formatUsedTotal(usage.SL, totals.SL) : "-"}
                  </p>
                  <p className="text-xs font-medium text-black">SL</p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{balance.lwpTaken ?? 0}</p>
                  <p className="text-xs font-medium text-black">LWP taken</p>
                </div>
              </div>
              {balance.financialYear && (
                <p className="text-xs text-slate-500">
                  Financial year {balance.financialYear} · CL is split Apr–Sep / Oct–Mar from
                  April (unused from first half carries forward) · PL carries forward yearly
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-black">Loading leave balance...</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user?.role === "ADMIN" ? <AdminDashboard /> : <EmployeeDashboard />}
    </ProtectedRoute>
  );
}
