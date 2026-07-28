import cron from "node-cron";
import { runLeaveAccrualJobs } from "../services/leaveAccrual";

async function runLeaveAccrualSafely(label: string) {
  try {
    await runLeaveAccrualJobs();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Leave accrual skipped (${label}):`, message);
  }
}

/** Monthly PL accrual on 1st; FY CL/SL reset on 1 April; catch-up on startup. */
export function startLeaveAccrualScheduler() {
  cron.schedule("5 0 1 * *", () => {
    console.log("Running monthly leave accrual...");
    void runLeaveAccrualSafely("monthly cron");
  });

  cron.schedule("10 0 1 4 *", () => {
    console.log("Running financial year CL/SL reset...");
    void runLeaveAccrualSafely("FY cron");
  });

  // Defer startup catch-up so the server is up even if the DB is briefly unreachable.
  setTimeout(() => {
    void runLeaveAccrualSafely("startup catch-up");
  }, 3000);
}
