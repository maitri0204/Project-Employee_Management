import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest, LeaveType } from "../types";
import { sendError, sendSuccess } from "../utils/response";

const calculateDays = (startDate: Date, endDate: Date): number => {
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const applyLeave = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return sendError(res, "Please provide all required fields.");
    }

    if (!["PL", "CL", "SL"].includes(leaveType)) {
      return sendError(res, "Invalid leave type. Use PL, CL, or SL.");
    }

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { leaveBalance: true },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return sendError(res, "Start date cannot be after end date.");
    }

    const daysRequested = calculateDays(start, end);
    const balance = employee.leaveBalance;

    if (balance) {
      const balanceMap: Record<LeaveType, number> = {
        PL: balance.pl,
        CL: balance.cl,
        SL: balance.sl,
      };

      if (daysRequested > balanceMap[leaveType as LeaveType]) {
        return sendError(
          res,
          `Insufficient ${leaveType} leave balance. Available: ${balanceMap[leaveType as LeaveType]} days.`
        );
      }
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
      },
    });

    return sendSuccess(
      res,
      "Leave request submitted successfully.",
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

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { leaveBalance: true },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    return sendSuccess(
      res,
      "Leave balance fetched successfully.",
      employee.leaveBalance
    );
  } catch (error) {
    console.error("Get leave balance error:", error);
    return sendError(res, "Failed to fetch leave balance.", 500);
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
      const days = calculateDays(leaveRequest.startDate, leaveRequest.endDate);
      const balance = employee.leaveBalance;

      if (balance) {
        const fieldMap: Record<string, "pl" | "cl" | "sl"> = {
          PL: "pl",
          CL: "cl",
          SL: "sl",
        };

        const field = fieldMap[leaveRequest.leaveType];
        if (field && balance[field] < days) {
          return sendError(
            res,
            `Insufficient ${leaveRequest.leaveType} balance to approve this request.`
          );
        }

        if (field) {
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { [field]: balance[field] - days },
          });
        }
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
