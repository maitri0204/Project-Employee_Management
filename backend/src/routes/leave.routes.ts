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
import { authenticate, authenticateFromQueryOrHeader, authorize } from "../middleware/auth";
import { handleLeaveUpload } from "../middleware/upload";

const router = Router();

router.get(
  "/notifications/stream",
  authenticateFromQueryOrHeader,
  authorize("ADMIN"),
  streamLeaveNotifications
);

router.use(authenticate);

router.post("/apply", handleLeaveUpload, applyLeave);
router.get("/preview-days", previewLeaveDays);
router.get("/my-overview", getMyLeaveOverview);
router.get("/my", getMyLeaveRequests);
router.get("/balance", getMyLeaveBalance);
router.get("/notifications/pending-count", authorize("ADMIN"), getPendingLeaveCount);
router.get("/usage", authorize("ADMIN"), getLeaveUsage);
router.get("/", authorize("ADMIN"), getAllLeaveRequests);
router.patch("/:id/status", authorize("ADMIN"), updateLeaveStatus);

export default router;
