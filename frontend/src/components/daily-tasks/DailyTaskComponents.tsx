"use client";

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { formatDisplayDate, toDateInputValue } from "@/lib/dateUtils";
import { JOB_ROLES } from "@/constants/employee";
import { DailyTask, DailyTaskSummary } from "@/types";
import { Badge, Button, Input, Select, Textarea } from "@/components/ui";

export function shiftDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  next.setDate(next.getDate() + days);
  return toDateInputValue(next);
}

export function TaskProgressRing({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold text-white">{clamped}%</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100">done</p>
      </div>
    </div>
  );
}

export function EmployeeTasksHero({
  selectedDate,
  total,
  completed,
}: {
  selectedDate: string;
  total: number;
  completed: number;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isToday = selectedDate === toDateInputValue();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-6 shadow-xl sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {isToday ? "Today's workspace" : "Daily workspace"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Daily Tasks</h1>
          <p className="mt-2 text-sm leading-relaxed text-blue-100 sm:text-base">
            Plan your priorities, track progress, and celebrate completions. Your manager can follow along in real time.
          </p>
          <p className="mt-4 text-sm font-medium text-white/90">{formatDisplayDate(selectedDate)}</p>
        </div>

        <div className="flex items-center gap-5">
          <TaskProgressRing percent={percent} />
          <div className="hidden space-y-2 sm:block">
            <div className="rounded-2xl bg-white/15 px-4 py-2 backdrop-blur">
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-blue-100">Total tasks</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-2 backdrop-blur">
              <p className="text-2xl font-bold text-emerald-200">{completed}</p>
              <p className="text-xs text-blue-100">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTasksHero({ summary }: { summary: DailyTaskSummary | null }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 shadow-xl sm:p-8">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
            <Users className="h-3.5 w-3.5" />
            Team overview
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Employee Daily Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
            Monitor what your team planned for the day and how much they have finished.
          </p>
        </div>
        {summary && (
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{summary.totals.employees}</p>
              <p className="text-xs text-slate-400">Active today</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-cyan-300">{summary.totals.completed}</p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DateNavigator({
  selectedDate,
  onChange,
}: {
  selectedDate: string;
  onChange: (date: string) => void;
}) {
  const isToday = selectedDate === toDateInputValue();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(shiftDate(selectedDate, -1))}
          className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(toDateInputValue())}
          disabled={isToday}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-default disabled:opacity-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onChange(shiftDate(selectedDate, 1))}
          className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:min-w-[240px]">
        <Calendar className="hidden h-5 w-5 text-blue-500 sm:block" />
        <Input
          label="Pick a date"
          type="date"
          value={selectedDate}
          onChange={(e) => onChange(e.target.value)}
          className="mb-0"
        />
      </div>
    </div>
  );
}

