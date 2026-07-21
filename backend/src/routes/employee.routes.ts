import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  archiveEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth";
import { handleEmployeeUpload } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), handleEmployeeUpload, createEmployee);
router.get("/", authorize("ADMIN"), getAllEmployees);
router.get("/:id", authorize("ADMIN"), getEmployeeById);
router.put("/:id", authorize("ADMIN"), handleEmployeeUpload, updateEmployee);
router.patch("/:id/archive", authorize("ADMIN"), archiveEmployee);
router.delete("/:id", authorize("ADMIN"), deleteEmployee);

export default router;
