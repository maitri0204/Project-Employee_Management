import cron from "node-cron";
import { runLeaveAccrualJobs } from "../services/leaveAccrual";

/** Monthly PL accrual on 1st; FY CL/SL reset on 1 April; catch-up on startup. */
export function startLeaveAccrualScheduler() {
  cron.schedule("5 0 1 * *", () => {
    console.log("Running monthly leave accrual...");
    void runLeaveAccrualJobs();
  });

  cron.schedule("10 0 1 4 *", () => {
    console.log("Running financial year CL/SL reset...");
    void runLeaveAccrualJobs();
  });

  void runLeaveAccrualJobs();
}
