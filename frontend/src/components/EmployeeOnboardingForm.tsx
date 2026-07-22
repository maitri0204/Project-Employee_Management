"use client";

import { useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";
import { ACCOUNT_TYPES, GENDER_OPTIONS, JOB_ROLES } from "@/constants/employee";
import { canEmployeeEditDocument, DOCUMENT_HINTS, DOCUMENT_LABELS, getDocumentReview, getDocumentUrls } from "@/lib/employeeProfile";
import {
  mapApiErrorToField,
  validateEmployeeProfileForm,
  validateEmployeeDocumentsForSubmit,
} from "@/lib/validation";
import { DocumentKey, DocumentsStatus, Employee, Gender } from "@/types";
import { Button, Input, Select } from "@/components/ui";
import DocumentUploadRow from "@/components/DocumentUploadRow";

export type OnboardingFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  jobRole: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  phoneNumber: string;
  panNumber: string;
  aadharNumber: string;
  bankAccountNumber: string;
  accountType: string;
  ifscCode: string;
  bankName: string;
  bankBranchName: string;
};

type Props = {
  mode: "employee" | "admin";
  employee?: Employee | null;
  email?: string;
  disabled?: boolean;
  documentsEditable?: boolean;
  documentsStatus?: DocumentsStatus;
  documentsPendingReview?: boolean;
  rejectionReason?: string | null;
  onSubmit: (formData: FormData) => Promise<void>;
};

