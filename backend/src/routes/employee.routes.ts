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
import { authenticate, authorize, authorizeAdmin } from "../middleware/auth";
import { handleEmployeeUpload, parseEmployeeFormFields } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.patch("/me", authorize("EMPLOYEE"), handleEmployeeUpload, updateMyProfile);
router.post("/", authorizeAdmin, parseEmployeeFormFields, createEmployee);
router.get("/", authorizeAdmin, getAllEmployees);
router.get("/:id", authorizeAdmin, getEmployeeById);
router.put("/:id", authorizeAdmin, handleEmployeeUpload, updateEmployee);
router.patch("/:id/documents/:documentKey/approve", authorizeAdmin, approveDocument);
router.patch("/:id/documents/:documentKey/reject", authorizeAdmin, rejectDocument);
router.patch("/:id/lock", authorizeAdmin, toggleProfileLock);
router.patch("/:id/archive", authorizeAdmin, archiveEmployee);
router.delete("/:id", authorizeAdmin, deleteEmployee);

export default router;
