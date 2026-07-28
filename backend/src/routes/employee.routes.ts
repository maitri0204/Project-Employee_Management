import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getArchivedEmployees,
  getEmployeeById,
  updateEmployee,
  updateMyProfile,
  approveDocument,
  rejectDocument,
  toggleProfileLock,
  archiveEmployee,
  unarchiveEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";
import { authenticate, authorize, authorizeAdmin } from "../middleware/auth";
import { handleEmployeeUpload, parseEmployeeFormFields } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.patch("/me", authorize("EMPLOYEE"), handleEmployeeUpload, updateMyProfile);
router.post("/", authorizeAdmin, parseEmployeeFormFields, createEmployee);
router.get("/archived", authorizeAdmin, getArchivedEmployees);
router.get("/", authorizeAdmin, getAllEmployees);
router.get("/:id", authorizeAdmin, getEmployeeById);
router.put("/:id", authorizeAdmin, handleEmployeeUpload, updateEmployee);
router.patch("/:id/documents/:documentKey/approve", authorizeAdmin, approveDocument);
router.patch("/:id/documents/:documentKey/reject", authorizeAdmin, rejectDocument);
router.patch("/:id/lock", authorizeAdmin, toggleProfileLock);
router.patch("/:id/archive", authorizeAdmin, archiveEmployee);
router.patch("/:id/unarchive", authorizeAdmin, unarchiveEmployee);
router.delete("/:id", authorizeAdmin, deleteEmployee);

export default router;
