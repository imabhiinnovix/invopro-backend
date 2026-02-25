import cron from "node-cron";

export function startCronJobs() {
  console.log(`[${new Date().toISOString()}] Cron service initialized`);
}