import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  updateLeaveBalance,
  deleteEmployee,
} from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth";
import { uploadEmployeeDocs } from "../middleware/upload";

const router = Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), uploadEmployeeDocs, createEmployee);
router.get("/", authorize("ADMIN"), getAllEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", authorize("ADMIN"), uploadEmployeeDocs, updateEmployee);
router.patch("/:id/leave-balance", authorize("ADMIN"), updateLeaveBalance);
router.delete("/:id", authorize("ADMIN"), deleteEmployee);

export default router;