function parsePhone(phone?: string) {
  if (!phone) return { code: "+91", number: "" };
  const match = phone.match(/^(\+\d{1,4})(\d{10})$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: "+91", number: phone.replace(/\D/g, "").slice(-10) };
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function employeeToFormState(employee?: Employee | null, email?: string): OnboardingFormState {
  const phone = parsePhone(employee?.phone);
  return {
    firstName: employee?.firstName ?? "",
    middleName: employee?.middleName ?? "",
    lastName: employee?.lastName ?? "",
    dateOfBirth: toDateInput(employee?.dateOfBirth),
    gender: (employee?.gender as Gender) || "MALE",
    jobRole: employee?.jobRole ?? "",
    email: email ?? employee?.user?.email ?? "",
    addressLine1: employee?.addressLine1 ?? "",
    addressLine2: employee?.addressLine2 ?? "",
    addressLine3: employee?.addressLine3 ?? "",
    country: employee?.country ?? "",
    state: employee?.state ?? "",
    city: employee?.city ?? "",
    pincode: employee?.pincode ?? "",
    phoneNumber: phone.number,
    panNumber: employee?.panNumber ?? "",
    aadharNumber: employee?.aadharNumber ?? "",
    bankAccountNumber: employee?.bankAccountNumber ?? "",
    accountType: employee?.accountType ?? "",
    ifscCode: employee?.ifscCode ?? "",
    bankName: employee?.bankName ?? "",
    bankBranchName: employee?.bankBranchName ?? "",
  };
}

export default function EmployeeOnboardingForm({
  mode,
  employee,
  email,
  disabled = false,
  documentsEditable = true,
  documentsStatus,
  documentsPendingReview = false,
  rejectionReason,
  onSubmit,
}: Props) {
  const initialPhone = parsePhone(employee?.phone);
  const [form, setForm] = useState<OnboardingFormState>(() =>
    employeeToFormState(employee, email)
  );
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhone.code);
  const [countryCode, setCountryCode] = useState(() => {
    if (!employee?.country) return "";
    return Country.getAllCountries().find((c) => c.name === employee.country)?.isoCode ?? "";
  });
  const [stateCode, setStateCode] = useState(() => {
    if (!employee?.state || !countryCode) return "";
    return State.getStatesOfCountry(countryCode).find((s) => s.name === employee.state)?.isoCode ?? "";
  });
  const [files, setFiles] = useState<{
    aadharCard?: File;
    panCard?: File;
    cancelledCheque?: File;
    resume?: File;
    degreeCertificates?: File[];
  }>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const update = (field: keyof OnboardingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateFile = (
    field: keyof typeof files,
    value: File | File[] | undefined
  ) => {
    setFiles((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setFieldErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    const errors: Record<string, string> = {};

    if (mode === "admin") {
      if (!form.firstName.trim()) errors.firstName = "First name is required.";
      if (!form.lastName.trim()) errors.lastName = "Last name is required.";
      if (!form.jobRole) errors.jobRole = "Please select a role.";
      if (!form.email.trim()) errors.email = "Email is required.";
      if (!form.phoneNumber || form.phoneNumber.length !== 10) {
        errors.phoneNumber = "Please enter a valid 10-digit phone number.";
      }
    }

    Object.assign(errors, validateEmployeeProfileForm(form, countryCode, stateCode));

    if (mode === "employee" || documentsEditable) {
      Object.assign(
        errors,
        validateEmployeeDocumentsForSubmit(
          files,
          {
            aadharCardUrl: employee?.aadharCardUrl,
            panCardUrl: employee?.panCardUrl,
            cancelledChequeUrl: employee?.cancelledChequeUrl,
            resumeUrl: employee?.resumeUrl,
            degreeCertificateUrls: employee?.degreeCertificateUrls,
          },
          employee?.documentReviews
        )
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      if (mode === "admin") {
        formData.append("firstName", form.firstName.trim());
        if (form.middleName.trim()) formData.append("middleName", form.middleName.trim());
        formData.append("lastName", form.lastName.trim());
        formData.append("jobRole", form.jobRole);
        formData.append("email", form.email.trim());
        formData.append("phone", `${phoneCountryCode}${form.phoneNumber}`);
      }

      formData.append("dateOfBirth", form.dateOfBirth);
      formData.append("gender", form.gender);
      formData.append("addressLine1", form.addressLine1);
      if (form.addressLine2) formData.append("addressLine2", form.addressLine2);
      if (form.addressLine3) formData.append("addressLine3", form.addressLine3);
      formData.append("country", form.country);
      formData.append("state", form.state);
      formData.append("city", form.city);
      formData.append("pincode", form.pincode);
      formData.append("panNumber", form.panNumber);
      formData.append("aadharNumber", form.aadharNumber);
      formData.append("bankAccountNumber", form.bankAccountNumber);
      formData.append("accountType", form.accountType);
      formData.append("ifscCode", form.ifscCode);
      formData.append("bankName", form.bankName);
      formData.append("bankBranchName", form.bankBranchName);

      if (mode === "admin" || documentsEditable) {
        if (files.aadharCard && (mode === "admin" || canEmployeeEditDocument(employee, "aadharCard"))) {
          formData.append("aadharCard", files.aadharCard);
        }
        if (files.panCard && (mode === "admin" || canEmployeeEditDocument(employee, "panCard"))) {
          formData.append("panCard", files.panCard);
        }
        if (
          files.cancelledCheque &&
          (mode === "admin" || canEmployeeEditDocument(employee, "cancelledCheque"))
        ) {
          formData.append("cancelledCheque", files.cancelledCheque);
        }
        if (files.resume && (mode === "admin" || canEmployeeEditDocument(employee, "resume"))) {
          formData.append("resume", files.resume);
        }
        if (
          (mode === "admin" || canEmployeeEditDocument(employee, "degreeCertificates")) &&
          files.degreeCertificates?.length
        ) {
          files.degreeCertificates.forEach((file) => formData.append("degreeCertificates", file));
        }
      }

      await onSubmit(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      const mapped = mapApiErrorToField(message);
      if (mapped.submit) setSubmitError(mapped.submit);
      else setFieldErrors(mapped);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBanner = () => {
    if (documentsPendingReview) {
      return (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some of your documents are still under admin review. Approved documents are locked until
          review is complete.
        </div>
      );
    }
    if (documentsStatus === "APPROVED") {
      return (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your documents have been approved and are locked from further changes.
        </div>
      );
    }
    if (documentsStatus === "REJECTED" && rejectionReason) {
      return (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Documents rejected</p>
          <p className="mt-1">{rejectionReason}</p>
          <p className="mt-2">Please update the rejected document/s and save again.</p>
        </div>
      );
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {submitError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}
      {mode === "employee" && statusBanner()}
      {disabled && (
        <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Your profile is locked by admin. Contact HR if you need changes.
        </div>
      )}

      {mode === "admin" && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-blue-700">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              error={fieldErrors.firstName}
              required
              disabled={disabled}
            />
            <Input
              label="Middle Name"
              value={form.middleName}
              onChange={(e) => update("middleName", e.target.value)}
              disabled={disabled}
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              error={fieldErrors.lastName}
              required
              disabled={disabled}
            />
            <Select
              label="Role"
              value={form.jobRole}
              onChange={(e) => update("jobRole", e.target.value)}
              error={fieldErrors.jobRole}
              required
              disabled={disabled}
            >
              <option value="">Select role</option>
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={fieldErrors.email}
              required
              disabled={disabled}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Phone</label>
              <div className="flex gap-2">
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  disabled={disabled}
                  className="w-28 rounded-lg border border-secondary-border bg-secondary px-2 py-2 text-sm"
                >
                  {phoneCodes.map((code) => (
                    <option key={code.isoCode} value={code.value}>
                      {code.value}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    update("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  disabled={disabled}
                  className="w-full rounded-lg border border-secondary-border bg-secondary px-3 py-2 text-sm"
                />
              </div>
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {mode === "employee" && employee && (
        <section className="rounded-xl bg-slate-50 p-4 text-sm">
          <p>
            <span className="font-semibold">Name:</span>{" "}
            {[employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Role:</span> {employee.jobRole || "-"}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Email:</span> {email}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Phone:</span> {employee.phone}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-blue-700">Personal Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            error={fieldErrors.dateOfBirth}
            required
            disabled={disabled}
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
            required
            disabled={disabled}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-blue-700">Address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Address line 1"
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              error={fieldErrors.addressLine1}
              required
              disabled={disabled}
            />
          </div>
          <Input
            label="Address line 2"
            value={form.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            disabled={disabled}
          />
          <Input
            label="Address line 3"
            value={form.addressLine3}
            onChange={(e) => update("addressLine3", e.target.value)}
            disabled={disabled}
          />
          <Select
            label="Country"
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            error={fieldErrors.country}
            required
            disabled={disabled}
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
            error={fieldErrors.state}
            required
            disabled={disabled || !countryCode}
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
            onChange={(e) => update("city", e.target.value)}
            error={fieldErrors.city}
            required
            disabled={disabled || !stateCode}
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
            error={fieldErrors.pincode}
            required
            disabled={disabled}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-blue-700">Identity & Bank Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="PAN Number"
            value={form.panNumber}
            onChange={(e) =>
              update("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
            }
            error={fieldErrors.panNumber}
            required
            disabled={disabled}
          />
          <Input
            label="Aadhar Number"
            value={form.aadharNumber}
            onChange={(e) => update("aadharNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
            error={fieldErrors.aadharNumber}
            required
            disabled={disabled}
          />
          <Input
            label="Bank Account Number"
            value={form.bankAccountNumber}
            onChange={(e) => update("bankAccountNumber", e.target.value)}
            error={fieldErrors.bankAccountNumber}
            required
            disabled={disabled}
          />
          <Select
            label="Type of Account"
            value={form.accountType}
            onChange={(e) => update("accountType", e.target.value)}
            error={fieldErrors.accountType}
            required
            disabled={disabled}
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
            onChange={(e) =>
              update("ifscCode", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))
            }
            error={fieldErrors.ifscCode}
            required
            disabled={disabled}
          />
          <Input
            label="Bank Name"
            value={form.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            error={fieldErrors.bankName}
            required
            disabled={disabled}
          />
          <Input
            label="Bank Branch Name"
            value={form.bankBranchName}
            onChange={(e) => update("bankBranchName", e.target.value)}
            error={fieldErrors.bankBranchName}
            required
            disabled={disabled}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-blue-700">Documents</h2>
        <div className="space-y-3">
          {(["aadharCard", "panCard", "cancelledCheque", "resume"] as const).map((key) => {
            const review = getDocumentReview(employee, key);
            const urls = getDocumentUrls(employee, key);
            const editable = mode === "admin" || canEmployeeEditDocument(employee, key);
            return (
              <DocumentUploadRow
                key={key}
                label={DOCUMENT_LABELS[key]}
                hint={DOCUMENT_HINTS[key]}
                required
                status={review.status}
                rejectedReason={review.rejectedReason}
                fileUrl={urls[0] ?? null}
                selectedFile={files[key]}
                error={fieldErrors[key]}
                editable={editable}
                disabled={disabled}
                employeeView={mode === "employee"}
                onFileSelect={(file) => updateFile(key, file)}
              />
            );
          })}

          {(() => {
            const key: DocumentKey = "degreeCertificates";
            const review = getDocumentReview(employee, key);
            const urls = getDocumentUrls(employee, key);
            const editable = mode === "admin" || canEmployeeEditDocument(employee, key);
            const hasPending = Boolean(files.degreeCertificates?.length);

            return (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Degree Certificates</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Multiple
                  </span>
                </div>
                <p className="text-xs text-slate-500">{DOCUMENT_HINTS.degreeCertificates}</p>

                {review.status === "REJECTED" && review.rejectedReason && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <span className="font-semibold">Rejected:</span> {review.rejectedReason}. Please
                    upload again.
                  </p>
                )}

                {urls.map((url, index) => (
                  <DocumentUploadRow
                    key={`${url}-${index}`}
                    label={`Certificate ${index + 1}`}
                    hint="Uploaded degree certificate"
                    status={review.status}
                    fileUrl={url}
                    editable={editable && review.status !== "APPROVED"}
                    disabled={disabled}
                    employeeView={mode === "employee"}
                  />
                ))}

                {editable && !disabled && review.status !== "APPROVED" && (
                  <DocumentUploadRow
                    label={urls.length ? "Add more certificates" : "Degree Certificates"}
                    hint="Select one or more certificate files"
                    required={!urls.length && !hasPending}
                    status={
                      hasPending
                        ? "PENDING_REVIEW"
                        : urls.length
                          ? review.status
                          : review.status === "REJECTED"
                            ? "REJECTED"
                            : "NOT_SUBMITTED"
                    }
                    selectedFile={files.degreeCertificates?.[0]}
                    error={fieldErrors.degreeCertificates}
                    editable
                    disabled={disabled}
                    employeeView={mode === "employee"}
                    multiple
                    onFilesSelect={(selected) => updateFile("degreeCertificates", selected)}
                  />
                )}

                {hasPending && files.degreeCertificates && files.degreeCertificates.length > 0 && (
                  <div className="space-y-1">
                    {files.degreeCertificates.map((file) => (
                      <p key={`${file.name}-${file.size}`} className="text-xs text-blue-700">
                        Selected: {file.name}
                      </p>
                    ))}
                  </div>
                )}

                {review.status === "APPROVED" && urls.length > 0 && (
                  <p className="text-xs font-medium text-emerald-700">Approved - cannot be changed</p>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {!disabled && (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "employee" ? "Save & Submit for Review" : "Save Changes"}
        </Button>
      )}
    </form>
  );
}