export function TaskStatGrid({ total, planned, completed }: { total: number; planned: number; completed: number }) {
  const items = [
    { label: "Total", value: total, icon: ListTodo, tone: "from-slate-500 to-slate-700", bg: "bg-slate-50" },
    { label: "Planned", value: planned, icon: Target, tone: "from-amber-500 to-orange-500", bg: "bg-amber-50" },
    { label: "Completed", value: completed, icon: CheckCircle2, tone: "from-emerald-500 to-teal-500", bg: "bg-emerald-50" },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 ${item.bg} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
        >
          <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${item.tone} p-2.5 text-white shadow`}>
            <item.icon className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{item.value}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function TaskProgressBar({ total, completed }: { total: number; completed: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Daily progress</p>
        <span className="text-sm font-bold text-blue-600">{percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {completed} of {total} tasks completed
      </p>
    </div>
  );
}

export function QuickAddTaskForm({
  title,
  description,
  submitting,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: {
  title: string;
  description: string;
  submitting: boolean;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 shadow-sm">
      <div className="border-b border-blue-100/80 bg-blue-600/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 text-white shadow">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add a new task</h2>
            <p className="text-xs text-slate-500">What will you focus on today?</p>
          </div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <Input
          label="Task title"
          placeholder="e.g. Finish client report, team standup, code review..."
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />
        <Textarea
          label="Notes (optional)"
          placeholder="Add context, links, or sub-steps"
          rows={2}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <Button type="submit" disabled={submitting || !title.trim()} className="gap-2 shadow-md">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add to today's plan
        </Button>
      </form>
    </div>
  );
}

export function TaskCard({
  task,
  busy,
  onToggle,
  onDelete,
}: {
  task: DailyTask;
  busy: boolean;
  onToggle: (task: DailyTask) => void;
  onDelete?: (task: DailyTask) => void;
}) {
  const completed = task.status === "COMPLETED";

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        completed
          ? "border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40"
          : "border-slate-200/80 hover:border-blue-200"
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          completed ? "bg-gradient-to-b from-emerald-400 to-teal-500" : "bg-gradient-to-b from-amber-400 to-orange-500"
        }`}
      />

      <div className="flex items-start gap-3 pl-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(task)}
          className={`mt-0.5 shrink-0 rounded-full p-0.5 transition-transform hover:scale-110 ${
            completed ? "text-emerald-600" : "text-slate-300 hover:text-blue-600"
          }`}
          title={completed ? "Mark as planned" : "Mark as completed"}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          ) : completed ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <Circle className="h-7 w-7" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={`text-sm font-semibold leading-snug sm:text-base ${
                completed ? "text-emerald-900 line-through decoration-emerald-400/60" : "text-slate-900"
              }`}
            >
              {task.title}
            </p>
            <Badge variant={completed ? "success" : "warning"}>
              {completed ? "Done" : "Planned"}
            </Badge>
          </div>
          {task.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{task.description}</p>
          )}
          {completed && task.completedAt && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              {new Date(task.completedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {onDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(task)}
            className="shrink-0 rounded-xl p-2 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

export function KanbanColumn({
  title,
  count,
  tone,
  emptyTitle,
  emptyHint,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  tone: "planned" | "completed";
  emptyTitle: string;
  emptyHint: string;
  icon: typeof ListTodo;
  children: React.ReactNode;
}) {
  const headerClass =
    tone === "planned"
      ? "from-amber-500 to-orange-500"
      : "from-emerald-500 to-teal-500";
  const shellClass =
    tone === "planned"
      ? "border-amber-100 bg-amber-50/30"
      : "border-emerald-100 bg-emerald-50/20";

  return (
    <section className={`rounded-3xl border p-4 sm:p-5 ${shellClass}`}>
      <div className={`mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r ${headerClass} px-4 py-3 text-white shadow`}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{count}</span>
      </div>

      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center">
          <Icon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">{emptyTitle}</p>
          <p className="mt-1 text-xs text-slate-500">{emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

export function AdminSummaryGrid({ summary }: { summary: DailyTaskSummary }) {
  const items = [
    { label: "Employees", value: summary.totals.employees, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total tasks", value: summary.totals.tasks, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Planned", value: summary.totals.planned, icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Completed", value: summary.totals.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl border border-slate-200/80 ${item.bg} p-4 shadow-sm`}>
          <div className={`mb-2 inline-flex rounded-lg bg-white p-2 shadow-sm ${item.color}`}>
            <item.icon className="h-4 w-4" />
          </div>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs font-medium text-slate-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.charAt(0).toUpperCase() || "?";
}

export function AdminEmployeeTaskGroup({
  name,
  role,
  email,
  tasks,
}: {
  name: string;
  role?: string | null;
  email?: string;
  tasks: DailyTask[];
}) {
  const planned = tasks.filter((t) => t.status === "PLANNED");
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const percent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow">
              {getInitials(name)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{name}</h3>
              <p className="text-xs text-slate-500">{[role, email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{planned.length} planned</Badge>
            <Badge variant="success">{completed.length} done</Badge>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{percent}%</span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {tasks.map((task) => {
          const done = task.status === "COMPLETED";
          return (
            <div key={task.id} className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50/80">
              <div
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? "text-emerald-900 line-through" : "text-slate-900"}`}>
                  {task.title}
                </p>
                {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
              </div>
              <Badge variant={done ? "success" : "warning"}>{done ? "Completed" : "Planned"}</Badge>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function AdminFiltersBar({
  selectedDate,
  roleFilter,
  onDateChange,
  onRoleChange,
}: {
  selectedDate: string;
  roleFilter: string;
  onDateChange: (date: string) => void;
  onRoleChange: (role: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Filters</p>
          <p className="text-xs text-slate-500">{formatDisplayDate(selectedDate)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="Date" type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} />
        <Select label="Role" value={roleFilter} onChange={(e) => onRoleChange(e.target.value)}>
          <option value="">All roles</option>
          {JOB_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function TasksEmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ClipboardList className="h-8 w-8" />
      </div>
      <p className="mt-4 text-lg font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export function TasksLoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="mt-3 text-sm font-medium">{label}</p>
    </div>
  );
}

export function TasksErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 shadow-sm">
      {message}
    </div>
  );
}
