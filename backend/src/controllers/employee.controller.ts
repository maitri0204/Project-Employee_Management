import { Request, Response } from "express";
import prisma from "../config/database";
import { JOB_ROLES } from "../constants/employee";
import { getFileUrl, getFileUrls, normalizeUploadedFiles } from "../middleware/upload";
import { getEffectiveJoiningDate } from "../services/leaveCalendar";
import { initializeEmployeeLeaveBalance } from "../services/leaveAccrual";
import {
  buildDocumentReviews,
  canEmployeeEditDocument,
  computeDocumentsStatus,
  clearDocumentUrlFields,
  computeRejectedReasonSummary,
  DocumentKey,
  DocumentReviews,
  getDocumentLabel,
  getDocumentReview,
  isValidDocumentKey,
  parseDocumentReviews,
} from "../services/documentReview";
import { canEmployeeEditProfile, isEmployeeProfileComplete } from "../services/employeeProfile";
import { batchGetEmployeeLeaveSummaries } from "../services/leaveSummaryBatch";
import { getEmployeeLeaveSummary } from "../services/leaveUsage";
import { sendDocumentRejectionEmail, sendWelcomeEmail } from "../utils/email";
import { sendError, sendSuccess } from "../utils/response";
import { validateAadharNumber, validateIfscCode, validatePanNumber } from "../utils/validation";
import { AuthRequest } from "../types";

const parseFile = (files: Express.Multer.File[] | undefined) => {
  return files?.[0]?.filename;
};

function formatEmployeeName(emp: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { firstName, middleName, lastName, jobRole, email, phone } = req.body;

    if (!firstName || !lastName || !jobRole || !email || !phone) {
      return sendError(res, "Please fill all required fields (name, role, email, phone).");
    }

    if (!(JOB_ROLES as readonly string[]).includes(jobRole)) {
      return sendError(res, "Please select a valid job role.");
    }

    if (!phone || !/^\+\d{1,4}\d{10}$/.test(phone)) {
      return sendError(
        res,
        "Please provide a valid phone number with country code and 10 digits."
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return sendError(res, "An employee with this email already exists.");
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: "EMPLOYEE",
        employee: {
          create: {
            firstName,
            middleName: middleName || null,
            lastName,
            phone,
            jobRole,
            degreeCertificateUrls: [],
            documentsStatus: "NOT_SUBMITTED",
          },
        },
      },
      include: {
        employee: {
          include: { leaveBalance: true },
        },
      },
    });

    if (user.employee) {
      await initializeEmployeeLeaveBalance(user.employee.id);
    }

    const employeeName = formatEmployeeName({
      firstName,
      middleName: middleName || null,
      lastName,
    });
    void sendWelcomeEmail(normalizedEmail, employeeName).catch((err) => {
      console.error("Welcome email failed:", err);
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: { include: { leaveBalance: true } } },
    });

    return sendSuccess(res, "Employee added successfully.", refreshed, 201);
  } catch (error) {
    console.error("Create employee error:", error);
    return sendError(res, "Failed to add employee.", 500);
  }
};

