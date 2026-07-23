import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and PDF files are allowed."));
  }
};

export const uploadEmployeeDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "aadharCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
  { name: "cancelledCheque", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "degreeCertificates", maxCount: 10 },
]);

export const handleEmployeeUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadEmployeeDocs(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_COUNT") {
        return sendError(res, "Too many degree certificate files (maximum 10).", 400);
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "Each file must be 5 MB or smaller.", 400);
      }
      return sendError(res, err.message, 400);
    }

    return sendError(res, err.message || "File upload failed.", 400);
  });
};

export const getFileUrl = (filename: string | undefined): string | undefined => {
  return filename ? `/uploads/${filename}` : undefined;
};

export const getFileUrls = (files: Express.Multer.File[] | Express.Multer.File | undefined): string[] => {
  const list = normalizeUploadedFiles(files);
  return list
    .map((file) => getFileUrl(file.filename))
    .filter((url): url is string => Boolean(url));
};

export const normalizeUploadedFiles = (
  files: Express.Multer.File[] | Express.Multer.File | undefined
): Express.Multer.File[] => {
  if (!files) return [];
  return Array.isArray(files) ? files : [files];
};

export const uploadLeaveMedicalCert = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([{ name: "medicalCertificate", maxCount: 1 }]);

export const handleLeaveUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadLeaveMedicalCert(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "Medical certificate must be 5 MB or smaller.", 400);
      }
      return sendError(res, err.message, 400);
    }

    return sendError(res, err.message || "File upload failed.", 400);
  });
};

export const parseFile = (
  files: Express.Multer.File[] | Express.Multer.File | undefined
): Express.Multer.File | undefined => {
  return normalizeUploadedFiles(files)[0];
};
