import { Request, Response } from "express";
import prisma from "../config/database";
import { getFileUrl } from "../middleware/upload";
import { sendError, sendSuccess } from "../utils/response";

const parseFiles = (files: Express.Multer.File[] | undefined) => {
  return files?.[0]?.filename;
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      email,
      role,
      address,
      phone,
      panNumber,
      aadharNumber,
      bankAccountNumber,
      ifscCode,
      bankName,
      bankBranchName,
      pl,
      cl,
      sl,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
      !email ||
      !address ||
      !phone ||
      !panNumber ||
      !aadharNumber ||
      !bankAccountNumber ||
      !ifscCode ||
      !bankName ||
      !bankBranchName
    ) {
      return sendError(res, "Please fill all required fields.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return sendError(res, "An employee with this email already exists.");
    }

    const existingPan = await prisma.employee.findUnique({
      where: { panNumber },
    });
    if (existingPan) {
      return sendError(res, "An employee with this PAN number already exists.");
    }

    const existingAadhar = await prisma.employee.findUnique({
      where: { aadharNumber },
    });
    if (existingAadhar) {
      return sendError(res, "An employee with this Aadhar number already exists.");
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
        employee: {
          create: {
            firstName,
            middleName: middleName || null,
            lastName,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            address,
            phone,
            panNumber,
            aadharNumber,
            bankAccountNumber,
            ifscCode,
            bankName,
            bankBranchName,
            aadharCardUrl: getFileUrl(parseFiles(files?.aadharCard)),
            panCardUrl: getFileUrl(parseFiles(files?.panCard)),
            cancelledChequeUrl: getFileUrl(parseFiles(files?.cancelledCheque)),
            leaveBalance: {
              create: {
                pl: parseInt(pl) || 0,
                cl: parseInt(cl) || 0,
                sl: parseInt(sl) || 0,
              },
            },
          },
        },
      },
      include: {
        employee: {
          include: { leaveBalance: true },
        },
      },
    });

    return sendSuccess(res, "Employee added successfully.", user, 201);
  } catch (error) {
    console.error("Create employee error:", error);
    return sendError(res, "Failed to add employee.", 500);
  }
};

export const getAllEmployees = async (_req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        leaveBalance: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, "Employees fetched successfully.", employees);
  } catch (error) {
    console.error("Get employees error:", error);
    return sendError(res, "Failed to fetch employees.", 500);
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        leaveBalance: true,
        leaveRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return sendError(res, "Employee not found.", 404);
    }

    return sendSuccess(res, "Employee fetched successfully.", employee);
  } catch (error) {
    console.error("Get employee error:", error);
    return sendError(res, "Failed to fetch employee.", 500);
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      address,
      phone,
      panNumber,
      aadharNumber,
      bankAccountNumber,
      ifscCode,
      bankName,
      bankBranchName,
      role,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(middleName !== undefined && { middleName: middleName || null }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(panNumber && { panNumber }),
        ...(aadharNumber && { aadharNumber }),
        ...(bankAccountNumber && { bankAccountNumber }),
        ...(ifscCode && { ifscCode }),
        ...(bankName && { bankName }),
        ...(bankBranchName && { bankBranchName }),
        ...(files?.aadharCard && {
          aadharCardUrl: getFileUrl(parseFiles(files.aadharCard)),
        }),
        ...(files?.panCard && {
          panCardUrl: getFileUrl(parseFiles(files.panCard)),
        }),
        ...(files?.cancelledCheque && {
          cancelledChequeUrl: getFileUrl(parseFiles(files.cancelledCheque)),
        }),
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        leaveBalance: true,
      },
    });

    if (role) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE" },
      });
    }

    return sendSuccess(res, "Employee updated successfully.", employee);
  } catch (error) {
    console.error("Update employee error:", error);
    return sendError(res, "Failed to update employee.", 500);
  }
};

export const updateLeaveBalance = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { pl, cl, sl } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return sendError(res, "Employee not found.", 404);
    }

    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId: id },
      update: {
        ...(pl !== undefined && { pl: parseInt(pl) }),
        ...(cl !== undefined && { cl: parseInt(cl) }),
        ...(sl !== undefined && { sl: parseInt(sl) }),
      },
      create: {
        employeeId: id,
        pl: parseInt(pl) || 0,
        cl: parseInt(cl) || 0,
        sl: parseInt(sl) || 0,
      },
    });

    return sendSuccess(res, "Leave balance updated successfully.", balance);
  } catch (error) {
    console.error("Update leave balance error:", error);
    return sendError(res, "Failed to update leave balance.", 500);
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return sendError(res, "Employee not found.", 404);
    }

    await prisma.user.delete({ where: { id: employee.userId } });

    return sendSuccess(res, "Employee deleted successfully.");
  } catch (error) {
    console.error("Delete employee error:", error);
    return sendError(res, "Failed to delete employee.", 500);
  }
};
