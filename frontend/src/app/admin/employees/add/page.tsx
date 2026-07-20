"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { Gender, Role } from "@/types";
import { Button, Card, FileInput, Input, Select } from "@/components/ui";

const initialForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "MALE" as Gender,
  email: "",
  role: "EMPLOYEE" as Role,
  address: "",
  phone: "",
  panNumber: "",
  aadharNumber: "",
  bankAccountNumber: "",
  ifscCode: "",
  bankName: "",
  bankBranchName: "",
  pl: "12",
  cl: "8",
  sl: "6",
};

export default function AddEmployeePage() {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState<{
    aadharCard?: File;
    panCard?: File;
    cancelledCheque?: File;
  }>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (files.aadharCard) formData.append("aadharCard", files.aadharCard);
      if (files.panCard) formData.append("panCard", files.panCard);
      if (files.cancelledCheque) formData.append("cancelledCheque", files.cancelledCheque);

      await employeeApi.create(formData);
      router.push("/admin/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Add Employee</h1>

        <Card>
          {error && (
            <div className="mb-6 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Personal Information</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  required
                />
                <Input
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(e) => update("middleName", e.target.value)}
                />
                <Input
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  required
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  required
                />
                <Select
                  label="Gender"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  required
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
                <Select
                  label="Role"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  required
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Contact Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="Used for OTP login"
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  required
                />
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Identity & Bank Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="PAN Number"
                  value={form.panNumber}
                  onChange={(e) => update("panNumber", e.target.value.toUpperCase())}
                  required
                />
                <Input
                  label="Aadhar Number"
                  value={form.aadharNumber}
                  onChange={(e) => update("aadharNumber", e.target.value)}
                  maxLength={12}
                  required
                />
                <Input
                  label="Bank Account Number"
                  value={form.bankAccountNumber}
                  onChange={(e) => update("bankAccountNumber", e.target.value)}
                  required
                />
                <Input
                  label="IFSC Code"
                  value={form.ifscCode}
                  onChange={(e) => update("ifscCode", e.target.value.toUpperCase())}
                  required
                />
                <Input
                  label="Bank Name"
                  value={form.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  required
                />
                <Input
                  label="Bank Branch Name"
                  value={form.bankBranchName}
                  onChange={(e) => update("bankBranchName", e.target.value)}
                  required
                />
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Leave Allocation</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="PL (Privilege Leave)"
                  type="number"
                  min="0"
                  value={form.pl}
                  onChange={(e) => update("pl", e.target.value)}
                  required
                />
                <Input
                  label="CL (Casual Leave)"
                  type="number"
                  min="0"
                  value={form.cl}
                  onChange={(e) => update("cl", e.target.value)}
                  required
                />
                <Input
                  label="SL (Sick Leave)"
                  type="number"
                  min="0"
                  value={form.sl}
                  onChange={(e) => update("sl", e.target.value)}
                  required
                />
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Document Uploads</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <FileInput
                  label="Aadhar Card"
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, aadharCard: e.target.files?.[0] }))
                  }
                />
                <FileInput
                  label="PAN Card"
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, panCard: e.target.files?.[0] }))
                  }
                />
                <FileInput
                  label="Cancelled Cheque"
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, cancelledCheque: e.target.files?.[0] }))
                  }
                />
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Accepted formats: JPEG, PNG, PDF (max 5 MB each)
              </p>
            </section>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding Employee..." : "Add Employee"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/admin/employees")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
