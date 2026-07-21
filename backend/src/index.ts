import app from "./app";
import { config } from "./config/env";
import { startLeaveAccrualScheduler } from "./jobs/leaveScheduler";

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  startLeaveAccrualScheduler();
});
