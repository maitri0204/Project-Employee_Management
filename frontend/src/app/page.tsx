"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      router.push(user ? "/dashboard" : "/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center app-surface">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );
}
