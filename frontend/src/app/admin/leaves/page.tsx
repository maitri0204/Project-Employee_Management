"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { leaveApi } from "@/lib/services";
import { LeaveRequest } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

const statusVariant = {
  PENDING: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
};

function formatName(req: LeaveRequest) {
  const e = req.employee;
  if (!e) return "—";
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");
}

export default function AdminLeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = () => {
    leaveApi.getAll().then((res) => {
      if (res.data) setRequests(res.data);
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setProcessingId(id);
    try {
      await leaveApi.updateStatus(id, status);
      fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Leave Requests</h1>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-border bg-primary">
                <tr>
                  <th className="px-6 py-3 font-medium text-text-secondary">Employee</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Type</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Dates</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Reason</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Status</th>
                  <th className="px-6 py-3 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-border">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-primary/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-primary">{formatName(req)}</p>
                        <p className="text-xs text-text-muted">{req.employee?.user?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{req.leaveType}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(req.startDate).toLocaleDateString()} –{" "}
                        {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{req.reason}</td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              onClick={() => handleStatusUpdate(req.id, "APPROVED")}
                              disabled={processingId === req.id}
                              className="!px-3 !py-1 text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleStatusUpdate(req.id, "REJECTED")}
                              disabled={processingId === req.id}
                              className="!px-3 !py-1 text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
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
