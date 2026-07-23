export function toDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Yesterday — latest end date allowed when applying sick leave (SL). */
export function getMaxSlEndDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateInputValue(yesterday);
}

export function isSlLeaveEndDateValid(endDate: string) {
  if (!endDate?.trim()) return true;
  return endDate <= getMaxSlEndDateString();
}

export function isSlLeaveRangeInvalid(startDate: string, endDate: string) {
  if (!endDate?.trim()) return false;
  const maxEnd = getMaxSlEndDateString();
  if (endDate > maxEnd) return true;
  if (startDate?.trim() && startDate > maxEnd) return true;
  return false;
}
