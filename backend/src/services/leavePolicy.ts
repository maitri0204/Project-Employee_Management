import prisma from "../config/database";

export type LeavePolicyData = {
  id: string;
  plMonthlyAllowance: number;
  plRepeatMonthly: boolean;
  annualCl: number;
  annualSl: number;
  updatedAt: Date;
};

const DEFAULT_POLICY = {
  plMonthlyAllowance: 0,
  plRepeatMonthly: true,
  annualCl: 0,
  annualSl: 0,
};

export async function getLeavePolicy(): Promise<LeavePolicyData> {
  const existing = await prisma.leavePolicy.findFirst();
  if (existing) return existing;

  return prisma.leavePolicy.create({ data: DEFAULT_POLICY });
}

export async function updateLeavePolicy(data: {
  plMonthlyAllowance?: number;
  plRepeatMonthly?: boolean;
  annualCl?: number;
  annualSl?: number;
}): Promise<LeavePolicyData> {
  const policy = await getLeavePolicy();
  return prisma.leavePolicy.update({
    where: { id: policy.id },
    data: {
      ...(data.plMonthlyAllowance !== undefined && {
        plMonthlyAllowance: Math.max(0, data.plMonthlyAllowance),
      }),
      ...(data.plRepeatMonthly !== undefined && { plRepeatMonthly: data.plRepeatMonthly }),
      ...(data.annualCl !== undefined && { annualCl: Math.max(0, data.annualCl) }),
      ...(data.annualSl !== undefined && { annualSl: Math.max(0, data.annualSl) }),
    },
  });
}
