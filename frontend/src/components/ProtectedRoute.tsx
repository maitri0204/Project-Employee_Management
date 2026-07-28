"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isAdminRole } from "@/lib/roles";
import AdminShell from "@/components/layout/AdminShell";
import EmployeeShell from "@/components/layout/EmployeeShell";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (!isLoading && user && adminOnly && !isAdminRole(user.role)) {
      router.push("/dashboard");
    }
  }, [user, isLoading, adminOnly, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-surface">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div>
            <p className="text-base font-semibold text-black">Loading...</p>
            <p className="text-sm text-black">Preparing your workspace.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && !isAdminRole(user.role)) return null;

  const shell = isAdminRole(user.role) ? (
    <AdminShell>{children}</AdminShell>
  ) : (
    <EmployeeShell>{children}</EmployeeShell>
  );

  return shell;
}
