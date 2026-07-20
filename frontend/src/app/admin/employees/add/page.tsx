"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { City, Country, State } from "country-state-city";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { employeeApi } from "@/lib/services";
import { ACCOUNT_TYPES, GENDER_OPTIONS, JOB_ROLES } from "@/constants/employee";
import { Gender } from "@/types";
import { Button, Card, FileInput, Input, Select } from "@/components/ui";

const initialForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "MALE" as Gender,
  jobRole: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
  phoneNumber: "",
  panNumber: "",
  aadharNumber: "",
  bankAccountNumber: "",
  accountType: "",
  ifscCode: "",
  bankName: "",
  bankBranchName: "",
};

export default function AddEmployeePage() {
  const [form, setForm] = useState(initialForm);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [files, setFiles] = useState<{
    aadharCard?: File;
    panCard?: File;
    cancelledCheque?: File;
    resume?: File;
    degreeCertificates?: FileList;
  }>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode]
  );
  const cities = useMemo(
    () => (countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []),
    [countryCode, stateCode]
  );

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
  };

  const handleCountryChange = (isoCode: string) => {
    const selected = countries.find((c) => c.isoCode === isoCode);
    setCountryCode(isoCode);
    setStateCode("");
    setForm((prev) => ({
      ...prev,
      country: selected?.name || "",
      state: "",
      city: "",
    }));
  };

  const handleStateChange = (isoCode: string) => {
    const selected = states.find((s) => s.isoCode === isoCode);
    setStateCode(isoCode);
    setForm((prev) => ({
      ...prev,
      state: selected?.name || "",
      city: "",
    }));
  };

  const handleCityChange = (cityName: string) => {
    update("city", cityName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!/^\d{10}$/.test(form.phoneNumber)) {
        setError("Phone number must be exactly 10 digits.");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value && key !== "phoneNumber") formData.append(key, value);
      });
      formData.append("phone", `${phoneCountryCode}${form.phoneNumber}`);

      if (files.aadharCard) formData.append("aadharCard", files.aadharCard);
      if (files.panCard) formData.append("panCard", files.panCard);
      if (files.cancelledCheque) formData.append("cancelledCheque", files.cancelledCheque);
      if (files.resume) formData.append("resume", files.resume);
      if (files.degreeCertificates) {
        Array.from(files.degreeCertificates).forEach((file) => {
          formData.append("degreeCertificates", file);
        });
      }

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
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Role"
                  value={form.jobRole}
                  onChange={(e) => update("jobRole", e.target.value)}
                  required
                >
                  <option value="">Select role</option>
                  {JOB_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Contact Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Email address (personal)"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="Used for OTP login"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Phone number (Whatsapp)<span className="text-danger"> *</span>
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
                      pattern="\d{10}"
                      className="w-full rounded-lg border border-secondary-border bg-secondary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-light"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-accent">Address</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Address line 1"
                    value={form.addressLine1}
                    onChange={(e) => update("addressLine1", e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Address line 2"
                  value={form.addressLine2}
                  onChange={(e) => update("addressLine2", e.target.value)}
                />
                <Input
                  label="Address line 3"
                  value={form.addressLine3}
                  onChange={(e) => update("addressLine3", e.target.value)}
                />
                <Select
                  label="Country"
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="State"
                  value={stateCode}
                  onChange={(e) => handleStateChange(e.target.value)}
                  required
                  disabled={!countryCode}
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="City"
                  value={form.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  required
                  disabled={!stateCode}
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={`${city.name}-${city.latitude}`} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Pincode"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  required
                />
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
                <Select
                  label="Type of Account"
                  value={form.accountType}
                  onChange={(e) => update("accountType", e.target.value)}
                  required
                >
                  <option value="">Select account type</option>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
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
              <h2 className="mb-4 text-lg font-semibold text-accent">Document Uploads</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
                <FileInput
                  label="Resume"
                  onChange={(e) =>
                    setFiles((f) => ({ ...f, resume: e.target.files?.[0] }))
                  }
                />
                <div className="md:col-span-2">
                  <FileInput
                    label="Degree Certificate (multiple allowed)"
                    multiple
                    onChange={(e) =>
                      setFiles((f) => ({
                        ...f,
                        degreeCertificates: e.target.files || undefined,
                      }))
                    }
                  />
                </div>
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
