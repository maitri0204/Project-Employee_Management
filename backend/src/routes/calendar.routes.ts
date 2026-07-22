import { Router } from "express";
import { getMonthCalendar, listCompanyHolidays } from "../controllers/calendar.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getMonthCalendar);
router.get("/holidays", listCompanyHolidays);

export default router;
