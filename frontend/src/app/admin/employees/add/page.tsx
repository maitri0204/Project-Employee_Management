"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Country } from "country-state-city";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { mapApiErrorToField } from "@/lib/validation";
import { JOB_ROLES } from "@/constants/employee";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

const initialForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  jobRole: "",
  email: "",
  phoneNumber: "",
};

export default function AddEmployeePage() {
  const [form, setForm] = useState(initialForm);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useAutoDismiss(submitError, setSubmitError);

  const phoneCodes = useMemo(
    () =>
      Country.getAllCountries()
        .filter((country) => country.phonecode)
        .map((country) => ({
          isoCode: country.isoCode,
          label: `+${country.phonecode} (${country.name})`,
          value: `+${country.phonecode}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.lastName.trim()) errors.lastName = "Last name is required.";
    if (!form.jobRole) errors.jobRole = "Please select a role.";
    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!form.phoneNumber || form.phoneNumber.length !== 10) {
      errors.phoneNumber = "Please enter a valid 10-digit phone number.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("firstName", form.firstName.trim());
      if (form.middleName.trim()) formData.append("middleName", form.middleName.trim());
      formData.append("lastName", form.lastName.trim());
      formData.append("jobRole", form.jobRole);
      formData.append("email", form.email.trim());
      formData.append("phone", `${phoneCountryCode}${form.phoneNumber}`);

      await employeeApi.create(formData);
      router.push("/admin/employees");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add employee";
      const mapped = mapApiErrorToField(message);
      if (mapped.submit) {
        setSubmitError(mapped.submit);
      } else {
        setFieldErrors(mapped);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Add Employee</h1>
          <p className="mt-1 text-sm text-black">
            Enter basic details only. The employee will complete their profile and upload documents after signing in.
          </p>
        </div>

        <Card>
          {submitError && (
            <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="First Name"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                error={fieldErrors.firstName}
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
                error={fieldErrors.lastName}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Role"
                value={form.jobRole}
                onChange={(e) => update("jobRole", e.target.value)}
                error={fieldErrors.jobRole}
                required
              >
                <option value="">Select role</option>
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Used for OTP login"
                error={fieldErrors.email}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Phone number<span className="text-danger"> *</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-40 shrink-0 rounded-lg border border-secondary-border bg-secondary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-light"
                  required
                >
                  {phoneCodes.map((code) => (
                    <option key={code.isoCode} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    update("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit number"
                  maxLength={10}
                  className={`w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:ring-2 ${
                    fieldErrors.phoneNumber
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-secondary-border focus:border-accent focus:ring-accent-light"
                  }`}
                  required
                />
              </div>
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding Employee..." : "Add Employee"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/admin/employees")}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
