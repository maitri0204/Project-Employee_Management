import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest, LeaveType } from "../types";
import { sendError, sendSuccess } from "../utils/response";
import { calculateLeaveDays } from "../services/leaveCalculation";
import { getFinancialYear, parseDateOnly } from "../services/leaveCalendar";
import { getLeavePolicy } from "../services/leavePolicy";
import { syncEmployeeClSlBalance } from "../services/leaveBalance";
import { validateClLeaveRequest, getClHalfYearInfo } from "../services/leaveClHalfYear";
import {
  getAllEmployeesLeaveUsage,
  getEmployeeLeaveSummary,
} from "../services/leaveUsage";

const PAID_LEAVE_TYPES: LeaveType[] = ["PL", "CL", "SL"];

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
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return sendError(res, "Please provide all required fields.");
    }

    if (!["PL", "CL", "SL", "LWP"].includes(leaveType)) {
      return sendError(res, "Invalid leave type. Use PL, CL, SL, or LWP.");
    }

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { leaveBalance: true },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    await syncEmployeeClSlBalance(employee.id);
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

    if (PAID_LEAVE_TYPES.includes(leaveType as LeaveType)) {
      const balance = refreshed.leaveBalance;

      if (leaveType === "CL") {
        const policy = await getLeavePolicy();
        const clInfo = await getClHalfYearInfo(refreshed.id, policy.annualCl);

        const clCheck = await validateClLeaveRequest(
          refreshed.id,
          policy.annualCl,
          start,
          end
        );
        if (!clCheck.ok) {
          return sendError(res, clCheck.message ?? "CL limit exceeded for this period.");
        }

        if (totalDays > clInfo.annualRemaining) {
          const sandwichNote =
            sandwichDays > 0 ? ` (includes ${sandwichDays} sandwich day(s))` : "";
          return sendError(
            res,
            `Insufficient CL balance. Required: ${totalDays}${sandwichNote}. Annual remaining: ${clInfo.annualRemaining} day(s).`
          );
        }

        if (totalDays > clInfo.available) {
          const halfLabel = clInfo.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar";
          return sendError(
            res,
            `You can use only ${clInfo.available} CL day(s) in ${halfLabel} (half-year limit).`
          );
        }
      } else {
        const balanceMap: Record<string, number> = {
          PL: balance.pl,
          SL: balance.sl,
        };

        if (totalDays > balanceMap[leaveType]) {
          const sandwichNote =
            sandwichDays > 0 ? ` (includes ${sandwichDays} sandwich day(s))` : "";
          return sendError(
            res,
            `Insufficient ${leaveType} leave balance. Required: ${totalDays}${sandwichNote}. Available: ${balanceMap[leaveType]} days.`
          );
        }
      }
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: refreshed.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        days: totalDays,
        sandwichDays,
      },
    });

    return sendSuccess(
      res,
      `Leave request submitted for ${totalDays} day(s).`,
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
      getEmployeeLeaveSummary(employee.id),
      getLeavePolicy(),
    ]);

    const fy = getFinancialYear();

    return sendSuccess(res, "Leave balance fetched successfully.", {
      ...summary.balance,
      joiningDate: employee.joiningDate,
      financialYear: fy.label,
      usage: summary.usage,
      available: summary.available,
      lwpTaken: summary.lwpTaken,
      clHalfYear: summary.clHalfYear,
      clTotal: summary.clTotal,
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
      const days =
        leaveRequest.days ??
        calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate).totalDays;
      const balance = employee.leaveBalance;

      if (leaveRequest.leaveType === "CL") {
        const policy = await getLeavePolicy();
        const clInfo = await getClHalfYearInfo(employee.id, policy.annualCl);
        const clCheck = await validateClLeaveRequest(
          employee.id,
          policy.annualCl,
          leaveRequest.startDate,
          leaveRequest.endDate,
          leaveRequest.id
        );
        if (!clCheck.ok) {
          return sendError(res, clCheck.message ?? "Cannot approve: CL half-year limit exceeded.");
        }
        if (days > clInfo.annualRemaining) {
          return sendError(
            res,
            `Insufficient CL balance to approve (${days} days required, ${clInfo.annualRemaining} annual remaining).`
          );
        }
        if (days > clInfo.available) {
          const halfLabel = clInfo.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar";
          return sendError(
            res,
            `Cannot approve: only ${clInfo.available} CL day(s) allowed in ${halfLabel}.`
          );
        }
      }

      if (leaveRequest.leaveType === "LWP") {
        if (balance) {
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { lwpUsed: balance.lwpUsed + days },
          });
        }
      } else if (PAID_LEAVE_TYPES.includes(leaveRequest.leaveType as LeaveType) && balance) {
        const fieldMap: Record<string, "pl" | "cl" | "sl"> = {
          PL: "pl",
          CL: "cl",
          SL: "sl",
        };

        const field = fieldMap[leaveRequest.leaveType];
        if (field === "cl") {
          // CL balance validated above via half-year rules; sync after approval.
        } else if (field && balance[field] < days) {
          return sendError(
            res,
            `Insufficient ${leaveRequest.leaveType} balance to approve (${days} days required).`
          );
        }

        if (field) {
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              [field]: field === "cl" ? Math.max(0, balance.cl - days) : balance[field] - days,
            },
          });
        }
      }

      await syncEmployeeClSlBalance(employee.id);

      if (!leaveRequest.days) {
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

    return sendSuccess(res, `Leave request ${status.toLowerCase()} successfully.`, updated);
  } catch (error) {
    console.error("Update leave status error:", error);
    return sendError(res, "Failed to update leave request.", 500);
  }
};
