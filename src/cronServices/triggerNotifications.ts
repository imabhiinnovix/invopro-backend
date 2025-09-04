import mongoose from "mongoose";
import PreparedNotification, { IPreparedNotification } from "../database/models/notivix/preparedNotification";
import "../database/models/notivix/notificationFrequencySetting";
import "../database/models/notivix/notificationTemplate";
import "../database/models/notivix/notificationTrigger";
import "../database/models/notivix/notificationAcknowledge";
import { processNotification } from "../database/services/notivix/notificationTriggerService";

export async function triggerPreparedNotifications() {
  const conn = await mongoose.connect(process.env.MONGO_URI!);
  console.info(`MongoDB Connected: ${conn.connection.host}`);

  try {
    const notifications: IPreparedNotification[] = await PreparedNotification.find({ status: "pending" })
      .populate("templateId")
      .populate("frequencySettingId")
      .populate("notificationTriggerId")
      .populate("acknowledgeId");

    console.log(`📬 Preparing to send ${notifications.length} notifications`);

    for (const notif of notifications) {
      await processNotification(notif);
    }
  } catch (err) {
    console.error("❌ Error running prepared notification cron:", err);
  }
}

// Run directly if executed as standalone script
triggerPreparedNotifications();
