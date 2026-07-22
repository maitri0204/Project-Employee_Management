"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { hrPolicyApi } from "@/lib/services";
import { HrPolicyDocument } from "@/types";
import { Card } from "@/components/ui";

export default function EmployeeHrPolicyPage() {
  const [documents, setDocuments] = useState<HrPolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    hrPolicyApi
      .list()
      .then((res) => {
        if (res.data) setDocuments(res.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black">HR Policy</h1>
          <p className="mt-1 text-sm text-slate-600">
            View company HR policy documents. Documents open in the browser for viewing only.
          </p>
        </div>

        <Card>
          {isLoading ? (
            <p className="text-sm text-black">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-black">No HR policy documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">{doc.displayName}</p>
                    <p className="text-xs text-slate-500">
                      Uploaded {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Link
                    href={hrPolicyApi.viewUrl(doc.id)}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