function applyDocumentUploadReviews(
  emp: {
    aadharCardUrl: string | null;
    panCardUrl: string | null;
    cancelledChequeUrl: string | null;
    resumeUrl: string | null;
    degreeCertificateUrls: string[];
    documentReviews?: unknown;
  },
  uploaded: Partial<Record<DocumentKey, boolean>>
): DocumentReviews {
  const reviews = { ...parseDocumentReviews(emp.documentReviews) };

  for (const key of Object.keys(uploaded) as DocumentKey[]) {
    if (!uploaded[key]) continue;
    reviews[key] = {
      status: "PENDING_REVIEW",
      rejectedReason: null,
      reviewedAt: null,
    };
  }

  return buildDocumentReviews({ ...emp, documentReviews: reviews });
}

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user!;

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });

    if (!employee) {
      return sendError(res, "Employee profile not found.", 404);
    }

    if (!canEmployeeEditProfile(employee)) {
      return sendError(res, "Your profile is locked by admin. Contact HR to make changes.");
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const degreeCertificates = normalizeUploadedFiles(files?.degreeCertificates);

    const uploadChecks: { key: DocumentKey; hasFile: boolean }[] = [
      { key: "aadharCard", hasFile: Boolean(files?.aadharCard?.[0]) },
      { key: "panCard", hasFile: Boolean(files?.panCard?.[0]) },
      { key: "cancelledCheque", hasFile: Boolean(files?.cancelledCheque?.[0]) },
      { key: "resume", hasFile: Boolean(files?.resume?.[0]) },
      { key: "degreeCertificates", hasFile: degreeCertificates.length > 0 },
    ];

    for (const { key, hasFile } of uploadChecks) {
      if (hasFile && !canEmployeeEditDocument(employee, key)) {
        return sendError(
          res,
          `Your ${getDocumentLabel(key)} is approved and cannot be changed.`
        );
      }
    }

    const {
      dateOfBirth,
      gender,
      addressLine1,
      addressLine2,
      addressLine3,
      country,
      state,
      city,
      pincode,
      panNumber,
      aadharNumber,
      bankAccountNumber,
      accountType,
      ifscCode,
      bankName,
      bankBranchName,
    } = req.body;

    if (panNumber) {
      const panError = validatePanNumber(panNumber);
      if (panError) return sendError(res, panError);
      const existingPan = await prisma.employee.findFirst({
        where: { panNumber: panNumber.trim().toUpperCase(), NOT: { id: employee.id } },
      });
      if (existingPan) return sendError(res, "An employee with this PAN number already exists.");
    }

    if (aadharNumber) {
      const aadharError = validateAadharNumber(aadharNumber);
      if (aadharError) return sendError(res, aadharError);
      const normalized = aadharNumber.replace(/\s/g, "");
      const existingAadhar = await prisma.employee.findFirst({
        where: { aadharNumber: normalized, NOT: { id: employee.id } },
      });
      if (existingAadhar) return sendError(res, "An employee with this Aadhar number already exists.");
    }

    if (ifscCode) {
      const ifscError = validateIfscCode(ifscCode);
      if (ifscError) return sendError(res, ifscError);
    }

    if (accountType && !["CORPORATE", "INDIVIDUAL"].includes(accountType)) {
      return sendError(res, "Please select a valid account type.");
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(addressLine1 && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
        ...(addressLine3 !== undefined && { addressLine3: addressLine3 || null }),
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(pincode && { pincode }),
        ...(panNumber && { panNumber: panNumber.trim().toUpperCase() }),
        ...(aadharNumber && { aadharNumber: aadharNumber.replace(/\s/g, "") }),
        ...(bankAccountNumber && { bankAccountNumber }),
        ...(accountType && { accountType }),
        ...(ifscCode && { ifscCode: ifscCode.trim().toUpperCase() }),
        ...(bankName && { bankName }),
        ...(bankBranchName && { bankBranchName }),
        ...(files?.aadharCard &&
          canEmployeeEditDocument(employee, "aadharCard") && {
            aadharCardUrl: getFileUrl(parseFile(files.aadharCard)),
          }),
        ...(files?.panCard &&
          canEmployeeEditDocument(employee, "panCard") && {
            panCardUrl: getFileUrl(parseFile(files.panCard)),
          }),
        ...(files?.cancelledCheque &&
          canEmployeeEditDocument(employee, "cancelledCheque") && {
            cancelledChequeUrl: getFileUrl(parseFile(files.cancelledCheque)),
          }),
        ...(files?.resume &&
          canEmployeeEditDocument(employee, "resume") && {
            resumeUrl: getFileUrl(parseFile(files.resume)),
          }),
        ...(degreeCertificates.length > 0 &&
          canEmployeeEditDocument(employee, "degreeCertificates") && {
            degreeCertificateUrls: [
              ...(employee.degreeCertificateUrls ?? []),
              ...getFileUrls(degreeCertificates),
            ],
          }),
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
        leaveBalance: true,
      },
    });

    let finalEmployee = updated;

    const uploadedMap: Partial<Record<DocumentKey, boolean>> = {
      aadharCard: Boolean(files?.aadharCard?.[0]),
      panCard: Boolean(files?.panCard?.[0]),
      cancelledCheque: Boolean(files?.cancelledCheque?.[0]),
      resume: Boolean(files?.resume?.[0]),
      degreeCertificates: degreeCertificates.length > 0,
    };

    const hasUploads = Object.values(uploadedMap).some(Boolean);
    const shouldSyncReviews = isEmployeeProfileComplete(updated) || hasUploads;

    if (shouldSyncReviews) {
      const documentReviews = hasUploads
        ? applyDocumentUploadReviews(updated, uploadedMap)
        : buildDocumentReviews(updated);
      const documentsStatus = computeDocumentsStatus(updated, documentReviews);
      const documentsRejectedReason = computeRejectedReasonSummary(documentReviews);

      finalEmployee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          documentReviews,
          documentsStatus,
          documentsRejectedReason,
          ...(!updated.joiningDate && isEmployeeProfileComplete(updated)
            ? { joiningDate: getEffectiveJoiningDate(new Date()) }
            : {}),
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          leaveBalance: true,
        },
      });
    }

    return sendSuccess(res, "Profile updated successfully.", finalEmployee);
  } catch (error) {
    console.error("Update my profile error:", error);
    return sendError(res, "Failed to update profile.", 500);
  }
};

