import { Router } from "express";
import {
  createDailyTask,
  deleteDailyTask,
  getAllDailyTasks,
  getDailyTaskSummary,
  getMyDailyTasks,
  updateDailyTask,
} from "../controllers/dailyTask.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createDailyTask);
router.get("/my", getMyDailyTasks);
router.get("/summary", authorize("ADMIN"), getDailyTaskSummary);
router.get("/", authorize("ADMIN"), getAllDailyTasks);
router.patch("/:id", updateDailyTask);
router.delete("/:id", deleteDailyTask);

export default router;
