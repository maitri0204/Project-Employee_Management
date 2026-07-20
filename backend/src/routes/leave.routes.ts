import { Router } from "express";
import {
  applyLeave,
  getMyLeaveRequests,
  getMyLeaveBalance,
  getAllLeaveRequests,
  updateLeaveStatus,
} from "../controllers/leave.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/apply", applyLeave);
router.get("/my", getMyLeaveRequests);
router.get("/balance", getMyLeaveBalance);
router.get("/", authorize("ADMIN"), getAllLeaveRequests);
router.patch("/:id/status", authorize("ADMIN"), updateLeaveStatus);

export default router;
