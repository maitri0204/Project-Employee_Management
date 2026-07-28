import { Router } from "express";
import multer from "multer";
import {
  createHoliday,
  deleteHoliday,
  downloadHolidaySampleTemplate,
  listHolidays,
  listManagedHolidaysHandler,
  uploadHolidayExcel,
} from "../controllers/holiday.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";
import { sendError } from "../utils/response";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const allowed =
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel";
    cb(null, allowed);
  },
});

router.use(authenticate);

router.get("/", listHolidays);
router.get("/manage", authorizeAdmin, listManagedHolidaysHandler);
router.get("/sample-template", authorizeAdmin, downloadHolidaySampleTemplate);
router.post("/", authorizeAdmin, createHoliday);
router.post("/upload", authorizeAdmin, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return sendError(res, err.message, 400);
    }
    if (err) {
      return sendError(res, err.message || "File upload failed.", 400);
    }
    return next();
  });
}, uploadHolidayExcel);
router.delete("/:id", authorizeAdmin, deleteHoliday);

export default router;
