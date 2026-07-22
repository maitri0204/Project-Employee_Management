"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { hrPolicyApi } from "@/lib/services";
import { HrPolicyDocument } from "@/types";
import { Button, Card } from "@/components/ui";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

export default function AdminHrPolicyPage() {
  const [documents, setDocuments] = useState<HrPolicyDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);

  const fetchDocuments = () => {
    hrPolicyApi.list().then((res) => {
      if (res.data) setDocuments(res.data);
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF or Word document.");
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("document", file);
      await hrPolicyApi.upload(formData);
      setFile(null);
      setMessage("Document uploaded successfully.");
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this HR policy document?")) return;
    setDeletingId(id);
    try {
      await hrPolicyApi.delete(id);
      setMessage("Document deleted.");
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black">HR Policy</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload PDF or Word documents. The uploaded file name is shown to employees and admins.
          </p>
        </div>

        <Card>
          {message && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Upload document <span className="text-red-600">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Accepted: PDF, DOC, DOCX (max 15 MB). Display name = uploaded file name.
              </p>
            </div>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-black">Uploaded Documents</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-black">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">{doc.displayName}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={hrPolicyApi.viewUrl(doc.id)}>
                      <Button type="button" variant="secondary">
                        View
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletingId === doc.id}
                      onClick={() => handleDelete(doc.id)}
                    >
                      {deletingId === doc.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
