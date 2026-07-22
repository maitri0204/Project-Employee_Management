import {
  DocumentKey,
  DocumentReviewEntry,
  DocumentReviews,
  DocumentsStatus,
  Employee,
} from "@/types";

function parseDocumentReviews(raw: unknown): DocumentReviews {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as DocumentReviews) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as DocumentReviews;
  return {};
}

export const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  aadharCard: "Aadhar Card",
  panCard: "PAN Card",
  cancelledCheque: "Cancelled Cheque",
  resume: "Resume",
  degreeCertificates: "Degree Certificates",
};

export const DOCUMENT_ITEMS: { key: DocumentKey; urlField: keyof Employee }[] = [
  { key: "aadharCard", urlField: "aadharCardUrl" },
  { key: "panCard", urlField: "panCardUrl" },
  { key: "cancelledCheque", urlField: "cancelledChequeUrl" },
  { key: "resume", urlField: "resumeUrl" },
  { key: "degreeCertificates", urlField: "degreeCertificateUrls" },
];

export const DOCUMENT_HINTS: Record<DocumentKey, string> = {
  aadharCard: "Upload a clear copy of your Aadhar card (JPEG, PNG, or PDF)",
  panCard: "Upload your PAN card (JPEG, PNG, or PDF)",
  cancelledCheque: "Upload a cancelled cheque for bank verification",
  resume: "Upload your latest resume",
  degreeCertificates: "Upload degree certificates - multiple files allowed",
};

/** Reads stored file URLs only - no review-status logic. */
export function getRawDocumentUrls(
  employee: Employee | null | undefined,
  key: DocumentKey
): string[] {
  if (!employee) return [];

  switch (key) {
    case "aadharCard":
      return employee.aadharCardUrl ? [employee.aadharCardUrl] : [];
    case "panCard":
      return employee.panCardUrl ? [employee.panCardUrl] : [];
    case "cancelledCheque":
      return employee.cancelledChequeUrl ? [employee.cancelledChequeUrl] : [];
    case "resume":
      return employee.resumeUrl ? [employee.resumeUrl] : [];
    case "degreeCertificates":
      return employee.degreeCertificateUrls ?? [];
    default:
      return [];
  }
}

/** URLs visible to the user - hides files that were rejected/discarded. */
export function getDocumentUrls(
  employee: Employee | null | undefined,
  key: DocumentKey
): string[] {
  if (!employee) return [];

  const reviews = parseDocumentReviews(employee.documentReviews);
  if (reviews[key]?.status === "REJECTED") return [];

  return getRawDocumentUrls(employee, key);
}

export function getDocumentReview(
  employee: Employee | null | undefined,
  key: DocumentKey
): DocumentReviewEntry {
  const reviews = parseDocumentReviews(employee?.documentReviews);
  const stored = reviews[key];
  if (stored?.status) return stored;

  if (!employee || !getRawDocumentUrls(employee, key).length) {
    return { status: "NOT_SUBMITTED" };
  }

  return { status: "PENDING_REVIEW" };
}

export function hasPendingDocumentReviews(employee?: Employee | null): boolean {
  if (!employee) return false;
  return DOCUMENT_ITEMS.some(
    ({ key }) => getDocumentReview(employee, key).status === "PENDING_REVIEW"
  );
}

export function getDocumentsStatus(employee?: Employee | null): DocumentsStatus {
  if (!employee) return "NOT_SUBMITTED";
  if (employee.documentsStatus) return employee.documentsStatus;

  const statuses = DOCUMENT_ITEMS.map(({ key }) => getDocumentReview(employee, key).status).filter(
    (s) => s !== "NOT_SUBMITTED"
  );

  if (!statuses.length) return "NOT_SUBMITTED";
  if (statuses.every((s) => s === "APPROVED")) return "APPROVED";
  if (statuses.some((s) => s === "REJECTED")) return "REJECTED";
  if (statuses.some((s) => s === "PENDING_REVIEW")) return "PENDING_REVIEW";
  return "NOT_SUBMITTED";
}

export function canEmployeeEditDocument(
  employee: Employee | null | undefined,
  key: DocumentKey
): boolean {
  if (!employee || employee.isProfileLocked) return false;
  return getDocumentReview(employee, key).status !== "APPROVED";
}

export function canEmployeeEditDocuments(employee?: Employee | null): boolean {
  if (!employee || employee.isProfileLocked) return false;
  return DOCUMENT_ITEMS.some(({ key }) => canEmployeeEditDocument(employee, key));
}

export function canEmployeeEditProfile(employee?: Employee | null): boolean {
  return !employee?.isProfileLocked;
}
