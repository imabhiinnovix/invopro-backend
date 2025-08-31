import mongoose from "mongoose";
import PreparedNotification, { IPreparedNotification } from "../database/models/notivix/preparedNotification";
import NotificationTemplate, { INotificationTemplate } from "../database/models/notivix/notificationTemplate";
import { sendToQueue } from "./emailQueue";
import config from '../config';
import "../database/models/notivix/notificationTemplate";


// ------------------- Helpers -------------------

/**
 * Simple Handlebars-like parser
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;

  // 1. Literal key check
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    console.log(`🔍 Literal match for "${path}" →`, obj[path]);
    return obj[path];
  }

  // 2. Dot notation fallback
  let result = path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return acc[key];
    }
    return undefined;
  }, obj);

  console.log(`🔍 Dot match for "${path}" →`, result);
  return result;
}

function flattenObject(obj: any, parentKey = "", result: Record<string, any> = {}): Record<string, any> {
  if (!obj || typeof obj !== "object") return result;
  for (const key of Object.keys(obj)) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      flattenObject(obj[key], newKey, result);
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

function parseTemplate(template: string, context: Record<string, any>): string {
  if (!template) return "";

  function expandEach(tpl: string, ctx: Record<string, any>): string {
    let out = "";
    let cursor = 0;

    while (true) {
      const openIdx = tpl.indexOf("{{#each", cursor);
      if (openIdx === -1) break;

      out += tpl.slice(cursor, openIdx);

      const openEnd = tpl.indexOf("}}", openIdx);
      const tag = tpl.slice(openIdx + 2, openEnd).trim();
      const arrayPath = tag.replace(/^#each\s+/, "").trim();

      let depth = 1;
      let searchPos = openEnd + 2;
      let blockCloseIdx = -1;

      while (depth > 0) {
        const nextOpen = tpl.indexOf("{{#each", searchPos);
        const nextClose = tpl.indexOf("{{/each}}", searchPos);
        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 7;
        } else {
          depth--;
          blockCloseIdx = nextClose;
          searchPos = nextClose + 9;
        }
      }

      const inner = tpl.slice(openEnd + 2, blockCloseIdx);
      const arr = getNestedValue(ctx, arrayPath);

      if (Array.isArray(arr)) {
        for (const item of arr) {
          out += expandEach(inner, item); // recursion
        }
      }

      cursor = blockCloseIdx + 9;
    }

    // After processing all each loops, replace vars in this scope
    out += tpl.slice(cursor);
    return out.replace(/{{\s*([^#\/][^}]*)\s*}}/g, (_, path) => {
      const val = getNestedValue(ctx, path.trim());
      return val != null ? String(val) : "";
    });
  }

  return expandEach(template, context);
}


// 🔧 Utility: format today's date
function formatDate(date): string {
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-"); // e.g. "30-Aug-2025"
}


/**
 * Extracts a friendly recipient name from email or full name.
 * @param input - email or full name string
 * @returns first name or fallback string
 */
export function getRecipientName(input: string): string {
  if (!input) return "User";

  // Case 1: If input contains '@', treat as email
  if (input.includes("@")) {
    const localPart = input.split("@")[0];
    const nameParts = localPart.split(/[._-]/); // split on ., _, -
    return capitalize(nameParts[0]);
  }

  // Case 2: If input is a full name with comma
  // Example: "Chakravarti, Aditya (IND-TEC) (700004507)"
  const commaParts = input.split(",");
  if (commaParts.length > 1) {
    const firstNamePart = commaParts[1].trim().split(" ")[0]; // take first word after comma
    return capitalize(firstNamePart);
  }

  // Case 3: Fallback to first word
  return capitalize(input.split(" ")[0]);
}

/**
 * Capitalizes first letter
 */
function capitalize(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function resolveRecipientEmail(realEmail: string): string {
  return "abhishek@innovix-labs.com";
  if (process.env.NODE_ENV !== "production") {
    return "abhishek@innovix-labs.com"; // local/dev override
  }
  return realEmail; // production uses actual email
}

function resolveCcEmails(realCc: string[]): string[] {
  return ["siddharth@innovix-labs.com", "kishan@innovix-labs.com"];
  if (process.env.NODE_ENV !== "production") {
    return [""]; // local/dev CC (can be multiple test emails)
  }
  return realCc;
}



export async function triggerPreparedNotifications() {
  const conn = await mongoose.connect(process.env.MONGO_URI!);
  console.info(`MongoDB Connected: ${conn.connection.host}`);

  try {
    const notifications: IPreparedNotification[] = await PreparedNotification.find({
      status: "pending",
    }).populate("templateId");

    console.log(`📬 Preparing to send ${notifications.length} notifications`);

    const todayDate = formatDate(new Date());

    for (const notif of notifications) {
      try {
        const template = notif.templateId as unknown as INotificationTemplate | null;
        if (!template) {
          console.warn(`⚠️ Notification ${notif._id} has no template. Skipping.`);
          continue;
        }

        // Real recipients
        const realRecipientTo: string[] = notif.recipients?.recipient_to || [];
        const realRecipientCc: string[] = notif.recipients?.recipient_cc || [];

        if (realRecipientTo.length === 0 && realRecipientCc.length === 0) {
          console.warn(`⚠️ Notification ${notif._id} has no recipients. Skipping.`);
          continue;
        }

        // SINGLE type template
        if (template.type === "single") {
          const rowKey = Object.keys(notif.payload || {})[0];
          const rowData = notif.payload[rowKey]?.[0]?.rowData || {};
          const baseContext = { ...rowData, todayDate };

          if (baseContext.DueDate) baseContext.DueDate = formatDate(new Date(baseContext.DueDate));

          for (const realTo of realRecipientTo) {
            const toEmail = resolveRecipientEmail(realTo);
            const ccEmails = resolveCcEmails(realRecipientCc);
            const context = { ...baseContext, recipientName: getRecipientName(realTo) };
            const subject = parseTemplate(template.subject, context);
            const body = parseTemplate(template.body, context);

            await sendToQueue({
              to: [toEmail],
              cc: ccEmails,
              subject,
              body,
              notificationId: notif._id,
            });
          }
        }

        // OVERALL type template
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
                const daysRemaining = dueDate
                  ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return {
                  ...flattened,
                  DaysRemaining: daysRemaining,
                  AssignedTo: rd.Assignedto || "-",
                  DueDate: dueDate ? formatDate(dueDate) : null,
                };
              }),
            });
          }

          const baseContext = { ...(firstRow || {}), groups, todayDate };

          for (const realTo of realRecipientTo) {
            const toEmail = resolveRecipientEmail(realTo);
            const ccEmails = resolveCcEmails(realRecipientCc);
            const context = { ...baseContext, recipientName: getRecipientName(realTo) };
            const subject = parseTemplate(template.subject, context);
            const body = parseTemplate(template.body, context);

            console.log(`✉️ Sending to ${toEmail}: ${subject}`);
            await sendToQueue({
              to: [toEmail],
              cc: ccEmails,
              subject,
              body,
              notificationId: notif._id,
            });
          }

          console.log(`✅ Overall notification queued: ${notif._id}`);
        }

        notif.status = "sent";
        notif.lastAttemptAt = new Date();
        await notif.save();
      } catch (err) {
        console.error(`❌ Failed to queue notification ${notif._id}:`, err);
        notif.status = "failed";
        notif.error = err;
        notif.lastAttemptAt = new Date();
        await notif.save();
      }
    }
  } catch (err) {
    console.error("❌ Error running prepared notification cron:", err);
  }
}


// Optional: run immediately if executed directly
  triggerPreparedNotifications();