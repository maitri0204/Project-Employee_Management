import { Request } from "express";

export type Role = "ADMIN" | "EMPLOYEE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveType = "PL" | "CL" | "SL" | "LWP";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
