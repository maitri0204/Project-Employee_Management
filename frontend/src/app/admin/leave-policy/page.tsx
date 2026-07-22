"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeavePolicyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/leave-assign");
  }, [router]);

  return null;
}
