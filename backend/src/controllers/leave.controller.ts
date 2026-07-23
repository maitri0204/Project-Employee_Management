import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";
import { sendError, sendSuccess } from "../utils/response";
import { calculateLeaveDays } from "../services/leaveCalculation";
import { getFinancialYear, parseDateOnly } from "../services/leaveCalendar";
import { getLeavePolicy } from "../services/leavePolicy";
import { refreshEmployeeLeaveBalances } from "../services/leaveSync";
import {
  getAllEmployeesLeaveUsage,
  getEmployeeLeaveSummary,
} from "../services/leaveUsage";
import { getCalendarForMonth } from "../services/calendar.service";
import {
  parseLeaveBreakdownInput,
  resolveLeaveTypeLabel,
  getRequestBreakdown,
} from "../services/leaveBreakdown";
import {
  validateLeaveBreakdownApplication,
  validateLeaveBreakdownApproval,
  deductApprovedLeaveBreakdown,
} from "../services/leaveApplication";
import { leaveNotificationHub } from "../services/leaveNotificationHub";

export const previewLeaveDays = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate || typeof startDate !== "string" || typeof endDate !== "string") {
      return sendError(res, "Please provide startDate and endDate.");
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (start > end) {
      return sendError(res, "Start date cannot be after end date.");
    }

    const breakdown = calculateLeaveDays(start, end);
    return sendSuccess(res, "Leave days calculated successfully.", breakdown);
  } catch (error) {
    console.error("Preview leave days error:", error);
    return sendError(res, "Failed to calculate leave days.", 500);
  }
};

export const applyLeave = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const { leaveBreakdown: rawBreakdown, startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return sendError(res, "Please provide all required fields.");
    }

    const breakdown = parseLeaveBreakdownInput(rawBreakdown);
    if (!breakdown) {
      return sendError(
        res,
        "Please allocate leave days across one or more types (PL, CL, SL, LWP)."
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { leaveBalance: true },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    await refreshEmployeeLeaveBalances(employee.id);
    const refreshed = await prisma.employee.findUnique({
      where: { userId },
      include: { leaveBalance: true },
    });

    if (!refreshed?.leaveBalance) {
      return sendError(res, "Leave balance not found.", 404);
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (start > end) {
      return sendError(res, "Start date cannot be after end date.");
    }

    const { totalDays, sandwichDays } = calculateLeaveDays(start, end);

    if (totalDays === 0) {
      return sendError(res, "No leave days in the selected range. Pick at least one working day.");
    }

    const validation = await validateLeaveBreakdownApplication({
      employeeId: refreshed.id,
      balance: refreshed.leaveBalance,
      breakdown,
      totalDays,
      start,
      end,
      sandwichDays,
    });

    if (!validation.ok) {
      return sendError(res, validation.message);
    }

    const leaveTypeLabel = resolveLeaveTypeLabel(breakdown);

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: refreshed.id,
        leaveType: leaveTypeLabel,
        leaveBreakdown: breakdown,
        startDate: start,
        endDate: end,
        reason,
        days: totalDays,
        sandwichDays,
      },
    });

    void leaveNotificationHub.broadcast("NEW_REQUEST");

    return sendSuccess(
      res,
      `Leave request submitted for ${totalDays} day(s). Balance will be updated after admin approval.`,
      leaveRequest,
      201
    );
  } catch (error) {
    console.error("Apply leave error:", error);
    return sendError(res, "Failed to submit leave request.", 500);
  }
};

export const getMyLeaveRequests = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, "Leave requests fetched successfully.", leaveRequests);
  } catch (error) {
    console.error("Get my leaves error:", error);
    return sendError(res, "Failed to fetch leave requests.", 500);
  }
};

export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const [summary, policy] = await Promise.all([
      getEmployeeLeaveSummary(employee.id, { refresh: "pl-only" }),
      getLeavePolicy(),
    ]);

    const fy = getFinancialYear();

    return sendSuccess(res, "Leave balance fetched successfully.", {
      ...summary.balance,
      joiningDate: employee.joiningDate,
      financialYear: fy.label,
      usage: summary.usage,
      totals: summary.totals,
      available: summary.available,
      lwpTaken: summary.lwpTaken,
      clHalfYear: summary.clHalfYear,
      clTotal: summary.clTotal,
      slTotal: summary.slTotal,
      plTotal: summary.plTotal,
      clUsableThisHalf: summary.clUsableThisHalf,
      policy: {
        plMonthlyAllowance: policy.plMonthlyAllowance,
        annualCl: policy.annualCl,
        annualSl: policy.annualSl,
      },
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    return sendError(res, "Failed to fetch leave balance.", 500);
  }
};

