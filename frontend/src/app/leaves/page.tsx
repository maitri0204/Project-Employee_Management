"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { leaveApi } from "@/lib/services";
import { LeaveRequest, LeaveType } from "@/types";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";

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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = () => {
    leaveApi.getMyRequests().then((res) => {
      if (res.data) setRequests(res.data);
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await leaveApi.apply(formData);
      setShowForm(false);
      setFormData({ leaveType: "PL", startDate: "", endDate: "", reason: "" });
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">My Leaves</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Apply for Leave"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            {error && (
              <div className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">
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
              </Select>
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
              <thead className="border-b border-secondary-border bg-primary">
                <tr>
                  <th className="px-6 py-3 font-medium text-text-secondary">Type</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Dates</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Reason</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-border">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-primary/50">
                      <td className="px-6 py-4 font-medium text-text-primary">{req.leaveType}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(req.startDate).toLocaleDateString()} –{" "}
                        {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{req.reason}</td>
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
      </main>
    </ProtectedRoute>
  );
}
