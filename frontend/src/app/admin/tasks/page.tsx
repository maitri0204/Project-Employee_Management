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
import { dailyTaskApi, employeeApi } from "@/lib/services";
import { toDateInputValue } from "@/lib/dateUtils";
import { DailyTask, DailyTaskSummary, Employee } from "@/types";

function formatName(emp: Pick<Employee, "firstName" | "middleName" | "lastName">) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export default function AdminTasksPage() {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<DailyTaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    employeeApi.getAll(false).then((res) => {
      if (res.data) setEmployees(res.data);
    });
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, summaryRes] = await Promise.all([
        dailyTaskApi.getAll(selectedDate, employeeFilter || undefined),
        dailyTaskApi.getSummary(selectedDate),
      ]);
      setTasks(tasksRes.data ?? []);
      setSummary(summaryRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, employeeFilter]);

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
          employeeFilter={employeeFilter}
          employees={employees}
          onDateChange={setSelectedDate}
          onEmployeeChange={setEmployeeFilter}
          formatName={formatName}
        />

        {summary && <AdminSummaryGrid summary={summary} />}

        {error && <TasksErrorBanner message={error} />}

        {loading ? (
          <TasksLoadingState label="Loading employee tasks..." />
        ) : groupedTasks.length === 0 ? (
          <TasksEmptyState
            title="No tasks for this day"
            hint={
              employeeFilter
                ? "This employee hasn't logged any tasks for the selected date."
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
