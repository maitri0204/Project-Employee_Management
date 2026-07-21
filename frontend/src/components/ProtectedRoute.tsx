"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
    }
    if (!isLoading && user && adminOnly && user.role !== "ADMIN") {
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

  if (!user || (adminOnly && user.role !== "ADMIN")) {
    return null;
  }

  const shell = user.role === "ADMIN" ? (
    <AdminShell>{children}</AdminShell>
  ) : (
    <EmployeeShell>{children}</EmployeeShell>
  );

  return shell;
}
