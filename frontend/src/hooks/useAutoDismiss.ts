import { useEffect } from "react";

export function useAutoDismiss(
  value: string,
  setValue: (value: string) => void,
  delayMs = 3000
) {
  useEffect(() => {
    if (!value) return;
    const timer = window.setTimeout(() => setValue(""), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, setValue, delayMs]);
}
