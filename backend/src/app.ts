import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config/env";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import leaveRoutes from "./routes/leave.routes";
import leavePolicyRoutes from "./routes/leavePolicy.routes";
import hrPolicyRoutes from "./routes/hrPolicy.routes";
import calendarRoutes from "./routes/calendar.routes";
import dailyTaskRoutes from "./routes/dailyTask.routes";
import holidayRoutes from "./routes/holiday.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Employee Management API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-policy", leavePolicyRoutes);
app.use("/api/hr-policy", hrPolicyRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/daily-tasks", dailyTaskRoutes);
app.use("/api/holidays", holidayRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
