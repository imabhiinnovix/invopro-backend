import { Worker } from "bullmq";
import mongoose from "mongoose";
import { processNotification } from "../database/services/notivix/notificationTriggerService";
import { getPreparedNotification } from "../database/services/notivix/preparedNotification.service";

// ✅ Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://mongo:27017/reportivix", {
        dbName: "reportivix",
      });
      console.log("✅ Worker connected to MongoDB");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    }
  }
}

// ✅ Start worker immediately
(async () => {
  await connectDB();

  const emailWorker = new Worker(
    "emailQueue",
    async (job) => {
      if (job.name === "sendEmail") {
        const { notificationId } = job.data;
        console.log("📨 notificationId:", notificationId);

        const notification = await getPreparedNotification(notificationId, [
          "templateId",
          "frequencySettingId",
          "notificationTriggerId",
          "acknowledgeId",
        ]);

        if (!notification) {
          throw new Error(`❌ Notification ${notificationId} not found`);
        }

        console.log(`📧 Sending email for notification ${notificationId}`);
        await processNotification(notification);
      }
    },
    {
      connection: {
        host: "redis",
      },
    }
  );

  console.log("✅ Email worker started");
})();