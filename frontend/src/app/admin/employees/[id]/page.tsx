"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { formatUsedTotal } from "@/lib/leaveFormat";
import { UPLOADS_BASE } from "@/lib/api";
import { ACCOUNT_TYPES, GENDER_OPTIONS } from "@/constants/employee";
import { Employee } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

function formatName(emp: Employee) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-black">{value?.trim() ? value : "-"}</dd>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm">
        {url ? (
          <a
            href={`${UPLOADS_BASE}${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            View document
          </a>
        ) : (
          <span className="text-slate-500">Not uploaded</span>
        )}
      </dd>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployee = useCallback(() => {
    setLoading(true);
    setError("");
    employeeApi
      .getById(id)
      .then((res) => {
        if (res.data) setEmployee(res.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load employee");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="mt-1 text-sm text-black">View profile and manage leave balance.</p>
          </div>
          {employee?.isArchived && <Badge variant="warning">Archived</Badge>}
        </div>

        {loading ? (
          <Card>
            <p className="text-sm text-black">Loading employee details...</p>
          </Card>
        ) : error ? (
          <Card>
            <p className="text-sm text-red-600">{error}</p>
            <Link href="/admin/employees" className="mt-4 inline-block">
              <Button variant="secondary">Back to Employees</Button>
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
              <h2 className="mb-4 text-lg font-semibold text-blue-700">Documents</h2>
              <dl className="grid gap-4 md:grid-cols-2">
                <DocumentLink label="Aadhar Card" url={employee.aadharCardUrl} />
                <DocumentLink label="PAN Card" url={employee.panCardUrl} />
                <DocumentLink label="Cancelled Cheque" url={employee.cancelledChequeUrl} />
                <DocumentLink label="Resume" url={employee.resumeUrl} />
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Degree Certificates
                  </dt>
                  <dd className="mt-1 space-y-1 text-sm">
                    {employee.degreeCertificateUrls?.length ? (
                      employee.degreeCertificateUrls.map((url, index) => (
                        <div key={`${url}-${index}`}>
                          <a
                            href={`${UPLOADS_BASE}${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Certificate {index + 1}
                          </a>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500">Not uploaded</span>
                    )}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-700">Leave Summary</h2>
                <Link href="/admin/leave-assign">
                  <Button variant="secondary" className="text-xs">
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
