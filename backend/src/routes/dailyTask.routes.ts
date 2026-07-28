import { Router } from "express";
import {
  assignDailyTask,
  createDailyTask,
  deleteDailyTask,
  getAllDailyTasks,
  getDailyTaskSummary,
  getMyDailyTasks,
  updateDailyTask,
} from "../controllers/dailyTask.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/assign", authorizeAdmin, assignDailyTask);
router.post("/", createDailyTask);
router.get("/my", getMyDailyTasks);
router.get("/summary", authorizeAdmin, getDailyTaskSummary);
router.get("/", authorizeAdmin, getAllDailyTasks);
router.patch("/:id", updateDailyTask);
router.delete("/:id", authorizeAdmin, deleteDailyTask);

export default router;
