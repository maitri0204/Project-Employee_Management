import { api } from "@/lib/api";
import {
  AuthResponse,
  User,
  Employee,
  LeaveRequest,
  LeaveBalanceSummary,
  LeavePolicy,
  EmployeeLeaveUsageRow,
  ApplyLeaveData,
  LeaveDayBreakdown,
  HrPolicyDocument,
  CalendarMonthData,
  LeaveOverview,
} from "@/types";

export const authApi = {
  sendOtp: (email: string) => api.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post<AuthResponse>("/auth/verify-otp", { email, otp }),
  getMe: () => api.get<User>("/auth/me"),
};

export const employeeApi = {
  getAll: (enrich = true) =>
    api.get<Employee[]>(`/employees${enrich ? "" : "?enrich=false"}`),
  getById: (id: string) => api.get<Employee>(`/employees/${id}`),
  create: (formData: FormData) => api.post<Employee>("/employees", formData),
  update: (id: string, formData: FormData) => api.put<Employee>(`/employees/${id}`, formData),
  archive: (id: string) => api.patch(`/employees/${id}/archive`, {}),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

export const leavePolicyApi = {
  get: () => api.get<LeavePolicy>("/leave-policy"),
  update: (data: {
    plMonthlyAllowance: number;
    plRepeatMonthly: boolean;
    annualCl: number;
    annualSl: number;
  }) => api.put<LeavePolicy>("/leave-policy", data),
};

export const leaveApi = {
  apply: (data: ApplyLeaveData) => api.post<LeaveRequest>("/leaves/apply", data),
  previewDays: (startDate: string, endDate: string) =>
    api.get<LeaveDayBreakdown>(
      `/leaves/preview-days?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),
  getMyRequests: () => api.get<LeaveRequest[]>("/leaves/my"),
  getMyOverview: (year: number, month: number) =>
    api.get<LeaveOverview>(`/leaves/my-overview?year=${year}&month=${month}`),
  getMyBalance: () => api.get<LeaveBalanceSummary>("/leaves/balance"),
  getUsage: () =>
    api.get<{
      financialYear: string;
      policy: LeavePolicy;
      employees: EmployeeLeaveUsageRow[];
    }>("/leaves/usage"),
  getAll: () => api.get<LeaveRequest[]>("/leaves"),
  updateStatus: (id: string, status: "APPROVED" | "REJECTED", adminNote?: string) =>
    api.patch<LeaveRequest>(`/leaves/${id}/status`, { status, adminNote }),
};

export const hrPolicyApi = {
  list: () => api.get<HrPolicyDocument[]>("/hr-policy"),
  upload: (formData: FormData) => api.post<HrPolicyDocument>("/hr-policy", formData),
  delete: (id: string) => api.delete(`/hr-policy/${id}`),
  viewUrl: (id: string) => `/hr-policy/${id}`,
};

export const calendarApi = {
  getMonth: (year: number, month: number) =>
    api.get<CalendarMonthData>(`/calendar?year=${year}&month=${month}`),
  getHolidays: () => api.get<{ date: string; name: string }[]>("/calendar/holidays"),
};
