import app from "./app";
import { config } from "./config/env";
import { startLeaveAccrualScheduler } from "./jobs/leaveScheduler";
import { refreshHolidayCache, seedDefaultHolidaysIfEmpty } from "./services/holiday.service";

async function startServer() {
  try {
    const seeded = await seedDefaultHolidaysIfEmpty();
    if (seeded > 0) {
      console.log(`Seeded ${seeded} default company holidays.`);
    }
    await refreshHolidayCache();
  } catch (error) {
    console.error("Holiday cache initialization failed:", error);
  }

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    startLeaveAccrualScheduler();
  });
}

void startServer();
