export const DOCUMENT_KEYS = [
  "aadharCard",
  "panCard",
  "cancelledCheque",
  "resume",
  "degreeCertificates",
] as const;

export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

export type DocumentReviewStatus =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type DocumentReviewEntry = {
  status: DocumentReviewStatus;
  rejectedReason?: string | null;
  reviewedAt?: string | null;
};

export type DocumentReviews = Partial<Record<DocumentKey, DocumentReviewEntry>>;

const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  aadharCard: "Aadhar Card",
  panCard: "PAN Card",
  cancelledCheque: "Cancelled Cheque",
  resume: "Resume",
  degreeCertificates: "Degree Certificates",
};

type EmployeeDocFields = {
  aadharCardUrl: string | null;
  panCardUrl: string | null;
  cancelledChequeUrl: string | null;
  resumeUrl: string | null;
  degreeCertificateUrls: string[];
  documentReviews?: unknown;
};

function hasDocument(emp: EmployeeDocFields, key: DocumentKey): boolean {
  switch (key) {
    case "aadharCard":
      return Boolean(emp.aadharCardUrl);
    case "panCard":
      return Boolean(emp.panCardUrl);
    case "cancelledCheque":
      return Boolean(emp.cancelledChequeUrl);
    case "resume":
      return Boolean(emp.resumeUrl);
    case "degreeCertificates":
      return Boolean(emp.degreeCertificateUrls?.length);
    default:
      return false;
  }
}

export function parseDocumentReviews(raw: unknown): DocumentReviews {
  if (!raw || typeof raw !== "object") return {};
  return raw as DocumentReviews;
}

export function getDocumentLabel(key: DocumentKey): string {
  return DOCUMENT_LABELS[key];
}

export function isValidDocumentKey(key: string): key is DocumentKey {
  return (DOCUMENT_KEYS as readonly string[]).includes(key);
}

export function getDocumentReview(
  emp: EmployeeDocFields,
  key: DocumentKey
): DocumentReviewEntry {
  const reviews = parseDocumentReviews(emp.documentReviews);
  const stored = reviews[key];
  if (stored?.status) return stored;

  if (!hasDocument(emp, key)) {
    return { status: "NOT_SUBMITTED" };
  }

  return { status: "PENDING_REVIEW" };
}

export function buildDocumentReviews(emp: EmployeeDocFields): DocumentReviews {
  const existing = parseDocumentReviews(emp.documentReviews);
  const reviews: DocumentReviews = { ...existing };

  for (const key of DOCUMENT_KEYS) {
    if (!hasDocument(emp, key)) {
      const current = reviews[key];
      if (current?.status === "REJECTED") {
        reviews[key] = current;
      } else {
        reviews[key] = { status: "NOT_SUBMITTED", rejectedReason: null };
      }
      continue;
    }

    const current = reviews[key];
    if (!current || current.status === "NOT_SUBMITTED" || current.status === "REJECTED") {
      reviews[key] = {
        status: "PENDING_REVIEW",
        rejectedReason: null,
        reviewedAt: null,
      };
    }
  }

  return reviews;
}

export function computeDocumentsStatus(
  emp: EmployeeDocFields,
  reviews: DocumentReviews
): DocumentReviewStatus {
  const statuses = DOCUMENT_KEYS.map(
    (key) => reviews[key]?.status ?? getDocumentReview(emp, key).status
  );

  if (statuses.every((s) => s === "NOT_SUBMITTED")) return "NOT_SUBMITTED";
  if (statuses.every((s) => s === "APPROVED")) return "APPROVED";
  if (statuses.some((s) => s === "REJECTED")) return "REJECTED";
  if (statuses.some((s) => s === "PENDING_REVIEW")) return "PENDING_REVIEW";
  return "NOT_SUBMITTED";
}

export function clearDocumentUrlFields(key: DocumentKey): Partial<EmployeeDocFields> {
  switch (key) {
    case "aadharCard":
      return { aadharCardUrl: null };
    case "panCard":
      return { panCardUrl: null };
    case "cancelledCheque":
      return { cancelledChequeUrl: null };
    case "resume":
      return { resumeUrl: null };
    case "degreeCertificates":
      return { degreeCertificateUrls: [] };
    default:
      return {};
  }
}

export function computeRejectedReasonSummary(reviews: DocumentReviews): string | null {
  const rejected = DOCUMENT_KEYS.map((key) => {
    const entry = reviews[key];
    if (entry?.status !== "REJECTED" || !entry.rejectedReason) return null;
    return `${DOCUMENT_LABELS[key]}: ${entry.rejectedReason}`;
  }).filter(Boolean);

  return rejected.length ? rejected.join("\n") : null;
}

export function canEmployeeEditDocument(
  emp: EmployeeDocFields & { isProfileLocked: boolean },
  key: DocumentKey
): boolean {
  if (emp.isProfileLocked) return false;
  if (key === "degreeCertificates") return true;
  const review = getDocumentReview(emp, key);
  return review.status !== "APPROVED";
}

export function canEmployeeEditAnyDocument(emp: EmployeeDocFields & { isProfileLocked: boolean }): boolean {
  if (emp.isProfileLocked) return false;
  return DOCUMENT_KEYS.some((key) => canEmployeeEditDocument(emp, key) && hasDocument(emp, key))
    ? DOCUMENT_KEYS.some((key) => canEmployeeEditDocument(emp, key))
    : DOCUMENT_KEYS.some((key) => canEmployeeEditDocument(emp, key));
}
