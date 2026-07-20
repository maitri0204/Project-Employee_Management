export type Role = "ADMIN" | "EMPLOYEE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveType = "PL" | "CL" | "SL";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type { JobRole, AccountType } from "@/constants/employee";

export interface LeaveBalance {
  id: string;
  employeeId: string;
  pl: number;
  cl: number;
  sl: number;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  jobRole: string;
  addressLine1: string;
  addressLine2?: string | null;
  addressLine3?: string | null;
  country: string;
  state: string;
  city: string;
  pincode: string;
  phone: string;
  panNumber: string;
  aadharNumber: string;
  bankAccountNumber: string;
  accountType: string;
  ifscCode: string;
  bankName: string;
  bankBranchName: string;
  aadharCardUrl?: string | null;
  panCardUrl?: string | null;
  cancelledChequeUrl?: string | null;
  degreeCertificateUrls: string[];
  resumeUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
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
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}
