import { api, fetchWithAuth } from "@/lib/api";
import {
  AuthResponse,
  User,
  Employee,
  DocumentKey,
  LeaveRequest,
  LeaveBalanceSummary,
  LeavePolicy,
  EmployeeLeaveUsageRow,
  ApplyLeaveData,
  LeaveDayBreakdown,
  HrPolicyDocument,
  CalendarMonthData,
  LeaveOverview,
  DailyTask,
  DailyTaskSummary,
  DailyTaskStatus,
  DailyTaskPriority,
  HolidayImportResult,
  ManagedHoliday,
} from "@/types";

export const authApi = {
  sendOtp: (email: string) => api.post("/auth/send-otp", { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post<AuthResponse>("/auth/verify-otp", { email, otp }),
  getMe: () => api.get<User>("/auth/me"),
};

export type CreateEmployeePayload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  jobRole: string;
  email: string;
  phone: string;
};

export const employeeApi = {
  getAll: (enrich = true) =>
    api.get<Employee[]>(`/employees${enrich ? "" : "?enrich=false"}`),
  getArchived: (enrich = true) =>
    api.get<Employee[]>(`/employees/archived${enrich ? "" : "?enrich=false"}`),
  getById: (id: string) => api.get<Employee>(`/employees/${id}`),
  create: (data: CreateEmployeePayload) => api.post<Employee>("/employees", data),
  update: (id: string, formData: FormData) => api.put<Employee>(`/employees/${id}`, formData),
  updateMyProfile: (formData: FormData) => api.patch<Employee>("/employees/me", formData),
  approveDocument: (id: string, documentKey: DocumentKey) =>
    api.patch<Employee>(`/employees/${id}/documents/${documentKey}/approve`, {}),
  rejectDocument: (id: string, documentKey: DocumentKey, reason: string) =>
    api.patch<Employee>(`/employees/${id}/documents/${documentKey}/reject`, { reason }),
  toggleLock: (id: string, locked: boolean) =>
    api.patch<Employee>(`/employees/${id}/lock`, { locked }),
  archive: (id: string) => api.patch(`/employees/${id}/archive`, {}),
  unarchive: (id: string) => api.patch<Employee>(`/employees/${id}/unarchive`, {}),
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
  apply: (data: ApplyLeaveData) => {
    if (data.medicalCertificate) {
      const formData = new FormData();
      formData.append("startDate", data.startDate);
      formData.append("endDate", data.endDate);
      formData.append("reason", data.reason);
      formData.append("leaveBreakdown", JSON.stringify(data.leaveBreakdown));
      formData.append("medicalCertificate", data.medicalCertificate);
      return api.post<LeaveRequest>("/leaves/apply", formData);
    }
    return api.post<LeaveRequest>("/leaves/apply", data);
  },
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
  getHolidays: () => api.get<{ date: string; name: string }[]>("/holidays"),
};

export const holidayApi = {
  getManaged: () => api.get<ManagedHoliday[]>("/holidays/manage"),
  create: (date: string, description: string) =>
    api.post<ManagedHoliday>("/holidays", { date, description }),
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<HolidayImportResult>("/holidays/upload", formData);
  },
  delete: (id: string) => api.delete(`/holidays/${id}`),
  downloadSampleTemplate: async () => {
    const response = await fetchWithAuth("/holidays/sample-template");
    if (!response.ok) {
      let message = "Failed to download sample file.";
      try {
        const data = (await response.json()) as { message?: string };
        if (data.message) message = data.message;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "holiday-import-sample.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const dailyTaskApi = {
  create: (data: { title: string; description?: string; taskDate?: string }) =>
    api.post<DailyTask>("/daily-tasks", data),
  assign: (data: {
    employeeId: string;
    title: string;
    description?: string;
    taskDate?: string;
    priority: DailyTaskPriority;
  }) => api.post<DailyTask>("/daily-tasks/assign", data),
  getMy: (date: string) =>
    api.get<DailyTask[]>(`/daily-tasks/my?date=${encodeURIComponent(date)}`),
  update: (
    id: string,
    data: Partial<{ title: string; description: string; status: DailyTaskStatus }>
  ) => api.patch<DailyTask>(`/daily-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/daily-tasks/${id}`),
  getAll: (date: string, jobRole?: string, employeeId?: string) => {
    const params = new URLSearchParams({ date });
    if (jobRole) params.set("jobRole", jobRole);
    if (employeeId) params.set("employeeId", employeeId);
    return api.get<DailyTask[]>(`/daily-tasks?${params.toString()}`);
  },
  getSummary: (date: string, jobRole?: string) => {
    const params = new URLSearchParams({ date });
    if (jobRole) params.set("jobRole", jobRole);
    return api.get<DailyTaskSummary>(`/daily-tasks/summary?${params.toString()}`);
  },
};
