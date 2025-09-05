import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { IPreparedNotification } from "../database/models/notivix/preparedNotification";
import { INotificationTemplate } from "../database/models/notivix/notificationTemplate";
import { findDataSourceById } from "../database/services/common/dataSource.services";
import { findEntityById } from "../database/services/common/entity.services";
import { Queue } from "bullmq";
import  redisConnection  from "../redis-connection";

// ------------------- Attachment Generator -------------------
export async function generateNotificationAttachments(
  notif: IPreparedNotification,
  template: INotificationTemplate
): Promise<{ fileName: string; filePath: string }[]> {
  if (!notif || !template || !template.attachmentSettings?.length) return [];

  const attachments: { fileName: string; filePath: string, isDeleted: boolean }[] = [];

  const todayDate = formatDate(new Date());
  let emailSubject = (template.subject || "Notification").replace("{{todayDate}}", todayDate);
  const sanitizedSubject = emailSubject.replace(/[<>:"/\\|?*]/g, "").trim();

  for (const attachmentSetting of template.attachmentSettings) {
    if (!attachmentSetting?.type) continue;

    if (attachmentSetting.type === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sheet1");

      const dataSource = await findDataSourceById(template.dataSourceId.toString());
      const fieldNames = await getAttachmentFieldNames(attachmentSetting, dataSource?.entityId);

      sheet.columns = fieldNames.map(f => ({ header: f.name, key: f.name }));

      for (const [_, rows] of Object.entries(notif.payload || {})) {
        for (const r of rows as Array<{ rowData: Record<string, any> }>) {
          const row: Record<string, any> = {};
          for (const f of fieldNames) {
            let value = r.rowData[f.name];
            if (f.type === "date" && value) value = formatDate(new Date(value));
            row[f.name] = value;
          }
          sheet.addRow(row);
        }
      }

      const fileName = `${sanitizedSubject}.xlsx`;
      const filePath = path.join(process.cwd(), "tmp", fileName);

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      await workbook.xlsx.writeFile(filePath);

      attachments.push({ fileName, filePath, isDeleted: true });
    } else if ((attachmentSetting.type === "pdf" || attachmentSetting.type === "image")
            && attachmentSetting.filePath && attachmentSetting.fileName) {
            
            const sourcePath = attachmentSetting.filePath;
            if (fs.existsSync(sourcePath)) {
                attachments.push({
                fileName: attachmentSetting.fileName,
                filePath: sourcePath,
                isDeleted: false
                });
            } else {
                console.warn(`⚠️ Attachment file not found: ${sourcePath}`);
            }
        }

}

  return attachments;
}

// ------------------- Template Helpers -------------------
export function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function flattenObject(obj: any, parentKey = "", result: Record<string, any> = {}): Record<string, any> {
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

export function parseTemplate(template: string, context: Record<string, any>): string {
  if (!template) return "";

  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  function expandBlocks(tpl: string, ctx: Record<string, any>): string {
    let out = "", cursor = 0;

    while (true) {
      const eachOpenIdx = tpl.indexOf("{{#each", cursor);
      const ifOpenIdx = tpl.indexOf("{{#if", cursor);

      let nextIdx = -1, type: "each" | "if" | null = null;
      if (eachOpenIdx !== -1 && (ifOpenIdx === -1 || eachOpenIdx < ifOpenIdx)) {
        nextIdx = eachOpenIdx; type = "each";
      } else if (ifOpenIdx !== -1) {
        nextIdx = ifOpenIdx; type = "if";
      }

      if (nextIdx === -1) break;
      out += tpl.slice(cursor, nextIdx);

      const openEnd = tpl.indexOf("}}", nextIdx);
      const tag = tpl.slice(nextIdx + 2, openEnd).trim();

      const openTag = type === "each" ? "{{#each" : "{{#if";
      const closeTag = type === "each" ? "{{/each}}" : "{{/if}}";

      // find matching close for nested blocks
      let depth = 1, searchPos = openEnd + 2, blockCloseIdx = -1;
      while (depth > 0) {
        const nextOpen = tpl.indexOf(openTag, searchPos);
        const nextClose = tpl.indexOf(closeTag, searchPos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) { depth++; searchPos = nextOpen + openTag.length; }
        else { depth--; blockCloseIdx = nextClose; searchPos = nextClose + closeTag.length; }
      }

      let inner = tpl.slice(openEnd + 2, blockCloseIdx);

      if (type === "each") {
        const arrayPath = tag.replace(/^#each\s+/, "").trim();
        const arr = getNestedValue(ctx, arrayPath);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            // merge parent context to allow nested ifs to access outer vars
            out += expandBlocks(inner, { ...ctx, ...item });
          }
        }
      } else if (type === "if") {
        const conditionPath = tag.replace(/^#if\s+/, "").trim();
        const conditionVal = getNestedValue(ctx, conditionPath);

        // split inner by {{else}}
        let [trueBlock, falseBlock] = inner.split("{{else}}");
        trueBlock = trueBlock || "";
        falseBlock = falseBlock || "";

        out += conditionVal ? expandBlocks(trueBlock, ctx) : expandBlocks(falseBlock, ctx);
      }

      cursor = blockCloseIdx + closeTag.length;
    }

    // Replace simple variables {{var}}
    out += tpl.slice(cursor);
    return out.replace(/{{\s*([^#\/][^}]*)\s*}}/g, (_, path) => {
      const val = getNestedValue(ctx, path.trim());
      return val != null ? String(val) : "";
    });
  }

  return expandBlocks(template, context);
}

// ------------------- Misc Helpers -------------------
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
             .replace(/ /g, "-");
}

export function getRecipientName(input: string): string {
  if (!input) return "User";
  if (input.includes("@")) {
    const localPart = input.split("@")[0];
    return capitalize(localPart.split(/[._-]/)[0]);
  }
  const commaParts = input.split(",");
  if (commaParts.length > 1) {
    return capitalize(commaParts[1].trim().split(" ")[0]);
  }
  return capitalize(input.split(" ")[0]);
}

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
}

export function resolveRecipientEmail(realEmail: string): string {
  return process.env.NODE_ENV !== "production" ? "abhishek@innovix-labs.com" : realEmail;
}

export function resolveCcEmails(realCc: string[]): string[] {
  return process.env.NODE_ENV !== "production"
    ? [""]
    : realCc;
}

/**
 * Extracts all field names (flattened) for an attachment setting
 * Uses entity attributes + mapping/reference attributes recursively
 */
export async function getAttachmentFieldNames(
  attachmentSetting: any, // your attachmentSetting object
  entity: any,            // entity containing attributes
): Promise<{ name: string; type: string }[]> {
  const fieldNamesMap = new Map<string, string>(); // key = field name, value = type

  const attributesMap: Record<string, any> = {}; // keyed by ID

  // Build attributesMap
  for (const attr of entity.attributes) {
    attributesMap[attr._id.toString()] = attr; // <-- use ID as key
  }

  async function extractFieldNames(attr: any, prefix = "") {
    const key = prefix ? `${prefix}.${attr.name}` : attr.name;

    // Store name and type
    fieldNamesMap.set(key, attr.type || "string");

    if (attr.referenceEntitySetting?.refEntityId && attr.referenceEntitySetting.relationType?.startsWith("mapping_")) {
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refEntity: any = await findEntityById(refEntityId);
      if (!refEntity?.attributes) return;

      for (const refAttr of refEntity.attributes) {
        const mapKey = `${key}.${refAttr.name}`;
        fieldNamesMap.set(mapKey, refAttr.type || "string");

        if (refAttr.referenceEntitySetting?.relationType?.startsWith("mapping_")) {
          await extractFieldNames(refAttr, key);
        }
      }
    }
  }

  // Use ID lookup
  if (attachmentSetting.fieldList?.length) {
    for (const field of attachmentSetting.fieldList) {
      if (field.attributeId) {
        const attr = attributesMap[field.attributeId.toString()] || null;
        if (attr) {
          await extractFieldNames(attr);
        }
      }
    }
  }

  // Convert Map to array of objects
  return Array.from(fieldNamesMap.entries()).map(([name, type]) => ({ name, type }));
}

// Email queue
export const emailQueue = new Queue("emailQueue", { connection: {
        host: "redis",
    }, });

export async function scheduleEmail(preparedNotification: any) {
  // sentAt is stored in Mongo as UTC
  const sentAtUtc = new Date(preparedNotification.sentAt);

  // Subtract 5h30m to align with IST input
  const sentAtAdjusted = new Date(sentAtUtc.getTime() - 5.5 * 60 * 60 * 1000);

  // Calculate delay from "now"
  const delay = sentAtAdjusted.getTime() - Date.now();

  console.log('sentAt (Mongo UTC):', sentAtUtc.toISOString());
  console.log('sentAt Adjusted (IST matching):', sentAtAdjusted.toISOString());
  console.log('Calculated delay (ms):', delay);

  await emailQueue.add(
    "sendEmail",
    { notificationId: preparedNotification._id },
    {
      jobId: preparedNotification._id.toString(),
      delay: delay > 0 ? delay : 0,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}