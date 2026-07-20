import multer from "multer";
import path from "path";
import fs from "fs";

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

export const getFileUrl = (filename: string | undefined): string | undefined => {
  return filename ? `/uploads/${filename}` : undefined;
};

export const getFileUrls = (files: Express.Multer.File[] | undefined): string[] => {
  return (files ?? [])
    .map((file) => getFileUrl(file.filename))
    .filter((url): url is string => Boolean(url));
};
