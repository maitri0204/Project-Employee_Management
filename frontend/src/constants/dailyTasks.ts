import { DailyTaskPriority } from "@/types";

export const DAILY_TASK_PRIORITY_OPTIONS: {
  value: DailyTaskPriority;
  label: string;
}[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "IMPORTANT", label: "Important" },
  { value: "URGENT_AND_IMPORTANT", label: "Urgent & Important" },
  { value: "IMPORTANT_NOT_URGENT", label: "Important but not urgent" },
];

export const DAILY_TASK_PRIORITY_STYLES: Record<
  DailyTaskPriority,
  { badge: "danger" | "warning" | "default" | "success"; className: string }
> = {
  URGENT: { badge: "danger", className: "bg-red-100 text-red-800 border-red-200" },
  IMPORTANT: { badge: "warning", className: "bg-amber-100 text-amber-900 border-amber-200" },
  URGENT_AND_IMPORTANT: {
    badge: "danger",
    className: "bg-rose-100 text-rose-900 border-rose-200",
  },
  IMPORTANT_NOT_URGENT: {
    badge: "default",
    className: "bg-sky-100 text-sky-900 border-sky-200",
  },
};

export function getDailyTaskPriorityLabel(priority?: DailyTaskPriority | null) {
  return DAILY_TASK_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? "";
}
