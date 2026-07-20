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
}): string | null => {
  return (
    validatePanNumber(data.panNumber) ||
    validateAadharNumber(data.aadharNumber) ||
    validateIfscCode(data.ifscCode)
  );
};
