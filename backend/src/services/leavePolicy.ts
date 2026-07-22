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

let cachedPolicy: LeavePolicyData | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

export function invalidateLeavePolicyCache(): void {
  cachedPolicy = null;
  cacheLoadedAt = 0;
}

export async function getLeavePolicy(): Promise<LeavePolicyData> {
  const now = Date.now();
  if (cachedPolicy && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedPolicy;
  }

  const existing = await prisma.leavePolicy.findFirst();
  const policy = existing ?? (await prisma.leavePolicy.create({ data: DEFAULT_POLICY }));
  cachedPolicy = policy;
  cacheLoadedAt = now;
  return policy;
}

export async function updateLeavePolicy(data: {
  plMonthlyAllowance?: number;
  plRepeatMonthly?: boolean;
  annualCl?: number;
  annualSl?: number;
}): Promise<LeavePolicyData> {
  const policy = await getLeavePolicy();
  const updated = await prisma.leavePolicy.update({
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
  cachedPolicy = updated;
  cacheLoadedAt = Date.now();
  return updated;
}
