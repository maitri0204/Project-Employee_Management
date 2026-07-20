"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leaves", label: "My Leaves" },
    ...(isAdmin
      ? [
          { href: "/admin/employees", label: "Employees" },
          { href: "/admin/employees/add", label: "Add Employee" },
          { href: "/admin/leaves", label: "Leave Requests" },
        ]
      : []),
  ];

  return (
    <nav className="border-b border-secondary-border bg-secondary">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-accent">
            EmployeeMS
          </Link>
          <div className="hidden gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-accent-light text-accent"
                    : "text-text-secondary hover:bg-primary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-secondary sm:inline">
            {user.employee?.firstName} {user.employee?.lastName}
          </span>
          <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">
            {user.role}
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-secondary-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
