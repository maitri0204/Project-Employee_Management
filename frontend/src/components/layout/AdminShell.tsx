"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Archive,
  PartyPopper,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLeaveNotifications } from "@/context/LeaveNotificationContext";
import LeaveNotificationBadge from "@/components/LeaveNotificationBadge";

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
};

const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    exact: true,
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Employees",
    href: "/admin/employees",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Add Employee",
    href: "/admin/employees/add",
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    label: "Leave Requests",
    href: "/admin/leaves",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    label: "Daily Tasks",
    href: "/admin/tasks",
    icon: <CheckSquare className="h-5 w-5" />,
  },
  {
    label: "Leave Assign",
    href: "/admin/leave-assign",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    label: "Calendar",
    href: "/admin/calendar",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: "HR Policy",
    href: "/admin/hr-policy",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Holidays",
    href: "/admin/holidays",
    icon: <PartyPopper className="h-5 w-5" />,
  },
  {
    label: "Archive",
    href: "/admin/archive",
    icon: <Archive className="h-5 w-5" />,
  },
];

function formatName(first?: string, middle?: string | null, last?: string) {
  return [first, middle, last].filter(Boolean).join(" ") || "User";
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { pendingCount } = useLeaveNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = formatName(
    user?.employee?.firstName,
    user?.employee?.middleName,
    user?.employee?.lastName
  );

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : displayName.charAt(0).toUpperCase() || "A";
  }, [displayName]);

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen app-surface">
      <header className="fixed top-0 left-0 right-0 z-50 flex h-[72px] items-center gap-2 border-b border-gray-200 bg-white/95 pl-3 pr-3 shadow-sm backdrop-blur sm:h-[88px] sm:gap-4 sm:pl-5 sm:pr-4 md:pl-8">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-black hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow">
            EM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-black">EmployeeMS</p>
            <p className="truncate text-xs text-gray-500">Admin Portal</p>
          </div>
        </div>

        <div className="flex-1" />

        {pendingCount > 0 && (
          <Link
            href="/admin/leaves"
            className="relative mr-1 flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 sm:mr-3"
            title="Pending leave requests"
          >
            <ClipboardList className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Leave requests</span>
            <LeaveNotificationBadge count={pendingCount} pulse />
          </Link>
        )}

        <div className="mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white shadow sm:mr-4 sm:h-12 sm:w-12">
          {initials}
        </div>
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-[72px] z-40 flex h-[calc(100vh-72px)] w-[min(18rem,85vw)] flex-col border-r border-gray-200 bg-white/95 shadow-sm backdrop-blur transition-transform duration-300 sm:top-[88px] sm:h-[calc(100vh-88px)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {adminNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-black hover:bg-gray-100"
                }`}
              >
                <span className={active ? "text-blue-600" : "text-gray-400"}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/leaves" && (
                  <LeaveNotificationBadge count={pendingCount} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-black">{displayName}</p>
              <p className="truncate text-[11px] text-black">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 overflow-x-hidden pt-[72px] sm:pt-[88px] md:ml-72">
        <main className="min-w-0 p-2 sm:p-4 md:p-6">
          <div className="content-wrap app-panel w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-5 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
