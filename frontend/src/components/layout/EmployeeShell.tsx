"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, CheckSquare, FileText, LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const employeeNav = [
  {
    label: "Dashboard",
    href: "/dashboard",
    exact: true,
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Leaves & Calendar",
    href: "/leaves",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: "Daily Tasks",
    href: "/tasks",
    icon: <CheckSquare className="h-5 w-5" />,
  },
  {
    label: "HR Policy",
    href: "/hr-policy",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "My Profile",
    href: "/profile",
    icon: <UserCircle className="h-5 w-5" />,
  },
];

function formatName(first?: string, middle?: string | null, last?: string) {
  return [first, middle, last].filter(Boolean).join(" ") || "Employee";
}

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
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
      : displayName.charAt(0).toUpperCase() || "E";
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
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-[84px] items-center gap-3 border-b border-gray-200 bg-white/95 pl-4 pr-3 shadow-sm backdrop-blur sm:h-[96px] sm:gap-4 sm:pl-7 sm:pr-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex h-14 w-36 items-center gap-3 sm:h-16 sm:w-44">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow">
            EM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-black">EmployeeMS</p>
            <p className="truncate text-xs text-gray-500">Employee Portal</p>
          </div>
        </div>
      </nav>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-[84px] z-40 flex h-[calc(100vh-84px)] w-72 flex-col border-r border-gray-200 bg-white/95 shadow-sm backdrop-blur transition-transform duration-300 sm:top-[96px] sm:h-[calc(100vh-96px)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-5 py-6">
          {employeeNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl py-3 pl-4 pr-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
                <span className="min-w-0">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3 pl-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-[11px] text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 inline-flex items-center gap-2 pl-1 text-xs font-semibold text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pt-[84px] sm:pt-[96px] md:ml-72">
        <main className="p-3 sm:p-5 md:p-6">
          <div className="content-wrap app-panel p-3 sm:p-5 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
