import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";
import { sendError, sendSuccess } from "../utils/response";
import { isAdminRole } from "../utils/roles";
import {
  formatEmployeeName,
  getAllTasksForDate,
  getEmployeeTasksForDate,
  isValidTaskPriority,
  parseTaskDateInput,
  serializeDailyTask,
} from "../services/dailyTask.service";
import { dateKey } from "../services/leaveCalendar";

async function getEmployeeForUser(userId: string) {
  return prisma.employee.findUnique({ where: { userId } });
}

export const createDailyTask = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const { title, description, taskDate } = req.body;

    if (!title?.trim()) {
      return sendError(res, "Task title is required.");
    }

    const employee = await getEmployeeForUser(userId);
    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const date = parseTaskDateInput(taskDate);
    const task = await prisma.dailyTask.create({
      data: {
        employeeId: employee.id,
        taskDate: date,
        title: title.trim(),
        description: description?.trim() || null,
        status: "PLANNED",
      },
      include: {
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
      },
    });

    return sendSuccess(res, "Task added successfully.", serializeDailyTask(task), 201);
  } catch (error) {
    console.error("Create daily task error:", error);
    if (error instanceof Error && error.message.includes("Unknown argument")) {
      return sendError(
        res,
        "Task creation is temporarily unavailable. Please restart the backend server and try again.",
        500
      );
    }
    return sendError(res, "Failed to create task.", 500);
  }
};

export const assignDailyTask = async (req: Request, res: Response) => {
  try {
    const { employeeId, title, description, taskDate, priority } = req.body;

    if (!employeeId?.trim()) {
      return sendError(res, "Please select an employee.");
    }

    if (!title?.trim()) {
      return sendError(res, "Task title is required.");
    }

    if (!isValidTaskPriority(priority)) {
      return sendError(res, "Please select a valid task priority level.");
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId.trim(),
        isArchived: false,
        user: { role: "EMPLOYEE" },
      },
      select: { id: true },
    });

    if (!employee) {
      return sendError(res, "Employee not found.", 404);
    }

    const date = parseTaskDateInput(taskDate);
    const task = await prisma.dailyTask.create({
      data: {
        employeeId: employee.id,
        taskDate: date,
        title: title.trim(),
        description: description?.trim() || null,
        status: "PLANNED",
        assignedByAdmin: true,
        priority,
      },
      include: {
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
      },
    });

    return sendSuccess(res, "Task assigned successfully.", serializeDailyTask(task), 201);
  } catch (error) {
    console.error("Assign daily task error:", error);
    return sendError(res, "Failed to assign task.", 500);
  }
};

export const getMyDailyTasks = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const taskDate = parseTaskDateInput(dateParam);

    const employee = await getEmployeeForUser(userId);
    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const tasks = await getEmployeeTasksForDate(employee.id, taskDate);
    return sendSuccess(
      res,
      "Tasks fetched successfully.",
      tasks.map(serializeDailyTask)
    );
  } catch (error) {
    console.error("Get my daily tasks error:", error);
    return sendError(res, "Failed to fetch tasks.", 500);
  }
};

export const updateDailyTask = async (req: Request, res: Response) => {
  try {
    const { userId, role } = (req as AuthRequest).user!;
    const id = req.params.id as string;
    const { title, description, status } = req.body;

    const task = await prisma.dailyTask.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!task) {
      return sendError(res, "Task not found.", 404);
    }

    if (!isAdminRole(role)) {
      const employee = await getEmployeeForUser(userId);
      if (!employee || employee.id !== task.employeeId) {
        return sendError(res, "You can only update your own tasks.", 403);
      }
    }

    const data: {
      title?: string;
      description?: string | null;
      status?: string;
      completedAt?: Date | null;
    } = {};

    if (title !== undefined) {
      if (!title?.trim()) return sendError(res, "Task title cannot be empty.");
      data.title = title.trim();
    }

    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    if (status !== undefined) {
      if (!["PLANNED", "COMPLETED"].includes(status)) {
        return sendError(res, "Invalid task status.");
      }
      data.status = status;
      data.completedAt = status === "COMPLETED" ? new Date() : null;
    }

    if (!Object.keys(data).length) {
      return sendError(res, "No changes provided.");
    }

    const updated = await prisma.dailyTask.update({
      where: { id },
      data,
      include: {
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
      },
    });

    return sendSuccess(res, "Task updated successfully.", serializeDailyTask(updated));
  } catch (error) {
    console.error("Update daily task error:", error);
    return sendError(res, "Failed to update task.", 500);
  }
};

export const deleteDailyTask = async (req: Request, res: Response) => {
  try {
    const { role } = (req as AuthRequest).user!;
    const id = req.params.id as string;

    if (!isAdminRole(role)) {
      return sendError(res, "Only admins can delete tasks.", 403);
    }

    const task = await prisma.dailyTask.findUnique({ where: { id } });
    if (!task) {
      return sendError(res, "Task not found.", 404);
    }

    await prisma.dailyTask.delete({ where: { id } });
    return sendSuccess(res, "Task deleted successfully.");
  } catch (error) {
    console.error("Delete daily task error:", error);
    return sendError(res, "Failed to delete task.", 500);
  }
};

export const getAllDailyTasks = async (req: Request, res: Response) => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const employeeId = typeof req.query.employeeId === "string" ? req.query.employeeId : undefined;
    const jobRole = typeof req.query.jobRole === "string" ? req.query.jobRole : undefined;
    const taskDate = parseTaskDateInput(dateParam);

    const tasks = await getAllTasksForDate(taskDate, { employeeId, jobRole });
    return sendSuccess(
      res,
      "Tasks fetched successfully.",
      tasks.map(serializeDailyTask)
    );
  } catch (error) {
    console.error("Get all daily tasks error:", error);
    return sendError(res, "Failed to fetch tasks.", 500);
  }
};

export const getDailyTaskSummary = async (req: Request, res: Response) => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const jobRole = typeof req.query.jobRole === "string" ? req.query.jobRole : undefined;
    const taskDate = parseTaskDateInput(dateParam);
    const tasks = await getAllTasksForDate(taskDate, { jobRole });

    const byEmployee = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        jobRole?: string | null;
        email?: string;
        planned: number;
        completed: number;
        total: number;
      }
    >();

    for (const task of tasks) {
      const key = task.employeeId;
      const existing = byEmployee.get(key) ?? {
        employeeId: key,
        employeeName: formatEmployeeName(task.employee),
        jobRole: task.employee.jobRole,
        email: task.employee.user?.email,
        planned: 0,
        completed: 0,
        total: 0,
      };

      existing.total += 1;
      if (task.status === "COMPLETED") existing.completed += 1;
      else existing.planned += 1;

      byEmployee.set(key, existing);
    }

    return sendSuccess(res, "Task summary fetched successfully.", {
      date: dateKey(taskDate),
      employees: Array.from(byEmployee.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      ),
      totals: {
        employees: byEmployee.size,
        tasks: tasks.length,
        completed: tasks.filter((t) => t.status === "COMPLETED").length,
        planned: tasks.filter((t) => t.status === "PLANNED").length,
      },
    });
  } catch (error) {
    console.error("Get daily task summary error:", error);
    return sendError(res, "Failed to fetch task summary.", 500);
  }
};
