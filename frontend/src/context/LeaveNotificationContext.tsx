"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminRole } from "@/lib/roles";

type LeaveNotificationContextType = {
  pendingCount: number;
  /** Increments on each SSE update so pages can refetch lists. */
  revision: number;
};

const LeaveNotificationContext = createContext<LeaveNotificationContextType>({
  pendingCount: 0,
  revision: 0,
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function LeaveNotificationProvider({ children }: { children: ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (isLoading || !isAdminRole(user?.role) || !token) {
      setPendingCount(0);
      return;
    }

    const url = `${API_BASE}/leaves/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { pendingCount?: number };
        if (typeof data.pendingCount === "number") {
          setPendingCount(data.pendingCount);
          setRevision((value) => value + 1);
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [isLoading, user?.role, token]);

  return (
    <LeaveNotificationContext.Provider value={{ pendingCount, revision }}>
      {children}
    </LeaveNotificationContext.Provider>
  );
}

export function useLeaveNotifications() {
  return useContext(LeaveNotificationContext);
}
