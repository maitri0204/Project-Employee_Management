"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListTodo } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  EmployeeTasksHero,
  KanbanColumn,
  QuickAddTaskForm,
  TaskCard,
  TaskProgressBar,
  TaskStatGrid,
  DateNavigator,
  TasksErrorBanner,
  TasksLoadingState,
} from "@/components/daily-tasks/DailyTaskComponents";
import { dailyTaskApi } from "@/lib/services";
import { toDateInputValue } from "@/lib/dateUtils";
import { DailyTask } from "@/types";

export default function TasksPage() {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dailyTaskApi.getMy(selectedDate);
      setTasks(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const planned = useMemo(() => tasks.filter((t) => t.status === "PLANNED"), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.status === "COMPLETED"), [tasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await dailyTaskApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        taskDate: selectedDate,
      });
      if (res.data) {
        setTasks((prev) => [...prev, res.data!]);
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (task: DailyTask) => {
    setBusyTaskId(task.id);
    setError("");
    try {
      const nextStatus = task.status === "COMPLETED" ? "PLANNED" : "COMPLETED";
      const res = await dailyTaskApi.update(task.id, { status: nextStatus });
      if (res.data) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <EmployeeTasksHero selectedDate={selectedDate} total={tasks.length} completed={completed.length} />

        <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

        <TaskStatGrid total={tasks.length} planned={planned.length} completed={completed.length} />

        <TaskProgressBar total={tasks.length} completed={completed.length} />

        <QuickAddTaskForm
          title={title}
          description={description}
          submitting={submitting}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onSubmit={handleAddTask}
        />

        {error && <TasksErrorBanner message={error} />}

        {loading ? (
          <TasksLoadingState label="Loading your tasks..." />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <KanbanColumn
              title="Planned"
              count={planned.length}
              tone="planned"
              icon={ListTodo}
              emptyTitle="Nothing planned yet"
              emptyHint="Add your first task above and build your day with intention."
            >
              {planned.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  onToggle={handleToggle}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              title="Completed"
              count={completed.length}
              tone="completed"
              icon={CheckCircle2}
              emptyTitle="No completions yet"
              emptyHint="Tick off tasks as you finish them - they'll land here."
            >
              {completed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  onToggle={handleToggle}
                />
              ))}
            </KanbanColumn>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