export const getMyLeaveOverview = async (req: Request, res: Response) => {
  try {
    const authUser = (req as AuthRequest).user!;
    const { userId } = authUser;
    const now = new Date();
    const year = parseInt(String(req.query.year), 10) || now.getFullYear();
    const month = parseInt(String(req.query.month), 10) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return sendError(res, "Please provide a valid month (1-12).");
    }

    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, joiningDate: true },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const [summary, policy, leaveRequests, calendar] = await Promise.all([
      getEmployeeLeaveSummary(employee.id, { refresh: "pl-only" }),
      getLeavePolicy(),
      prisma.leaveRequest.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
      }),
      getCalendarForMonth(year, month, authUser),
    ]);

    const fy = getFinancialYear();

    return sendSuccess(res, "Leave overview fetched successfully.", {
      balance: {
        ...summary.balance,
        joiningDate: employee.joiningDate,
        financialYear: fy.label,
        usage: summary.usage,
        totals: summary.totals,
        available: summary.available,
        lwpTaken: summary.lwpTaken,
        clHalfYear: summary.clHalfYear,
        clTotal: summary.clTotal,
        slTotal: summary.slTotal,
        plTotal: summary.plTotal,
        clUsableThisHalf: summary.clUsableThisHalf,
        policy: {
          plMonthlyAllowance: policy.plMonthlyAllowance,
          annualCl: policy.annualCl,
          annualSl: policy.annualSl,
        },
      },
      requests: leaveRequests,
      calendar,
    });
  } catch (error) {
    console.error("Get leave overview error:", error);
    return sendError(res, "Failed to fetch leave overview.", 500);
  }
};

export const getLeaveUsage = async (_req: Request, res: Response) => {
  try {
    const usage = await getAllEmployeesLeaveUsage();
    const policy = await getLeavePolicy();
    const fy = getFinancialYear();

    return sendSuccess(res, "Leave usage fetched successfully.", {
      financialYear: fy.label,
      policy,
      employees: usage,
    });
  } catch (error) {
    console.error("Get leave usage error:", error);
    return sendError(res, "Failed to fetch leave usage.", 500);
  }
};

export const getAllLeaveRequests = async (_req: Request, res: Response) => {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, "All leave requests fetched successfully.", leaveRequests);
  } catch (error) {
    console.error("Get all leaves error:", error);
    return sendError(res, "Failed to fetch leave requests.", 500);
  }
};

export const getPendingLeaveCount = async (_req: Request, res: Response) => {
  try {
    const pendingCount = await leaveNotificationHub.getPendingCount();
    return sendSuccess(res, "Pending leave count fetched successfully.", { pendingCount });
  } catch (error) {
    console.error("Get pending leave count error:", error);
    return sendError(res, "Failed to fetch pending leave count.", 500);
  }
};

export const streamLeaveNotifications = async (req: Request, res: Response) => {
  const heartbeatMs = 30_000;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  leaveNotificationHub.subscribe(res);

  void leaveNotificationHub.sendToClient(res, "INIT");

  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, heartbeatMs);

  req.on("close", () => {
    clearInterval(heartbeat);
    leaveNotificationHub.unsubscribe(res);
  });
};

export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, adminNote } = req.body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return sendError(res, "Please provide a valid status (APPROVED or REJECTED).");
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { include: { leaveBalance: true } },
      },
    });

    if (!leaveRequest) {
      return sendError(res, "Leave request not found.", 404);
    }

    if (leaveRequest.status !== "PENDING") {
      return sendError(res, "This leave request has already been processed.");
    }

    const { employee } = leaveRequest;

    if (status === "APPROVED") {
      const breakdown = getRequestBreakdown(leaveRequest);
      const balance = employee.leaveBalance;

      if (!balance) {
        return sendError(res, "Leave balance not found.", 404);
      }

      const approvalCheck = await validateLeaveBreakdownApproval({
        employeeId: employee.id,
        balance,
        breakdown,
        start: leaveRequest.startDate,
        end: leaveRequest.endDate,
        excludeRequestId: leaveRequest.id,
      });

      if (!approvalCheck.ok) {
        return sendError(res, approvalCheck.message);
      }

      await deductApprovedLeaveBreakdown(balance.id, balance, breakdown);
      await refreshEmployeeLeaveBalances(employee.id);

      if (!leaveRequest.days) {
        const days = calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate).totalDays;
        await prisma.leaveRequest.update({
          where: { id },
          data: {
            days,
            sandwichDays: calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate)
              .sandwichDays,
          },
        });
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, adminNote },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    void leaveNotificationHub.broadcast("COUNT_UPDATED");

    return sendSuccess(res, `Leave request ${status.toLowerCase()} successfully.`, updated);
  } catch (error) {
    console.error("Update leave status error:", error);
    return sendError(res, "Failed to update leave request.", 500);
  }
};
