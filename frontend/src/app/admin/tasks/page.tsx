"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  AdminAssignTaskForm,
  AdminEmployeeTaskGroup,
  AdminSummaryGrid,
  AdminTasksHero,
  TasksEmptyState,
  TasksErrorBanner,
  TasksLoadingState,
} from "@/components/daily-tasks/DailyTaskComponents";
import { dailyTaskApi, employeeApi } from "@/lib/services";
import { toDateInputValue } from "@/lib/dateUtils";
import { DailyTask, DailyTaskPriority, DailyTaskSummary, Employee } from "@/types";

function formatName(emp: { firstName: string; middleName?: string | null; lastName: string }) {
  return [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ");
}

export default function AdminTasksPage() {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [roleFilter, setRoleFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<DailyTaskSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, summaryRes] = await Promise.all([
        dailyTaskApi.getAll(
          selectedDate,
          roleFilter || undefined,
          employeeFilter || undefined
        ),
        dailyTaskApi.getSummary(selectedDate, roleFilter || undefined),
      ]);
      setTasks(tasksRes.data ?? []);
      setSummary(summaryRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, roleFilter, employeeFilter]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    employeeApi
      .getAll(false)
      .then((res) => setEmployees(res.data ?? []))
      .catch(() => setEmployees([]));
  }, []);

  const handleAssignTask = async (data: {
    employeeId: string;
    title: string;
    description: string;
    priority: DailyTaskPriority;
  }) => {
    setAssigning(true);
    setError("");
    setSuccess("");
    try {
      await dailyTaskApi.assign({
        employeeId: data.employeeId,
        title: data.title,
        description: data.description || undefined,
        taskDate: selectedDate,
        priority: data.priority,
      });
      setSuccess("Task assigned successfully.");
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign task");
      throw err;
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteTask = async (task: DailyTask) => {
    if (!task.assignedByAdmin) return;
    if (!window.confirm(`Delete assigned task "${task.title}"?`)) return;

    setDeletingTaskId(task.id);
    setError("");
    setSuccess("");
    try {
      await dailyTaskApi.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setSuccess("Assigned task deleted successfully.");
      const summaryRes = await dailyTaskApi.getSummary(selectedDate, roleFilter || undefined);
      setSummary(summaryRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingTaskId(null);
    }
  };

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

  const emptyHint = employeeFilter
    ? "This employee has no tasks for the selected date."
    : roleFilter
      ? `No employees with the "${roleFilter}" role have tasks for this date.`
      : "Select date, role, and employee above to assign a task, or pick filters to view team tasks.";

  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-6">
        <AdminTasksHero summary={summary} />

        <AdminAssignTaskForm
          employees={employees}
          selectedDate={selectedDate}
          roleFilter={roleFilter}
          employeeId={employeeFilter}
          onDateChange={setSelectedDate}
          onRoleChange={setRoleFilter}
          onEmployeeChange={setEmployeeFilter}
          submitting={assigning}
          onSubmit={handleAssignTask}
        />

        {summary && !employeeFilter && <AdminSummaryGrid summary={summary} />}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {error && <TasksErrorBanner message={error} />}

        {loading ? (
          <TasksLoadingState label="Loading employee tasks..." />
        ) : groupedTasks.length === 0 ? (
          <TasksEmptyState title="No tasks for this selection" hint={emptyHint} />
        ) : (
          <div className="space-y-5">
            {groupedTasks.map((group) => (
              <AdminEmployeeTaskGroup
                key={group.tasks[0]?.employeeId ?? group.name}
                name={group.name}
                role={group.role}
                email={group.email}
                tasks={group.tasks}
                deletingTaskId={deletingTaskId}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
