import { Worker } from "bullmq";
import connection from "../redis-connection";
import { processNotification } from "../database/services/notivix/notificationTriggerService";
import { getPreparedNotification } from "../database/services/notivix/preparedNotification.service";

// ✅ Email Worker
const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    if (job.name === "sendEmail") {
      const { notificationId } = job.data;

      // 🔍 Fetch notification from DB
      const notification = await getPreparedNotification(notificationId, [
        "templateId",
        "frequencySettingId",
        "notificationTriggerId",
        "acknowledgeId",
      ]);

      console.log(`📧 Sending email for notification ${notificationId}`);

      // 👉 Use your actual email sending logic here
      await processNotification(notification);
    }
  },
  {
    connection: {
      host: 'redis',
    }, // ✅ correct key
  }
);

export default emailWorker;
