"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import LeaveCalendar from "@/components/LeaveCalendar";

export default function AdminCalendarPage() {
  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-xl">
          <h1 className="text-2xl font-bold">Leave Calendar</h1>
          <p className="mt-1 text-indigo-100">
            Company holidays and team leave at a glance. Pick any month and year from the dropdowns.
          </p>
        </div>
        <LeaveCalendar adminView />
      </div>
    </ProtectedRoute>
  );
}
