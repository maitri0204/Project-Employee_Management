type LeaveNotificationBadgeProps = {
  count: number;
  className?: string;
  pulse?: boolean;
};

export default function LeaveNotificationBadge({
  count,
  className = "",
  pulse = false,
}: LeaveNotificationBadgeProps) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white ${pulse ? "animate-pulse" : ""} ${className}`}
      aria-label={`${count} pending leave request${count === 1 ? "" : "s"}`}
    >
      {label}
    </span>
  );
}
