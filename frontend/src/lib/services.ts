import { api } from "@/lib/api";
import {
  AuthResponse,
  User,
  Employee,
  LeaveRequest,
  LeaveBalance,
  ApplyLeaveData,
} from "@/types";

export const authApi = {
  sendOtp: (email: string) =>
    api.post("/auth/send-otp", { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post<AuthResponse>("/auth/verify-otp", { email, otp }),

  getMe: () => api.get<User>("/auth/me"),
};

export const employeeApi = {
  getAll: () => api.get<Employee[]>("/employees"),

  getById: (id: string) => api.get<Employee>(`/employees/${id}`),

  create: (formData: FormData) =>
    api.post<Employee>("/employees", formData),

  update: (id: string, formData: FormData) =>
    api.put<Employee>(`/employees/${id}`, formData),

  updateLeaveBalance: (id: string, data: { pl: number; cl: number; sl: number }) =>
    api.patch<LeaveBalance>(`/employees/${id}/leave-balance`, data),

  delete: (id: string) => api.delete(`/employees/${id}`),
};

export const leaveApi = {
  apply: (data: ApplyLeaveData) =>
    api.post<LeaveRequest>("/leaves/apply", data),

  getMyRequests: () => api.get<LeaveRequest[]>("/leaves/my"),

  getMyBalance: () => api.get<LeaveBalance>("/leaves/balance"),

  getAll: () => api.get<LeaveRequest[]>("/leaves"),

  updateStatus: (id: string, status: "APPROVED" | "REJECTED", adminNote?: string) =>
    api.patch<LeaveRequest>(`/leaves/${id}/status`, { status, adminNote }),
};
