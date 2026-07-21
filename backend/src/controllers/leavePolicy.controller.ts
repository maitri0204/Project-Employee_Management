import { Request, Response } from "express";
import { getLeavePolicy, updateLeavePolicy } from "../services/leavePolicy";
import { applyPolicyToAllEmployees } from "../services/leaveAccrual";
import { sendError, sendSuccess } from "../utils/response";

export const getPolicy = async (_req: Request, res: Response) => {
  try {
    const policy = await getLeavePolicy();
    return sendSuccess(res, "Leave policy fetched successfully.", policy);
  } catch (error) {
    console.error("Get leave policy error:", error);
    return sendError(res, "Failed to fetch leave policy.", 500);
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { plMonthlyAllowance, plRepeatMonthly, annualCl, annualSl } = req.body;

    const policy = await updateLeavePolicy({
      ...(plMonthlyAllowance !== undefined && {
        plMonthlyAllowance: parseInt(String(plMonthlyAllowance), 10) || 0,
      }),
      ...(plRepeatMonthly !== undefined && {
        plRepeatMonthly: plRepeatMonthly === true || plRepeatMonthly === "true",
      }),
      ...(annualCl !== undefined && { annualCl: parseInt(String(annualCl), 10) || 0 }),
      ...(annualSl !== undefined && { annualSl: parseInt(String(annualSl), 10) || 0 }),
    });

    await applyPolicyToAllEmployees();

    return sendSuccess(res, "Leave policy updated for all employees.", policy);
  } catch (error) {
    console.error("Update leave policy error:", error);
    return sendError(res, "Failed to update leave policy.", 500);
  }
};
