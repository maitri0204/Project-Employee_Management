"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  AdminEmployeeTaskGroup,
  AdminFiltersBar,
  AdminSummaryGrid,
  AdminTasksHero,
  TasksEmptyState,
  TasksErrorBanner,
  TasksLoadingState,
} from "@/components/daily-tasks/DailyTaskComponents";
import { dailyTaskApi } from "@/lib/services";
import { toDateInputValue } from "@/lib/dateUtils";
import { DailyTask, DailyTaskSummary } from "@/types";

function formatName(emp: { firstName: string; middleName?: string | null; lastName: string }) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export default function AdminTasksPage() {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [roleFilter, setRoleFilter] = useState("");
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<DailyTaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, summaryRes] = await Promise.all([
        dailyTaskApi.getAll(selectedDate, roleFilter || undefined),
        dailyTaskApi.getSummary(selectedDate, roleFilter || undefined),
      ]);
      setTasks(tasksRes.data ?? []);
      setSummary(summaryRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, roleFilter]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const groupedTasks = useMemo(() => {
    const map = new Map<string, { name: string; role?: string | null; email?: string; tasks: DailyTask[] }>();

    for (const task of tasks) {
      const emp = task.employee;
      const key = task.employeeId;
      const existing = map.get(key) ?? {
        name: emp ? formatName(emp) : "Employee",
        role: emp?.jobRole,
        email: emp?.user?.email,
        tasks: [],
      };
      existing.tasks.push(task);
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <AdminTasksHero summary={summary} />

        <AdminFiltersBar
          selectedDate={selectedDate}
          roleFilter={roleFilter}
          onDateChange={setSelectedDate}
          onRoleChange={setRoleFilter}
        />

        {summary && <AdminSummaryGrid summary={summary} />}

        {error && <TasksErrorBanner message={error} />}

        {loading ? (
          <TasksLoadingState label="Loading employee tasks..." />
        ) : groupedTasks.length === 0 ? (
          <TasksEmptyState
            title="No tasks for this day"
            hint={
              roleFilter
                ? `No employees with the "${roleFilter}" role have logged tasks for this date.`
                : "No employees have submitted tasks for this date yet. Check back later or pick another day."
            }
          />
        ) : (
          <div className="space-y-5">
            {groupedTasks.map((group) => (
              <AdminEmployeeTaskGroup
                key={group.tasks[0]?.employeeId ?? group.name}
                name={group.name}
                role={group.role}
                email={group.email}
                tasks={group.tasks}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