export const approveDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const documentKey = req.params.documentKey as string;

    if (!isValidDocumentKey(documentKey)) {
      return sendError(res, "Invalid document type.");
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return sendError(res, "Employee not found.", 404);

    const review = getDocumentReview(employee, documentKey);
    if (review.status === "NOT_SUBMITTED") {
      return sendError(res, `${getDocumentLabel(documentKey)} has not been uploaded yet.`);
    }
    if (review.status === "APPROVED") {
      return sendError(res, `${getDocumentLabel(documentKey)} is already approved.`);
    }

    const documentReviews: DocumentReviews = {
      ...parseDocumentReviews(employee.documentReviews),
      [documentKey]: {
        status: "APPROVED",
        rejectedReason: null,
        reviewedAt: new Date().toISOString(),
      },
    };

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        documentReviews,
        documentsStatus: computeDocumentsStatus(employee, documentReviews),
        documentsRejectedReason: computeRejectedReasonSummary(documentReviews),
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
        leaveBalance: true,
      },
    });

    return sendSuccess(
      res,
      `${getDocumentLabel(documentKey)} approved successfully.`,
      updated
    );
  } catch (error) {
    console.error("Approve document error:", error);
    return sendError(res, "Failed to approve document.", 500);
  }
};

export const rejectDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const documentKey = req.params.documentKey as string;
    const { reason } = req.body;

    if (!isValidDocumentKey(documentKey)) {
      return sendError(res, "Invalid document type.");
    }

    if (!reason?.trim()) {
      return sendError(res, "Rejection reason is required.");
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!employee) return sendError(res, "Employee not found.", 404);

    const review = getDocumentReview(employee, documentKey);
    if (review.status === "NOT_SUBMITTED") {
      return sendError(res, `${getDocumentLabel(documentKey)} has not been uploaded yet.`);
    }
    if (review.status === "APPROVED") {
      return sendError(res, `${getDocumentLabel(documentKey)} is already approved.`);
    }

    const documentReviews: DocumentReviews = {
      ...parseDocumentReviews(employee.documentReviews),
      [documentKey]: {
        status: "REJECTED",
        rejectedReason: reason.trim(),
        reviewedAt: new Date().toISOString(),
      },
    };

    const clearedFields = clearDocumentUrlFields(documentKey as DocumentKey);
    const employeeAfterClear = { ...employee, ...clearedFields };

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...clearedFields,
        documentReviews,
        documentsStatus: computeDocumentsStatus(employeeAfterClear, documentReviews),
        documentsRejectedReason: computeRejectedReasonSummary(documentReviews),
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
        leaveBalance: true,
      },
    });

    const name = formatEmployeeName(employee);
    const label = getDocumentLabel(documentKey);
    void sendDocumentRejectionEmail(
      employee.user.email,
      name,
      label,
      reason.trim()
    ).catch((err) => {
      console.error("Document rejection email failed:", err);
    });

    return sendSuccess(
      res,
      `${label} rejected and employee notified.`,
      updated
    );
  } catch (error) {
    console.error("Reject document error:", error);
    return sendError(res, "Failed to reject document.", 500);
  }
};

