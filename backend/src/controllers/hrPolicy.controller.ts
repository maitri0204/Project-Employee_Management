import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import mammoth from "mammoth";
import prisma from "../config/database";
import { AuthRequest } from "../types";
import { getHrPolicyFilePath } from "../middleware/hrPolicyUpload";
import { sendError, sendSuccess } from "../utils/response";
import { isAdminRole } from "../utils/roles";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

export const listHrPolicyDocuments = async (_req: Request, res: Response) => {
  try {
    const documents = await prisma.hrPolicyDocument.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        mimeType: true,
        createdAt: true,
      },
    });

    return sendSuccess(res, "HR policy documents fetched successfully.", documents);
  } catch (error) {
    console.error("List HR policy error:", error);
    return sendError(res, "Failed to fetch HR policy documents.", 500);
  }
};

export const uploadHrPolicyDocument = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return sendError(res, "Please upload a PDF or Word document.");
    }

    const document = await prisma.hrPolicyDocument.create({
      data: {
        displayName: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype,
      },
    });

    return sendSuccess(res, "HR policy document uploaded successfully.", document, 201);
  } catch (error) {
    console.error("Upload HR policy error:", error);
    return sendError(res, "Failed to upload HR policy document.", 500);
  }
};

export const deleteHrPolicyDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const document = await prisma.hrPolicyDocument.findUnique({ where: { id } });

    if (!document) {
      return sendError(res, "Document not found.", 404);
    }

    const filePath = getHrPolicyFilePath(document.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.hrPolicyDocument.delete({ where: { id } });

    return sendSuccess(res, "HR policy document deleted successfully.");
  } catch (error) {
    console.error("Delete HR policy error:", error);
    return sendError(res, "Failed to delete HR policy document.", 500);
  }
};

export const viewHrPolicyDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const document = await prisma.hrPolicyDocument.findUnique({ where: { id } });

    if (!document) {
      return sendError(res, "Document not found.", 404);
    }

    const filePath = getHrPolicyFilePath(document.storedFilename);
    if (!fs.existsSync(filePath)) {
      return sendError(res, "Document file not found.", 404);
    }

    if (document.mimeType === "application/pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(document.displayName)}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    if (document.mimeType === DOCX_MIME || document.mimeType === DOC_MIME) {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      return sendSuccess(res, "Document preview loaded.", {
        displayName: document.displayName,
        html: result.value,
        mimeType: document.mimeType,
      });
    }

    return sendError(res, "Unsupported document type for preview.", 400);
  } catch (error) {
    console.error("View HR policy error:", error);
    return sendError(res, "Failed to load document preview.", 500);
  }
};

export const downloadHrPolicyDocument = async (req: Request, res: Response) => {
  try {
    const { role } = (req as AuthRequest).user!;
    if (!isAdminRole(role)) {
      return sendError(res, "Only admins can download HR policy documents.", 403);
    }

    const id = req.params.id as string;
    const document = await prisma.hrPolicyDocument.findUnique({ where: { id } });

    if (!document) {
      return sendError(res, "Document not found.", 404);
    }

    const filePath = getHrPolicyFilePath(document.storedFilename);
    if (!fs.existsSync(filePath)) {
      return sendError(res, "Document file not found.", 404);
    }

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.displayName)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Download HR policy error:", error);
    return sendError(res, "Failed to download document.", 500);
  }
};
