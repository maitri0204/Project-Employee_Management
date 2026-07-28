"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import { hrPolicyApi } from "@/lib/services";
import { isAdminRole } from "@/lib/roles";
import { Button, Card } from "@/components/ui";

type WordPreview = {
  displayName: string;
  html: string;
};

export default function HrPolicyViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [title, setTitle] = useState("HR Policy");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordPreview, setWordPreview] = useState<WordPreview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let objectUrl: string | null = null;

    const load = async () => {
      setIsLoading(true);
      setError("");
      setPdfUrl(null);
      setWordPreview(null);

      try {
        const response = await fetchWithAuth(`/hr-policy/${id}/view`);
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Failed to load document");
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/pdf")) {
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          const disposition = response.headers.get("content-disposition") || "";
          const match = disposition.match(/filename="?([^"]+)"?/i);
          setTitle(match?.[1] ? decodeURIComponent(match[1]) : "HR Policy");
          setPdfUrl(objectUrl);
          return;
        }

        const data = await response.json();
        if (data?.data?.html) {
          setTitle(data.data.displayName || "HR Policy");
          setWordPreview({
            displayName: data.data.displayName,
            html: data.data.html,
          });
          return;
        }

        throw new Error("Unsupported document preview.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  const handleDownload = async () => {
    if (!id || !isAdmin) return;
    const response = await fetchWithAuth(`/hr-policy/${id}/download`);
    if (!response.ok) {
      alert("Failed to download document");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = title;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const backHref = isAdmin ? "/admin/hr-policy" : "/hr-policy";

  return (
    <ProtectedRoute adminOnly={false}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={backHref} className="text-sm font-medium text-blue-600 hover:underline">
              ← Back to HR Policy
            </Link>
            <h1 className="mt-2 text-xl font-bold text-black break-all">{title}</h1>
            {!isAdmin && (
              <p className="mt-1 text-sm text-slate-600">View only - download is not available.</p>
            )}
          </div>
          {isAdmin && (
            <Button type="button" variant="secondary" onClick={handleDownload}>
              Download
            </Button>
          )}
        </div>

        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-black">Loading document...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={title}
              className="h-[75vh] w-full border-0"
            />
          ) : wordPreview ? (
            <div
              className="prose prose-sm max-w-none p-6 text-black"
              dangerouslySetInnerHTML={{ __html: wordPreview.html }}
            />
          ) : (
            <p className="p-6 text-sm text-black">No preview available.</p>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
