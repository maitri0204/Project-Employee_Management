import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  updateMyProfile,
  approveDocument,
  rejectDocument,
  toggleProfileLock,
  archiveEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth";
import { handleEmployeeUpload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.patch("/me", authorize("EMPLOYEE"), handleEmployeeUpload, updateMyProfile);
router.post("/", authorize("ADMIN"), createEmployee);
router.get("/", authorize("ADMIN"), getAllEmployees);
router.get("/:id", authorize("ADMIN"), getEmployeeById);
router.put("/:id", authorize("ADMIN"), handleEmployeeUpload, updateEmployee);
router.patch("/:id/documents/:documentKey/approve", authorize("ADMIN"), approveDocument);
router.patch("/:id/documents/:documentKey/reject", authorize("ADMIN"), rejectDocument);
router.patch("/:id/lock", authorize("ADMIN"), toggleProfileLock);
router.patch("/:id/archive", authorize("ADMIN"), archiveEmployee);
router.delete("/:id", authorize("ADMIN"), deleteEmployee);

export default router;
