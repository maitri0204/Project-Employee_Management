import { Router } from "express";
import {
  applyLeave,
  getMyLeaveRequests,
  getMyLeaveOverview,
  getMyLeaveBalance,
  getAllLeaveRequests,
  updateLeaveStatus,
  previewLeaveDays,
  getLeaveUsage,
  getPendingLeaveCount,
  streamLeaveNotifications,
} from "../controllers/leave.controller";
import {
  authenticate,
  authenticateFromQueryOrHeader,
  authorizeAdmin,
} from "../middleware/auth";
import { handleLeaveUpload } from "../middleware/upload";

const router = Router();

router.get(
  "/notifications/stream",
  authenticateFromQueryOrHeader,
  authorizeAdmin,
  streamLeaveNotifications
);

router.use(authenticate);

router.post("/apply", handleLeaveUpload, applyLeave);
router.get("/preview-days", previewLeaveDays);
router.get("/my-overview", getMyLeaveOverview);
router.get("/my", getMyLeaveRequests);
router.get("/balance", getMyLeaveBalance);
router.get("/notifications/pending-count", authorizeAdmin, getPendingLeaveCount);
router.get("/usage", authorizeAdmin, getLeaveUsage);
router.get("/", authorizeAdmin, getAllLeaveRequests);
router.patch("/:id/status", authorizeAdmin, updateLeaveStatus);

export default router;
