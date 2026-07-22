"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, LockOpen, Pencil } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DocumentUploadRow from "@/components/DocumentUploadRow";
import { employeeApi } from "@/lib/services";
import { formatUsedTotal } from "@/lib/leaveFormat";
import {
  DOCUMENT_HINTS,
  DOCUMENT_ITEMS,
  DOCUMENT_LABELS,
  getDocumentReview,
  getDocumentsStatus,
  getDocumentUrls,
} from "@/lib/employeeProfile";
import { ACCOUNT_TYPES, GENDER_OPTIONS } from "@/constants/employee";
import { DocumentKey, DocumentsStatus, Employee } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

function formatName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function documentsStatusLabel(status?: DocumentsStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return "Not submitted";
  }
}

function documentsStatusVariant(status?: DocumentsStatus): "warning" | "success" | "danger" | "default" {
  switch (status) {
    case "PENDING_REVIEW":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "default";
  }
}

function reviewStatusVariant(status: DocumentsStatus): "warning" | "success" | "danger" | "default" {
  return documentsStatusVariant(status);
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-black">{value?.trim() ? value : "-"}</dd>
    </div>
  );
}

function DocumentReviewRow({
  employee,
  documentKey,
  processingKey,
  onApprove,
  onReject,
}: {
  employee: Employee;
  documentKey: DocumentKey;
  processingKey: string | null;
  onApprove: (key: DocumentKey) => Promise<void>;
  onReject: (key: DocumentKey, reason: string) => Promise<void>;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rowError, setRowError] = useState("");

  const label = DOCUMENT_LABELS[documentKey];
  const urls = getDocumentUrls(employee, documentKey);
  const review = getDocumentReview(employee, documentKey);
  const isProcessing = processingKey === documentKey;
  const canReview = urls.length > 0 && review.status === "PENDING_REVIEW";
  const isDegreeGroup = documentKey === "degreeCertificates";

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setRowError("Please enter a rejection reason.");
      return;
    }
    setRowError("");
    try {
      await onReject(documentKey, rejectReason.trim());
      setShowRejectForm(false);
      setRejectReason("");
    } catch {
      // Parent sets actionError; keep form open.
    }
  };

  const adminActions =
    canReview && !showRejectForm ? (
      <>
        <Button
          size="sm"
          variant="success"
          disabled={isProcessing}
          onClick={() => void onApprove(documentKey)}
        >
          {isProcessing ? "Approving..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={isProcessing}
          onClick={() => {
            setShowRejectForm(true);
            setRowError("");
          }}
        >
          Reject
        </Button>
      </>
    ) : null;

  if (isDegreeGroup && urls.length > 1) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Multiple
          </span>
          <Badge variant={reviewStatusVariant(review.status)}>
            {documentsStatusLabel(review.status)}
          </Badge>
        </div>
        {urls.map((url, index) => (
          <DocumentUploadRow
            key={`${url}-${index}`}
            label={`Certificate ${index + 1}`}
            hint="Uploaded degree certificate"
            status={review.status}
            fileUrl={url}
            actions={index === 0 ? adminActions : undefined}
          />
        ))}
        {showRejectForm && (
          <div className="rounded-xl border border-red-200 bg-white p-3">
            <p className="text-xs font-semibold text-red-800">
              Rejection reason (will be emailed to employee)
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rowError) setRowError("");
              }}
              rows={3}
              placeholder="Explain what needs to be corrected..."
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={isProcessing}
                onClick={() => void handleRejectSubmit()}
              >
                {isProcessing ? "Sending..." : "Send Rejection"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isProcessing}
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason("");
                  setRowError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DocumentUploadRow
        label={label}
        hint={DOCUMENT_HINTS[documentKey]}
        status={review.status}
        rejectedReason={review.rejectedReason}
        fileUrl={urls[0] ?? null}
        actions={adminActions}
      />

      {review.status === "REJECTED" && !urls.length && (
        <p className="text-xs text-slate-500">Awaiting employee re-upload.</p>
      )}

      {showRejectForm && (
        <div className="rounded-xl border border-red-200 bg-white p-3">
          <p className="text-xs font-semibold text-red-800">
            Rejection reason (will be emailed to employee)
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (rowError) setRowError("");
            }}
            rows={3}
            placeholder="Explain what needs to be corrected..."
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={isProcessing}
              onClick={() => void handleRejectSubmit()}
            >
              {isProcessing ? "Sending..." : "Send Rejection"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isProcessing}
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason("");
                setRowError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function mergeEmployeeState(prev: Employee | null, next: Employee): Employee {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    leaveUsage: next.leaveUsage ?? prev.leaveUsage,
    leaveTotals: next.leaveTotals ?? prev.leaveTotals,
    plTotal: next.plTotal ?? prev.plTotal,
    clTotal: next.clTotal ?? prev.clTotal,
    slTotal: next.slTotal ?? prev.slTotal,
    clUsableThisHalf: next.clUsableThisHalf ?? prev.clUsableThisHalf,
    lwpTaken: next.lwpTaken ?? prev.lwpTaken,
    user: next.user ?? prev.user,
    leaveBalance: next.leaveBalance ?? prev.leaveBalance,
  };
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const fetchEmployee = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    employeeApi
      .getById(id)
      .then((res) => {
        if (res.data) setEmployee(res.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load employee");
      })
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchEmployee(true);
  }, [fetchEmployee]);

  const handleApprove = async (documentKey: DocumentKey) => {
    setActionError("");
    setProcessingKey(documentKey);
    try {
      const res = await employeeApi.approveDocument(id, documentKey);
      if (res.data) {
        setEmployee((prev) => mergeEmployeeState(prev, res.data!));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve document");
      throw err;
    } finally {
      setProcessingKey(null);
    }
  };

  const handleReject = async (documentKey: DocumentKey, reason: string) => {
    setActionError("");
    setProcessingKey(documentKey);
    try {
      const res = await employeeApi.rejectDocument(id, documentKey, reason);
      if (res.data) {
        setEmployee((prev) => mergeEmployeeState(prev, res.data!));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject document");
      throw err;
    } finally {
      setProcessingKey(null);
    }
  };

  const handleToggleLock = async () => {
    if (!employee) return;
    setActionError("");
    setProcessingKey("lock");
    try {
      const res = await employeeApi.toggleLock(id, !employee.isProfileLocked);
      if (res.data) {
        setEmployee((prev) => mergeEmployeeState(prev, res.data!));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update lock status");
    } finally {
      setProcessingKey(null);
    }
  };

  const genderLabel =
    GENDER_OPTIONS.find((g) => g.value === employee?.gender)?.label ?? employee?.gender;
  const accountLabel =
    ACCOUNT_TYPES.find((a) => a.value === employee?.accountType)?.label ?? employee?.accountType;

  const addressLines = [
    employee?.addressLine1,
    employee?.addressLine2,
    employee?.addressLine3,
    [employee?.city, employee?.state, employee?.pincode].filter(Boolean).join(", "),
    employee?.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/admin/employees")}
              className="mb-2 text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Employees
            </button>
            <h1 className="text-2xl font-bold text-black">
              {employee ? formatName(employee) : "Employee Details"}
            </h1>
            <p className="mt-1 text-sm text-black">View profile, review documents, and manage access.</p>
            {employee && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={documentsStatusVariant(getDocumentsStatus(employee))}>
                  Documents: {documentsStatusLabel(getDocumentsStatus(employee))}
                </Badge>
                {employee.isProfileLocked && <Badge variant="warning">Profile locked</Badge>}
                {employee.isArchived && <Badge variant="warning">Archived</Badge>}
              </div>
            )}
          </div>

          {employee && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/employees/${id}/edit`}>
                <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-2"
                disabled={processingKey === "lock"}
                onClick={handleToggleLock}
              >
                {employee.isProfileLocked ? (
                  <>
                    <LockOpen className="h-4 w-4" />
                    Unlock Profile
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Lock Profile
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {actionError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
        )}

        {loading ? (
          <Card>
            <p className="text-sm text-black">Loading employee details...</p>
          </Card>
        ) : error ? (
          <Card>
            <p className="text-sm text-red-600">{error}</p>
            <Link href="/admin/employees" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Back to Employees
              </Button>
            </Link>
          </Card>
        ) : employee ? (
          <>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-blue-700">Personal Information</h2>
              <dl className="grid gap-4 md:grid-cols-3">
                <DetailField label="First Name" value={employee.firstName} />
                <DetailField label="Middle Name" value={employee.middleName} />
                <DetailField label="Last Name" value={employee.lastName} />
                <DetailField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                <DetailField label="Gender" value={genderLabel} />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Job Role
                  </dt>
                  <dd className="mt-1">
                    <Badge>{employee.jobRole || "-"}</Badge>
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold text-blue-700">Contact Details</h2>
              <dl className="grid gap-4 md:grid-cols-2">
                <DetailField label="Email" value={employee.user?.email} />
                <DetailField label="Phone" value={employee.phone} />
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold text-blue-700">Address</h2>
              <dl className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Full Address
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm font-medium text-black">
                    {addressLines || "-"}
                  </dd>
                </div>
                <DetailField label="Pincode" value={employee.pincode} />
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold text-blue-700">Identity & Bank Details</h2>
              <dl className="grid gap-4 md:grid-cols-2">
                <DetailField label="PAN Number" value={employee.panNumber} />
                <DetailField label="Aadhar Number" value={employee.aadharNumber} />
                <DetailField label="Bank Account Number" value={employee.bankAccountNumber} />
                <DetailField label="Account Type" value={accountLabel} />
                <DetailField label="IFSC Code" value={employee.ifscCode} />
                <DetailField label="Bank Name" value={employee.bankName} />
                <DetailField label="Bank Branch" value={employee.bankBranchName} />
              </dl>
            </Card>

            <Card>
              <h2 className="mb-2 text-lg font-semibold text-blue-700">Documents</h2>
              <p className="mb-4 text-sm text-slate-600">
                Review each document individually. Approved documents cannot be changed by the employee.
              </p>
              <div className="space-y-3">
                {DOCUMENT_ITEMS.map(({ key }) => (
                  <DocumentReviewRow
                    key={key}
                    employee={employee}
                    documentKey={key}
                    processingKey={processingKey}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-700">Leave Summary</h2>
                <Link href="/admin/leave-assign">
                  <Button variant="outline" size="sm">
                    Leave Assign
                  </Button>
                </Link>
              </div>
              {employee.joiningDate && (
                <p className="mb-4 text-sm text-slate-600">
                  Effective joining: {formatDate(employee.joiningDate)}
                  {employee.leaveBalance?.lastClSlCreditFY && (
                    <span className="ml-2">· FY {employee.leaveBalance.lastClSlCreditFY}</span>
                  )}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-medium text-slate-600">PL (used/total)</p>
                  <p className="mt-1 text-xl font-bold text-blue-700">
                    {formatUsedTotal(
                      employee.leaveUsage?.PL ?? 0,
                      employee.leaveTotals?.PL ??
                        (employee.leaveUsage?.PL ?? 0) + (employee.leaveBalance?.pl ?? 0)
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-slate-600">CL (used/total)</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {formatUsedTotal(
                      employee.leaveUsage?.CL ?? 0,
                      employee.leaveTotals?.CL ?? employee.clTotal ?? 0
                    )}
                  </p>
                  {employee.clUsableThisHalf !== undefined && (
                    <p className="mt-1 text-xs text-slate-500">
                      Usable this half: {employee.clUsableThisHalf}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-medium text-slate-600">SL (used/total)</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">
                    {formatUsedTotal(
                      employee.leaveUsage?.SL ?? 0,
                      employee.leaveTotals?.SL ??
                        (employee.leaveUsage?.SL ?? 0) + (employee.leaveBalance?.sl ?? 0)
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs font-medium text-slate-600">LWP taken</p>
                  <p className="mt-1 text-xl font-bold text-red-700">
                    {employee.lwpTaken ?? employee.leaveUsage?.LWP ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
