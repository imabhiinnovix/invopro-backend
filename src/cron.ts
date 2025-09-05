import cron from "node-cron";
import { prepareTodayNotifications } from "./cronServices/prepareNotificationsForSlot";

export function startCronJobs() {
  console.log(`[${new Date().toISOString()}] Cron service initialized`);

  // ✅ Run every day at 1 AM server time
  cron.schedule("0 1 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Starting prepareTodayNotifications job...`);

    try {
      await prepareTodayNotifications();
      console.log(`[${new Date().toISOString()}] Completed prepareTodayNotifications job`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Cron job error:`, err);
    }
  });
}