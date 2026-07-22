import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

const uploadDir = path.join(process.cwd(), "uploads", "hr-policy");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("Only PDF and Word documents (.pdf, .doc, .docx) are allowed."));
};

const uploadHrPolicy = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("document");

export const handleHrPolicyUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadHrPolicy(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "File must be 15 MB or smaller.", 400);
      }
      return sendError(res, err.message, 400);
    }

    return sendError(res, err.message || "File upload failed.", 400);
  });
};

export const getHrPolicyFilePath = (storedFilename: string) =>
  path.join(uploadDir, storedFilename);
