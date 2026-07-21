"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { leaveApi } from "@/lib/services";
import { LeaveBalanceSummary, LeaveDayBreakdown, LeaveRequest, LeaveType } from "@/types";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

const statusVariant = {
  PENDING: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
};

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "PL" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [dayPreview, setDayPreview] = useState<LeaveDayBreakdown | null>(null);
  const [balance, setBalance] = useState<LeaveBalanceSummary | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useAutoDismiss(error, setError);

  const fetchRequests = () => {
    leaveApi.getMyRequests().then((res) => {
      if (res.data) setRequests(res.data);
    });
  };

  useEffect(() => {
    fetchRequests();
    leaveApi.getMyBalance().then((res) => {
      if (res.data) setBalance(res.data);
    });
  }, []);

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setDayPreview(null);
      return;
    }

    leaveApi
      .previewDays(formData.startDate, formData.endDate)
      .then((res) => {
        if (res.data) setDayPreview(res.data);
      })
      .catch(() => setDayPreview(null));
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await leaveApi.apply(formData);
      setShowForm(false);
      setFormData({ leaveType: "PL", startDate: "", endDate: "", reason: "" });
      setDayPreview(null);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Leaves</h1>
              <p className="mt-1 text-blue-100">
                Apply for leave. Sundays and 2nd Saturday of each month are holidays. Sandwich
                leave applies when holidays fall between your leave days.
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              {showForm ? "Cancel" : "Apply for Leave"}
            </Button>
          </div>
        </div>

        {showForm && (
          <Card>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Select
                label="Leave Type"
                value={formData.leaveType}
                onChange={(e) =>
                  setFormData({ ...formData, leaveType: e.target.value as LeaveType })
                }
                required
              >
                <option value="PL">PL – Privilege Leave</option>
                <option value="CL">CL – Casual Leave</option>
                <option value="SL">SL – Sick Leave</option>
                <option value="LWP">LWP – Leave Without Pay</option>
              </Select>
              {formData.leaveType === "CL" && balance?.clHalfYear && (
                <p className="text-xs text-slate-600 md:col-span-2">
                  Annual CL total: <strong>{balance.clTotal ?? balance.clHalfYear.annualCl}</strong>{" "}
                  · Remaining: <strong>{balance.cl}</strong> · Usable this half (
                  {balance.clHalfYear.currentHalf === "H1" ? "Apr–Sep" : "Oct–Mar"}):{" "}
                  <strong>{balance.clUsableThisHalf ?? balance.clHalfYear.available}</strong> day(s)
                  {balance.clHalfYear.carriedFromH1 > 0 &&
                    balance.clHalfYear.currentHalf === "H2" && (
                      <span> (includes {balance.clHalfYear.carriedFromH1} carried from Apr–Sep)</span>
                    )}
                  .
                </p>
              )}
              <div />
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
              {dayPreview && dayPreview.totalDays > 0 && (
                <div className="md:col-span-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <strong>{dayPreview.totalDays} leave day(s)</strong> will be deducted
                  {dayPreview.sandwichDays > 0 && (
                    <span> (includes {dayPreview.sandwichDays} sandwich holiday day(s))</span>
                  )}
                  . Working days in range: {dayPreview.workingDays}.
                </div>
              )}
              <div className="md:col-span-2">
                <Textarea
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-black">Type</th>
                  <th className="px-6 py-3 font-medium text-black">Dates</th>
                  <th className="px-6 py-3 font-medium text-black">Days</th>
                  <th className="px-6 py-3 font-medium text-black">Reason</th>
                  <th className="px-6 py-3 font-medium text-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-black">
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-black">{req.leaveType}</td>
                      <td className="px-6 py-4 text-black">
                        {new Date(req.startDate).toLocaleDateString()} –{" "}
                        {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-black">
                        {req.days ?? "—"}
                        {req.sandwichDays ? (
                          <span className="block text-xs text-slate-500">
                            +{req.sandwichDays} sandwich
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-black">{req.reason}</td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
