export type Role = "ADMIN" | "EMPLOYEE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveType = "PL" | "CL" | "SL" | "LWP";

export type LeaveBreakdown = Record<LeaveType, number>;
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type { JobRole, AccountType } from "@/constants/employee";

export interface LeavePolicy {
  id: string;
  plMonthlyAllowance: number;
  plRepeatMonthly: boolean;
  annualCl: number;
  annualSl: number;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  pl: number;
  cl: number;
  sl: number;
  lwpUsed?: number;
  lastPlAccrualPeriod?: string | null;
  lastClSlCreditFY?: string | null;
  updatedAt: string;
}

export interface LeaveUsageBreakdown {
  PL: number;
  CL: number;
  SL: number;
  LWP: number;
}

export interface LeaveTotalsBreakdown {
  PL: number;
  CL: number;
  SL: number;
}

export interface ClHalfYearInfo {
  available: number;
  annualCl: number;
  firstHalfMax: number;
  secondHalfMax: number;
  h1Used: number;
  h2Used: number;
  carriedFromH1: number;
  currentHalf: "H1" | "H2";
  totalUsed: number;
  annualRemaining: number;
}

export interface LeaveBalanceSummary extends LeaveBalance {
  joiningDate?: string;
  financialYear?: string;
  usage?: LeaveUsageBreakdown;
  totals?: LeaveTotalsBreakdown;
  available?: { pl: number; cl: number; sl: number };
  lwpTaken?: number;
  plTotal?: number;
  clTotal?: number;
  slTotal?: number;
  clUsableThisHalf?: number;
  clHalfYear?: ClHalfYearInfo;
  policy?: Pick<LeavePolicy, "plMonthlyAllowance" | "annualCl" | "annualSl">;
}

export interface EmployeeLeaveUsageRow {
  employee: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    joiningDate: string;
    user?: { email: string };
  } | null;
  balance: { pl: number; cl: number; sl: number; lwpUsed: number };
  usage: LeaveUsageBreakdown;
  totals?: LeaveTotalsBreakdown;
  available: { pl: number; cl: number; sl: number };
  plTotal?: number;
  clTotal?: number;
  slTotal?: number;
  clUsableThisHalf?: number;
  lwpTaken: number;
}

export interface HrPolicyDocument {
  id: string;
  displayName: string;
  mimeType: string;
  createdAt: string;
}

export type DocumentsStatus =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type DocumentKey =
  | "aadharCard"
  | "panCard"
  | "cancelledCheque"
  | "resume"
  | "degreeCertificates";

export type DocumentReviewEntry = {
  status: DocumentsStatus;
  rejectedReason?: string | null;
  reviewedAt?: string | null;
};

export type DocumentReviews = Partial<Record<DocumentKey, DocumentReviewEntry>>;

export interface CalendarLeaveEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  jobRole?: string | null;
  days?: number | null;
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface CalendarDayInfo {
  date: string;
  isSunday: boolean;
  isSecondSaturday: boolean;
  isCompanyHoliday: boolean;
  holidayName?: string;
  isNonWorking: boolean;
  leaves: CalendarLeaveEntry[];
}

export interface CalendarMonthData {
  year: number;
  month: number;
  days: CalendarDayInfo[];
  holidays: { date: string; name: string }[];
}

export interface LeaveOverview {
  balance: LeaveBalanceSummary;
  requests: LeaveRequest[];
  calendar: CalendarMonthData;
}

export interface LeaveDayBreakdown {
  totalDays: number;
  workingDays: number;
  sandwichDays: number;
}

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  jobRole?: string | null;
  joiningDate?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone: string;
  panNumber?: string | null;
  aadharNumber?: string | null;
  bankAccountNumber?: string | null;
  accountType?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  bankBranchName?: string | null;
  aadharCardUrl?: string | null;
  panCardUrl?: string | null;
  cancelledChequeUrl?: string | null;
  degreeCertificateUrls?: string[];
  resumeUrl?: string | null;
  isArchived?: boolean;
  isProfileLocked?: boolean;
  documentsStatus?: DocumentsStatus;
  documentsRejectedReason?: string | null;
  documentReviews?: DocumentReviews | null;
  createdAt: string;
  updatedAt: string;
  leaveUsage?: LeaveUsageBreakdown;
  leaveTotals?: LeaveTotalsBreakdown;
  plTotal?: number;
  clTotal?: number;
  slTotal?: number;
  clUsableThisHalf?: number;
  lwpTaken?: number;
  user?: {
    id: string;
    email: string;
    role: Role;
  };
  leaveBalance?: LeaveBalance | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  leaveBreakdown?: LeaveBreakdown | null;
  startDate: string;
  endDate: string;
  reason: string;
  days?: number | null;
  sandwichDays?: number;
  status: LeaveStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: Pick<Employee, "id" | "firstName" | "middleName" | "lastName"> & {
    user?: { email: string };
  };
}

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  employee?: Employee | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApplyLeaveData {
  startDate: string;
  endDate: string;
  reason: string;
  leaveBreakdown: LeaveBreakdown;
}

export type DailyTaskStatus = "PLANNED" | "COMPLETED";

export interface DailyTask {
  id: string;
  employeeId: string;
  taskDate: string;
  title: string;
  description?: string | null;
  status: DailyTaskStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: Pick<Employee, "id" | "firstName" | "middleName" | "lastName" | "jobRole"> & {
    user?: { email: string };
  };
}

export interface DailyTaskSummary {
  date: string;
  employees: {
    employeeId: string;
    employeeName: string;
    jobRole?: string | null;
    email?: string;
    planned: number;
    completed: number;
    total: number;
  }[];
  totals: {
    employees: number;
    tasks: number;
    completed: number;
    planned: number;
  };
}
