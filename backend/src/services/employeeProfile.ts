type EmployeeProfileFields = {
  dateOfBirth: Date | null;
  gender: string | null;
  addressLine1: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  panNumber: string | null;
  aadharNumber: string | null;
  bankAccountNumber: string | null;
  accountType: string | null;
  ifscCode: string | null;
  bankName: string | null;
  bankBranchName: string | null;
  aadharCardUrl: string | null;
  panCardUrl: string | null;
  cancelledChequeUrl: string | null;
  resumeUrl: string | null;
  degreeCertificateUrls: string[];
};

export function isEmployeeProfileComplete(emp: EmployeeProfileFields): boolean {
  return Boolean(
    emp.dateOfBirth &&
      emp.gender &&
      emp.addressLine1 &&
      emp.country &&
      emp.state &&
      emp.city &&
      emp.pincode &&
      emp.panNumber &&
      emp.aadharNumber &&
      emp.bankAccountNumber &&
      emp.accountType &&
      emp.ifscCode &&
      emp.bankName &&
      emp.bankBranchName &&
      emp.aadharCardUrl &&
      emp.panCardUrl &&
      emp.cancelledChequeUrl &&
      emp.resumeUrl &&
      emp.degreeCertificateUrls?.length
  );
}

export function canEmployeeEditProfile(emp: { isProfileLocked: boolean }): boolean {
  return !emp.isProfileLocked;
}

export function canEmployeeEditDocuments(emp: {
  isProfileLocked: boolean;
  documentsStatus: string;
}): boolean {
  if (emp.isProfileLocked) return false;
  return emp.documentsStatus !== "APPROVED";
}
