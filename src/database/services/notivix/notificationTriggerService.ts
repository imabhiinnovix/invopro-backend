import { IPreparedNotification } from "../../../database/models/notivix/preparedNotification";
import { INotificationTemplate } from "../../../database/models/notivix/notificationTemplate";
import { sendToQueue } from "./emailQueue.service";
import {
  generateNotificationAttachments,
  flattenObject,
  formatDate,
  getRecipientName,
  parseTemplate,
  resolveCcEmails,
  resolveRecipientEmail,
} from "../../../utils/notification.utils";

/**
 * Process a single prepared notification
 */
export async function processNotification(notif: IPreparedNotification, extraContext?: Record<string, any>): Promise<void> {
  try {
    const template = notif.templateId as unknown as INotificationTemplate | null;
    const freqSetting = notif.frequencySettingId as any;
    const trigger = notif.notificationTriggerId as any;
    const acknowledge = notif.acknowledgeId as any;

    if (!template || !freqSetting) {
      console.warn(`⚠️ Notification ${notif._id} missing template or frequency setting. Skipping.`);
      return;
    }

    const todayDate = formatDate(new Date());
    const lastUploadedDate = trigger?.actionsLastUploadedDate
      ? formatDate(new Date(trigger.actionsLastUploadedDate))
      : null;

    // Generate attachments if required
    const attachments = freqSetting.attachmentRequired
      ? await generateNotificationAttachments(notif, template)
      : [];

    let realRecipientTo: string[] = notif.recipients?.recipient_to || [];
    let realRecipientCc: string[] = notif.recipients?.recipient_cc || [];  
    if(extraContext?.acknowledgeEmail == true){
        realRecipientTo = acknowledge.recipients?.recipient_to;
        realRecipientCc = acknowledge.recipients?.recipient_cc;
    }
    
    if (realRecipientTo.length === 0 && realRecipientCc.length === 0) {
      console.warn(`⚠️ Notification ${notif._id} has no recipients. Skipping.`);
      return;
    }

    // SINGLE template
    if (template.type === "single") {
      const rowKey = Object.keys(notif.payload || {})[0];
      const rowData = notif.payload[rowKey]?.[0]?.rowData || {};
      const baseContext: Record<string, any> = { ...rowData, todayDate, lastUploadedDate, acknowledgeIdentifierKey: acknowledge?.identifierKey, acknowledgeId: acknowledge?._id, baseFrontendUrl: process.env.BASE_FRONTEND_URL, DaysRemaining: null, DaysPassed: null };
      // merge extraContext if provided
      if (extraContext) Object.assign(baseContext, extraContext);

      // if (baseContext.DueDate) baseContext.DueDate = formatDate(new Date(baseContext.DueDate));

      if (baseContext.DueDate) {
        const dueDate = new Date(baseContext.DueDate);
        baseContext.DueDate = formatDate(dueDate);

        const diffDays = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
        if (diffDays < 0) {
          baseContext.DaysRemaining = Math.abs(diffDays);
        } else {
          baseContext.DaysPassed = diffDays;
        }
      }

      for (const realTo of realRecipientTo) {
        const context = { ...baseContext, recipientName: getRecipientName(realTo) };
        const subject = parseTemplate(template.subject, context);
        const body = parseTemplate(template.body, context);
        await sendToQueue({
          to: [resolveRecipientEmail(realTo)],
          cc: resolveCcEmails(realRecipientCc),
          subject,
          body,
          attachments,
          notificationId: notif._id,
        });
      }
    }

    // OVERALL template
    else if (template.type === "overall") {
      const groups: Array<{ groupKey: string; rows: Record<string, any>[] }> = [];
      let firstRow: Record<string, any> | null = null;

      for (const [groupKey, rows] of Object.entries(notif.payload || {})) {
        const rowArray = rows as Array<{ rowData: Record<string, any> }>;
        if (!firstRow && rowArray.length > 0) {
          firstRow = flattenObject(rowArray[0].rowData);
        }

        groups.push({
          groupKey,
          rows: rowArray.map(r => {
            const rd = r.rowData || {};
            const flattened = flattenObject(rd);
            const dueDate = rd.DueDate ? new Date(rd.DueDate) : null;
            // const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
            let DaysRemaining: number | null = null;
            let DaysPassed: number | null = null;
            if (dueDate) {
              const diffDays = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
              if (diffDays < 0) DaysRemaining = Math.abs(diffDays);
              else DaysPassed = diffDays;
            }

            return {
              ...flattened,
              DaysRemaining,
              DaysPassed,
              AssignedTo: rd.Assignedto || "-",
              DueDate: dueDate ? formatDate(dueDate) : null
            };
          }),
        });
      }

      const baseContext = { ...(firstRow || {}), groups, todayDate, lastUploadedDate, acknowledgeIdentifierKey: acknowledge?.identifierKey, acknowledgeId: acknowledge?._id, baseFrontendUrl: process.env.BASE_FRONTEND_URL };
      // merge extraContext if provided
      if (extraContext) Object.assign(baseContext, extraContext);

      for (const realTo of realRecipientTo) {
        const context = { ...baseContext, recipientName: getRecipientName(realTo) };
        console.log('context',context);
        const subject = parseTemplate(template.subject, context);
        const body = parseTemplate(template.body, context);
        await sendToQueue({
          to: [resolveRecipientEmail(realTo)],
          cc: resolveCcEmails(realRecipientCc),
          subject,
          body,
          attachments,
          notificationId: notif._id,
        });
      }
    }

    // Mark notification as sent
    notif.status = extraContext?.acknowledgeEmail == true ? "acknowledged" : "sent";
    notif.lastAttemptAt = new Date();
    notif.attachmentPaths = attachments;
    await notif.save();

  } catch (err) {
    console.error(`❌ Failed to process notification ${notif._id}:`, err);
    notif.status = "failed";
    notif.error = err;
    notif.lastAttemptAt = new Date();
    await notif.save();
  }
}