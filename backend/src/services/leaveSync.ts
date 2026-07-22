import { creditPendingPlForEmployee } from "./leaveAccrual";
import { syncEmployeeClSlBalance } from "./leaveBalance";

/** Run PL accrual catch-up and sync CL/SL balances for one employee. */
export async function refreshEmployeeLeaveBalances(employeeId: string): Promise<void> {
  await creditPendingPlForEmployee(employeeId);
  await syncEmployeeClSlBalance(employeeId);
}
