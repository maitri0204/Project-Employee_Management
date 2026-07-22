"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { leavePolicyApi } from "@/lib/services";
import { Button, Card, Input } from "@/components/ui";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

export default function LeaveAssignPage() {
  const [form, setForm] = useState({
    plMonthlyAllowance: "0",
    plRepeatMonthly: true,
    annualCl: "0",
    annualSl: "0",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);

  useEffect(() => {
    leavePolicyApi.get().then((res) => {
      if (res.data) {
        setForm({
          plMonthlyAllowance: String(res.data.plMonthlyAllowance),
          plRepeatMonthly: res.data.plRepeatMonthly,
          annualCl: String(res.data.annualCl),
          annualSl: String(res.data.annualSl),
        });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      await leavePolicyApi.update({
        plMonthlyAllowance: Number(form.plMonthlyAllowance),
        plRepeatMonthly: form.plRepeatMonthly,
        annualCl: Number(form.annualCl),
        annualSl: Number(form.annualSl),
      });
      setMessage("Leave assign saved and applied to all employees.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save leave assign");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Leave Assign</h1>
          <p className="mt-1 text-sm text-black">
            Assign leave entitlements for all employees. PL accrues monthly (end of month, based on
            joining date). CL/SL reset each financial year (April–March). PL carries forward.
          </p>
        </div>

        <Card>
          {message && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-blue-700">PL - Monthly Accrual</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="PL days per month"
                  type="number"
                  min={0}
                  value={form.plMonthlyAllowance}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, plMonthlyAllowance: e.target.value }))
                  }
                  required
                />
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-black">
                    <input
                      type="checkbox"
                      checked={form.plRepeatMonthly}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, plRepeatMonthly: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Repeat every month (credited when month ends)
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Joining on/after 20th counts from next month. PL balance carries forward each year.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="mb-3 text-sm font-semibold text-blue-700">
                CL & SL - Annual (Financial Year Apr–Mar)
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Annual CL days"
                  type="number"
                  min={0}
                  value={form.annualCl}
                  onChange={(e) => setForm((prev) => ({ ...prev, annualCl: e.target.value }))}
                  required
                />
                <Input
                  label="Annual SL days"
                  type="number"
                  min={0}
                  value={form.annualSl}
                  onChange={(e) => setForm((prev) => ({ ...prev, annualSl: e.target.value }))}
                  required
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                CL is split across the financial year: half in Apr–Sep, half in Oct–Mar. Unused CL
                from Apr–Sep carries forward to Oct–Mar. SL resets each April.
              </p>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Leave Assign for All Employees"}
            </Button>
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
