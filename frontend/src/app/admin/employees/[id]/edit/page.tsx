"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmployeeOnboardingForm from "@/components/EmployeeOnboardingForm";
import { employeeApi } from "@/lib/services";
import { Employee } from "@/types";
import { Button, Card } from "@/components/ui";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchEmployee = useCallback(() => {
    setLoading(true);
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

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push(`/admin/employees/${id}`)}
              className="mb-2 text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Employee
            </button>
            <h1 className="text-2xl font-bold text-black">Edit Employee</h1>
            <p className="mt-1 text-sm text-black">
              Admin can edit all fields even when the employee profile is locked.
            </p>
          </div>
        </div>

        {saved && (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Employee updated successfully.
          </div>
        )}

        {loading ? (
          <Card>
            <p className="text-sm text-black">Loading...</p>
          </Card>
        ) : error ? (
          <Card>
            <p className="text-sm text-red-600">{error}</p>
            <Button className="mt-4" variant="secondary" onClick={() => router.push("/admin/employees")}>
              Back to Employees
            </Button>
          </Card>
        ) : employee ? (
          <Card>
            <EmployeeOnboardingForm
              key={employee.updatedAt}
              mode="admin"
              employee={employee}
              email={employee.user?.email}
              documentsEditable
              onSubmit={async (formData) => {
                await employeeApi.update(id, formData);
                setSaved(true);
                fetchEmployee();
              }}
            />
          </Card>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
