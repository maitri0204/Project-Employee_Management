export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

export const JOB_ROLES = [
  "B2B Sales",
  "B2B Ops",
  "Education Counselor",
  "Ops",
  "Edu Plan Coach",
  "Ivy Expert",
  "Study Abroad Counselor",
] as const;

export type JobRole = (typeof JOB_ROLES)[number];

export const ACCOUNT_TYPES = [
  { value: "CORPORATE", label: "Corporate" },
  { value: "INDIVIDUAL", label: "Individual" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];
