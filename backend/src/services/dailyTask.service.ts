import prisma from "../config/database";
import { dateKey, parseDateOnly } from "./leaveCalendar";

export type DailyTaskStatus = "PLANNED" | "COMPLETED";

export const DAILY_TASK_PRIORITIES = [
  "URGENT",
  "IMPORTANT",
  "URGENT_AND_IMPORTANT",
  "IMPORTANT_NOT_URGENT",
] as const;

export type DailyTaskPriority = (typeof DAILY_TASK_PRIORITIES)[number];

export function isValidTaskPriority(value: unknown): value is DailyTaskPriority {
  return typeof value === "string" && (DAILY_TASK_PRIORITIES as readonly string[]).includes(value);
}

export function parseTaskDateInput(value?: string): Date {
  if (!value?.trim()) {
    return parseDateOnly(new Date());
  }
  return parseDateOnly(value.trim());
}

export function getTaskDateRange(taskDate: Date) {
  const start = parseDateOnly(taskDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function formatEmployeeName(employee: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
}

const taskInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      jobRole: true,
      user: { select: { email: true } },
    },
  },
} as const;

export async function getEmployeeTasksForDate(employeeId: string, taskDate: Date) {
  const { start, end } = getTaskDateRange(taskDate);
  return prisma.dailyTask.findMany({
    where: {
      employeeId,
      taskDate: { gte: start, lt: end },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: taskInclude,
  });
}

export async function getAllTasksForDate(
  taskDate: Date,
  filters?: { employeeId?: string; jobRole?: string }
) {
  const { start, end } = getTaskDateRange(taskDate);
  return prisma.dailyTask.findMany({
    where: {
      taskDate: { gte: start, lt: end },
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      employee: {
        isArchived: false,
        user: { role: "EMPLOYEE" },
        ...(filters?.jobRole ? { jobRole: filters.jobRole } : {}),
      },
    },
    orderBy: [{ employee: { firstName: "asc" } }, { status: "asc" }, { createdAt: "asc" }],
    include: taskInclude,
  });
}

export function serializeDailyTask<T extends { taskDate: Date; completedAt?: Date | null }>(task: T) {
  return {
    ...task,
    taskDate: dateKey(task.taskDate),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}
