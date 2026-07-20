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

export const ACCOUNT_TYPES = ["CORPORATE", "INDIVIDUAL"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