export const toggleProfileLock = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { locked } = req.body;

    if (typeof locked !== "boolean") {
      return sendError(res, "Please provide locked: true or false.");
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return sendError(res, "Employee not found.", 404);

    const updated = await prisma.employee.update({
      where: { id },
      data: { isProfileLocked: locked },
      include: {
        user: { select: { id: true, email: true, role: true } },
        leaveBalance: true,
      },
    });

    return sendSuccess(
      res,
      locked ? "Employee profile locked." : "Employee profile unlocked.",
      updated
    );
  } catch (error) {
    console.error("Toggle profile lock error:", error);
    return sendError(res, "Failed to update profile lock.", 500);
  }
};

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const enrich = req.query.enrich !== "false";

    const employees = await prisma.employee.findMany({
      where: {
        NOT: { isArchived: true },
        user: { role: "EMPLOYEE" },
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        jobRole: true,
        joiningDate: true,
        documentsStatus: true,
        isProfileLocked: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, role: true },
        },
        leaveBalance: {
          select: { pl: true, cl: true, sl: true, lwpUsed: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrich) {
      return sendSuccess(res, "Employees fetched successfully.", employees);
    }

    const employeeIds = employees.map((e) => e.id);
    const summaries = await batchGetEmployeeLeaveSummaries(employeeIds);

    const enriched = employees.map((employee) => {
      const summary = summaries.get(employee.id);
      return {
        ...employee,
        leaveUsage: summary?.usage,
        leaveTotals: summary?.totals,
      };
    });

    return sendSuccess(res, "Employees fetched successfully.", enriched);
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

    const leaveSummary = await getEmployeeLeaveSummary(id);

    return sendSuccess(res, "Employee fetched successfully.", {
      ...employee,
      leaveUsage: leaveSummary.usage,
      leaveTotals: leaveSummary.totals,
      clTotal: leaveSummary.clTotal,
      slTotal: leaveSummary.slTotal,
      plTotal: leaveSummary.plTotal,
      clUsableThisHalf: leaveSummary.clUsableThisHalf,
      lwpTaken: leaveSummary.lwpTaken,
    });
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
      jobRole,
      email,
      addressLine1,
      addressLine2,
      addressLine3,
      country,
      state,
      city,
      pincode,
      phone,
      panNumber,
      aadharNumber,
      bankAccountNumber,
      accountType,
      ifscCode,
      bankName,
      bankBranchName,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const degreeCertificates = normalizeUploadedFiles(files?.degreeCertificates);

    if (panNumber) {
      const panError = validatePanNumber(panNumber);
      if (panError) return sendError(res, panError);
      const existingPan = await prisma.employee.findFirst({
        where: { panNumber: panNumber.trim().toUpperCase(), NOT: { id } },
      });
      if (existingPan) return sendError(res, "An employee with this PAN number already exists.");
    }
    if (aadharNumber) {
      const aadharError = validateAadharNumber(aadharNumber);
      if (aadharError) return sendError(res, aadharError);
      const normalized = aadharNumber.replace(/\s/g, "");
      const existingAadhar = await prisma.employee.findFirst({
        where: { aadharNumber: normalized, NOT: { id } },
      });
      if (existingAadhar) return sendError(res, "An employee with this Aadhar number already exists.");
    }
    if (ifscCode) {
      const ifscError = validateIfscCode(ifscCode);
      if (ifscError) return sendError(res, ifscError);
    }

    if (jobRole && !(JOB_ROLES as readonly string[]).includes(jobRole)) {
      return sendError(res, "Please select a valid job role.");
    }

    if (accountType && !["CORPORATE", "INDIVIDUAL"].includes(accountType)) {
      return sendError(res, "Please select a valid account type.");
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const employee = await prisma.employee.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!employee) return sendError(res, "Employee not found.", 404);

      const existingUser = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: employee.userId } },
      });
      if (existingUser) return sendError(res, "An employee with this email already exists.");

      await prisma.user.update({
        where: { id: employee.userId },
        data: { email: normalizedEmail },
      });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(middleName !== undefined && { middleName: middleName || null }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(jobRole && { jobRole }),
        ...(addressLine1 && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
        ...(addressLine3 !== undefined && { addressLine3: addressLine3 || null }),
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(pincode && { pincode }),
        ...(phone && { phone }),
        ...(panNumber && { panNumber: panNumber.trim().toUpperCase() }),
        ...(aadharNumber && { aadharNumber: aadharNumber.replace(/\s/g, "") }),
        ...(bankAccountNumber && { bankAccountNumber }),
        ...(accountType && { accountType }),
        ...(ifscCode && { ifscCode: ifscCode.trim().toUpperCase() }),
        ...(bankName && { bankName }),
        ...(bankBranchName && { bankBranchName }),
        ...(files?.aadharCard && {
          aadharCardUrl: getFileUrl(parseFile(files.aadharCard)),
        }),
        ...(files?.panCard && {
          panCardUrl: getFileUrl(parseFile(files.panCard)),
        }),
        ...(files?.cancelledCheque && {
          cancelledChequeUrl: getFileUrl(parseFile(files.cancelledCheque)),
        }),
        ...(files?.resume && {
          resumeUrl: getFileUrl(parseFile(files.resume)),
        }),
        ...(degreeCertificates.length > 0 && {
          degreeCertificateUrls: getFileUrls(degreeCertificates),
        }),
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        leaveBalance: true,
      },
    });

    return sendSuccess(res, "Employee updated successfully.", employee);
  } catch (error) {
    console.error("Update employee error:", error);
    return sendError(res, "Failed to update employee.", 500);
  }
};

export const archiveEmployee = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { role: true } } },
    });

    if (!employee) {
      return sendError(res, "Employee not found.", 404);
    }

    if (employee.user.role !== "EMPLOYEE") {
      return sendError(res, "Only employees can be archived.");
    }

    if (employee.isArchived === true) {
      return sendError(res, "Employee is already archived.");
    }

    await prisma.employee.update({
      where: { id },
      data: { isArchived: true },
    });

    return sendSuccess(res, "Employee archived successfully.");
  } catch (error) {
    console.error("Archive employee error:", error);
    return sendError(res, "Failed to archive employee.", 500);
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
