import type { DocumentReviews } from "@/types";

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const AADHAR_REGEX = /^[0-9]{12}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const validatePanNumber = (value: string): string | null => {
  const pan = value.trim().toUpperCase();
  if (!PAN_REGEX.test(pan)) {
    return "PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter).";
  }
  return null;
};

export const validateAadharNumber = (value: string): string | null => {
  const aadhar = value.replace(/\s/g, "");
  if (!AADHAR_REGEX.test(aadhar)) {
    return "Aadhar number must be exactly 12 digits.";
  }
  return null;
};

export const validateIfscCode = (value: string): string | null => {
  const ifsc = value.trim().toUpperCase();
  if (!IFSC_REGEX.test(ifsc)) {
    return "IFSC must be 11 characters in format ABCD0123456 (4 letters, 0, 6 alphanumeric).";
  }
  return null;
};

export const validateIdentityFields = (data: {
  panNumber: string;
  aadharNumber: string;
  ifscCode: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  const panError = validatePanNumber(data.panNumber);
  const aadharError = validateAadharNumber(data.aadharNumber);
  const ifscError = validateIfscCode(data.ifscCode);
  if (panError) errors.panNumber = panError;
  if (aadharError) errors.aadharNumber = aadharError;
  if (ifscError) errors.ifscCode = ifscError;
  return errors;
};

export type EmployeeFormData = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  jobRole: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  panNumber: string;
  aadharNumber: string;
  bankAccountNumber: string;
  accountType: string;
  ifscCode: string;
  bankName: string;
  bankBranchName: string;
};

export const validateEmployeeForm = (
  form: EmployeeFormData,
  countryCode: string,
  stateCode: string
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  if (!form.jobRole) errors.jobRole = "Please select a role.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!form.phoneNumber) {
    errors.phoneNumber = "Phone number is required.";
  } else if (!/^\d{10}$/.test(form.phoneNumber)) {
    errors.phoneNumber = "Phone number must be exactly 10 digits.";
  }
  if (!form.addressLine1.trim()) errors.addressLine1 = "Address line 1 is required.";
  if (!countryCode) errors.country = "Please select a country.";
  if (!stateCode) errors.state = "Please select a state.";
  if (!form.city) errors.city = "Please select a city.";
  if (!form.pincode.trim()) errors.pincode = "Pincode is required.";
  if (!form.bankAccountNumber.trim()) {
    errors.bankAccountNumber = "Bank account number is required.";
  }
  if (!form.accountType) errors.accountType = "Please select account type.";
  if (!form.bankName.trim()) errors.bankName = "Bank name is required.";
  if (!form.bankBranchName.trim()) errors.bankBranchName = "Bank branch name is required.";

  Object.assign(errors, validateIdentityFields(form));

  return errors;
};

export const validateEmployeeProfileForm = (
  form: Pick<
    EmployeeFormData,
    | "dateOfBirth"
    | "addressLine1"
    | "country"
    | "state"
    | "city"
    | "pincode"
    | "panNumber"
    | "aadharNumber"
    | "bankAccountNumber"
    | "accountType"
    | "ifscCode"
    | "bankName"
    | "bankBranchName"
  >,
  countryCode: string,
  stateCode: string
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  if (!form.addressLine1.trim()) errors.addressLine1 = "Address line 1 is required.";
  if (!countryCode) errors.country = "Please select a country.";
  if (!stateCode) errors.state = "Please select a state.";
  if (!form.city) errors.city = "Please select a city.";
  if (!form.pincode.trim()) errors.pincode = "Pincode is required.";
  if (!form.bankAccountNumber.trim()) {
    errors.bankAccountNumber = "Bank account number is required.";
  }
  if (!form.accountType) errors.accountType = "Please select account type.";
  if (!form.bankName.trim()) errors.bankName = "Bank name is required.";
  if (!form.bankBranchName.trim()) errors.bankBranchName = "Bank branch name is required.";

  Object.assign(errors, validateIdentityFields(form));

  return errors;
};

export const validateEmployeeDocumentsForSubmit = (
  files: EmployeeFormFiles,
  existing: {
    aadharCardUrl?: string | null;
    panCardUrl?: string | null;
    cancelledChequeUrl?: string | null;
    resumeUrl?: string | null;
    degreeCertificateUrls?: string[];
  },
  documentReviews?: DocumentReviews | null
): Record<string, string> => {
  const isRejected = (docKey: string) =>
    documentReviews?.[docKey as keyof DocumentReviews]?.status === "REJECTED";

  const errors: Record<string, string> = {};
  if (!files.aadharCard && (!existing.aadharCardUrl || isRejected("aadharCard"))) {
    errors.aadharCard = "Aadhar card is required.";
  }
  if (!files.panCard && (!existing.panCardUrl || isRejected("panCard"))) {
    errors.panCard = "PAN card is required.";
  }
  if (!files.cancelledCheque && (!existing.cancelledChequeUrl || isRejected("cancelledCheque"))) {
    errors.cancelledCheque = "Cancelled cheque is required.";
  }
  if (!files.resume && (!existing.resumeUrl || isRejected("resume"))) {
    errors.resume = "Resume is required.";
  }
  if (
    (!files.degreeCertificates || files.degreeCertificates.length === 0) &&
    (!existing.degreeCertificateUrls?.length || isRejected("degreeCertificates"))
  ) {
    errors.degreeCertificates = "At least one degree certificate is required.";
  }
  return errors;
};

export const mapApiErrorToField = (message: string): Record<string, string> => {
  const lower = message.toLowerCase();
  if (lower.includes("email")) return { email: message };
  if (lower.includes("pan card")) return { panCard: message };
  if (lower.includes("pan")) return { panNumber: message };
  if (lower.includes("aadhar card")) return { aadharCard: message };
  if (lower.includes("aadhar")) return { aadharNumber: message };
  if (lower.includes("cancelled cheque")) return { cancelledCheque: message };
  if (lower.includes("resume")) return { resume: message };
  if (lower.includes("degree certificate")) return { degreeCertificates: message };
  if (lower.includes("phone")) return { phoneNumber: message };
  return { submit: message };
};

export type EmployeeFormFiles = {
  aadharCard?: File;
  panCard?: File;
  cancelledCheque?: File;
  resume?: File;
  degreeCertificates?: File[];
};

export const validateEmployeeDocuments = (
  files: EmployeeFormFiles
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!files.aadharCard) errors.aadharCard = "Aadhar card is required.";
  if (!files.panCard) errors.panCard = "PAN card is required.";
  if (!files.cancelledCheque) errors.cancelledCheque = "Cancelled cheque is required.";
  if (!files.resume) errors.resume = "Resume is required.";
  if (!files.degreeCertificates || files.degreeCertificates.length === 0) {
    errors.degreeCertificates = "At least one degree certificate is required.";
  }
  return errors;
};
