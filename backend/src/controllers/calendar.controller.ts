import { Request, Response } from "express";
import { AuthRequest } from "../types";
import { getCalendarForMonth } from "../services/calendar.service";
import { sendError, sendSuccess } from "../utils/response";
import { COMPANY_HOLIDAYS } from "../data/companyHolidays";

export const getMonthCalendar = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user!;
    const year = parseInt(String(req.query.year), 10);
    const month = parseInt(String(req.query.month), 10);

    if (!year || !month || month < 1 || month > 12) {
      return sendError(res, "Please provide valid year and month (1-12).");
    }

    const calendar = await getCalendarForMonth(year, month, user);
    return sendSuccess(res, "Calendar fetched successfully.", calendar);
  } catch (error) {
    console.error("Get calendar error:", error);
    return sendError(res, "Failed to fetch calendar.", 500);
  }
};

export const listCompanyHolidays = async (_req: Request, res: Response) => {
  try {
    return sendSuccess(res, "Company holidays fetched successfully.", COMPANY_HOLIDAYS);
  } catch (error) {
    console.error("List holidays error:", error);
    return sendError(res, "Failed to fetch holidays.", 500);
  }
};
