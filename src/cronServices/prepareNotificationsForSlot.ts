import { Types } from "mongoose";
import NotificationFrequencySetting from "../database/models/notivix/notificationFrequencySetting";
import NotificationAcknowledge from "../database/models/notivix/notificationAcknowledge";
import PreparedNotification from "../database/models/notivix/preparedNotification";
import NotificationTriggerModel from "../database/models/notivix/notificationTrigger";
import { getModelForEntity } from "../utils/entity.utils";
import { findEntityById } from "../database/services/common/entity.services";
import createDefaultDataSourceVersionModel from "../database/models/common/defaultDataSourceVersionModel";

// Combine Date and Time string to Date object
function combineDateAndTime(date: Date, triggerTime?: string): Date {
  const combined = new Date(date);
  if (!triggerTime) {
    combined.setHours(9, 0, 0, 0); // Default 09:00
    return combined;
  }
  const parts = triggerTime.trim().split(" ");
  let [hours, minutes] = parts[0].split(":").map(Number);
  const meridian = parts[1]?.toUpperCase();

  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  combined.setHours(hours, minutes || 0, 0, 0);
  return combined;
}

// Check if frequency setting is due today
function isDueToday(setting: any, today: Date): boolean {
  const start: any = setting.schedulerStartDate ? new Date(setting.schedulerStartDate) : null;
  const end: any = setting.schedulerEndDate ? new Date(setting.schedulerEndDate) : null;
  if (start && today < start) return false;
  if (end && today > end) return false;

  const dow = today.getDay();
  const dom = today.getDate();
  const month = today.getMonth() + 1;

  switch (setting.frequency) {
    case "once":
      return start && today.toDateString() === start.toDateString();
    case "daily":
      return true;
    case "weekly":
      return setting.daysOfWeek?.includes(dow);
    case "monthly":
      return setting.dayOfMonth?.includes(dom);
    case "yearly":
      return setting.monthOfYear === month && setting.dayOfYearMonth === dom;
    case "custom":
      if (start && setting.interval > 1) {
        const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
        return diffDays % setting.interval === 0;
      }
      return true;
    default:
      return false;
  }
}

// Replace placeholders (basic, extendable)
function replacePlaceholders(templateString: string, caseData: any) {
  return templateString.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const value = key.trim().split(".").reduce((acc, part) => acc?.[part], caseData);
    return value ?? "";
  });
}

// Build payload for notification, supports single or grouped cases
function buildPayload(template: any, caseData: any, notifType: any, acknowledgeId?: Types.ObjectId) {
  let body = "";

  if (template.type === "single") {
    body = replacePlaceholders(template.body || "", caseData);
  } else if (template.type === "overall") {
    // Example: Create summary text for group, customize as needed
    const groupCases = caseData.groupCases || [];
    const count = groupCases.length;
    body = `This notification summarizes ${count} cases.\n\n`;

    // Optionally append grouped case details or a summary table
    const caseIds = groupCases.map((c: any) => c._id.toString()).join(", ");
    body += `Cases: ${caseIds}`;
  } else {
    // fallback
    body = replacePlaceholders(template.body || "", caseData);
  }

  if (notifType?.requiresAcknowledgment && acknowledgeId) {
    const ackLink = `${process.env.APP_BASE_URL || "https://yourapp.com"}/notifications/acknowledge/${acknowledgeId}`;
    body += `\n\nPlease acknowledge this notification: ${ackLink}`;
  }

  const attachments = (template.attachmentSettings || []).map((att: any) => ({
    name: replacePlaceholders(att.fileName || "", caseData),
    url: "", // Add URL generation logic if applicable
    type: att.type || "file",
  }));

  return { subject: replacePlaceholders(template.subject || "", caseData), body, attachments };
}

// Resolve recipients based on notificationType config
function resolveRecipients(caseData: any, notifType: any) {
  const to = (notifType.recipient_to || []).map((field: string) => caseData[field]).filter(Boolean);
  const cc = (notifType.recipient_cc || []).map((field: string) => caseData[field]).filter(Boolean);
  return { to, cc };
}

// Build filters from notification conditions
async function buildFiltersFromConditions(conditions: any[], attributeMap: Map<string, any>): Promise<Record<string, any>> {
  const filters: Record<string, any> = {};

  for (const cond of conditions) {
    const attr = attributeMap.get(String(cond.attributeId));
    if (!attr) continue;

    let fieldPath = attr.name;

    if (cond.refAttributeId && cond.refAttributeId.length > 0) {
      let currentEntityId = attr.referenceEntitySetting?.refEntityId?.toString();
      let mappedName = attr.name || "Unknown";

      for (const refAttrId of cond.refAttributeId) {
        const refEntity = await findEntityById(currentEntityId);
        const refAttr = refEntity?.attributes?.find((a: any) => String(a._id) === String(refAttrId));
        if (!refAttr) break;
        mappedName += `.${refAttr.name}`;
        currentEntityId = refAttr.referenceEntitySetting?.refEntityId?.toString();
      }
      fieldPath = mappedName;
    }

    let mongoCond: any;
    switch (cond.operator) {
      case "equals":
        mongoCond = cond.value;
        break;
      case "in":
        mongoCond = { $in: Array.isArray(cond.value) ? cond.value : [cond.value] };
        break;
      case "not_in":
        mongoCond = { $nin: Array.isArray(cond.value) ? cond.value : [cond.value] };
        break;
      case "exists":
        mongoCond = { $exists: true, $ne: null };
        break;
      case "not_exists":
        mongoCond = { $in: [null, undefined] };
        break;
      case "lt":
      case "lte":
      case "gt":
      case "gte":
        const numVal = Number(cond.value);
        if (cond.timeUnit && !isNaN(numVal)) {
          const now = new Date();
          const multiplier =
            cond.timeUnit === "days"
              ? 24 * 60 * 60 * 1000
              : cond.timeUnit === "hours"
              ? 60 * 60 * 1000
              : cond.timeUnit === "minutes"
              ? 60 * 1000
              : 1000;
          const targetDate = new Date(now.getTime() + numVal * multiplier);
          mongoCond = { [`$${cond.operator}`]: targetDate };
        } else {
          mongoCond = { [`$${cond.operator}`]: cond.value };
        }
        break;
      default:
        mongoCond = cond.value;
    }

    filters[fieldPath] = mongoCond;
  }

  return filters;
}

// Batch fetch matching cases with lookups and flattening
async function processBatchedMatchingCases({
  schemaName,
  entityId,
  filters = {},
  batchSize = 100,
  processBatch,
}: {
  schemaName: string;
  entityId: string;
  filters?: Record<string, any>;
  batchSize?: number;
  processBatch: (cases: any[]) => Promise<void>;
}) {
  const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);
  const entity: any = await findEntityById(entityId);
  const attributesMap: Record<string, any> = entity.attributes.reduce((acc, attr) => {
    acc[attr.name] = attr;
    return acc;
  }, {});

  let skip = 0;
  while (true) {
    const aggregationPipeline: any[] = [];

    for (const [attrName, attr] of Object.entries(attributesMap)) {
      if (attr.referenceEntitySetting?.refEntityId) {
        const refEntityId = attr.referenceEntitySetting.refEntityId;
        const localField = `rowData.${attrName}`;
        const asField = `rowData.${attrName}_resolved`;
        const refModel = await getModelForEntity(refEntityId);

        aggregationPipeline.push({
          $lookup: {
            from: refModel.collection.name,
            localField,
            foreignField: "_id",
            as: asField,
          },
        });
        aggregationPipeline.push({
          $unwind: {
            path: `$${asField}`,
            preserveNullAndEmptyArrays: true,
          },
        });
      }
    }

    const filterConditions: any[] = [];
    for (const [key, val] of Object.entries(filters)) {
      if (key.includes(".")) {
        const [refField, subField] = key.split(".");
        const asField = `rowData.${refField}_resolved`;
        filterConditions.push({
          [`${asField}.rowData.${subField}`]: val,
        });
      } else {
        filterConditions.push({
          [`rowData.${key}`]: val,
        });
      }
    }
    if (filterConditions.length > 0) aggregationPipeline.push({ $match: { $and: filterConditions } });

    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: batchSize });

    const rawData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();
    if (rawData.length === 0) break;

    const processedData = rawData.map((doc) => {
      const rowData = { ...doc.rowData };
      for (const key in attributesMap) {
        const attr = attributesMap[key];
        const resolvedKey = `${key}_resolved`;
        if (attr.referenceEntitySetting && rowData.hasOwnProperty(resolvedKey)) {
          const refResolved = rowData[resolvedKey];
          if (refResolved?.rowData) {
            Object.entries(refResolved.rowData).forEach(([subKey, value]) => {
              rowData[`${key}.${subKey}`] = value;
            });
          }
          delete rowData[key];
          delete rowData[resolvedKey];
        }
      }
      return { ...doc, rowData };
    });

    await processBatch(processedData);
    skip += batchSize;
  }
}

// Group cases by template.groupBy fields, handling nested refs
function groupCasesByFields(cases: any[], groupBy: any[]) {
  if (!groupBy || groupBy.length === 0) return { all: cases };

  const groups = new Map<string, any[]>();

  for (const c of cases) {
    const keyParts = groupBy.map((gb) => {
      // gb.attributeId is ObjectId, convert to string
      let val = c.rowData?.[gb.attributeId.toString()] ?? "";

      if (gb.refAttributeId && gb.refAttributeId.length > 0) {
        // Resolve nested reference attributes
        for (const refId of gb.refAttributeId) {
          val = val?.rowData?.[refId.toString()] ?? val;
        }
      }
      return val ?? "";
    });

    const key = keyParts.join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return Object.fromEntries(groups);
}

// Main function to prepare today's notifications
export async function prepareTodayNotifications() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const settings = await NotificationFrequencySetting.find({
    isActive: true,
    schedulerStartDate: { $lte: new Date(today.getTime() + 86399999) },
    $or: [{ schedulerEndDate: null }, { schedulerEndDate: { $gte: today } }],
  })
    .populate("notificationTypeId")
    .populate("templateId")
    .populate("mediumSettingId");

  let totalPrepared = 0;

  for (const setting of settings) {
    try {
      if (!isDueToday(setting, today)) continue;

      const notifType = setting.notificationTypeId as any;
      const template = setting.templateId as any;
      const mediumSetting = setting.medium as any;
      const sentAt = combineDateAndTime(today, setting.triggerTime);

      if (!notifType || !template) continue;

      const entity: any = await findEntityById(notifType.entityId);
      const attributeMap: any = new Map(entity.attributes.map((a: any) => [String(a._id), a]));

      const filtersDef = await buildFiltersFromConditions(notifType.conditions || [], attributeMap);

      const allMatchingCases: any[] = [];
      let trigger: any = null;

      // Fetch all matching cases in batches and accumulate
      await processBatchedMatchingCases({
        schemaName: notifType.schemaName,
        entityId: notifType.entityId,
        filters: filtersDef,
        batchSize: 100,
        processBatch: async (casesBatch) => {
          allMatchingCases.push(...casesBatch);
        },
      });

      if (allMatchingCases.length === 0) continue;

      // Create notification trigger once per frequency setting run
      trigger = await NotificationTriggerModel.create({
        notificationTypeId: notifType._id,
        frequencySettingId: setting._id,
        source: "cron",
      });

      if (template.type === "single") {
        // One notification per case
        for (const caseData of allMatchingCases) {
          let ackId: any;

          if (notifType.requiresAcknowledgment) {
            const ack = await NotificationAcknowledge.create({
              status: "pending",
              caseId: caseData._id,
              notificationTypeId: notifType._id,
            });
            ackId = ack._id;
          }

          const preparedDoc = {
            organizationId: caseData.organizationId,
            notificationTypeId: notifType._id,
            frequencySettingId: setting._id,
            templateId: template._id,
            mediumSettingId: mediumSetting?._id,
            scheduledAt: new Date(),
            sentAt,
            payload: buildPayload(template, caseData, notifType, ackId),
            recipients: resolveRecipients(caseData, notifType),
            status: "pending",
            notificationTriggerId: trigger._id,
            acknowledgeId: ackId,
          };

          await PreparedNotification.create(preparedDoc);
          totalPrepared++;
        }
      } else if (template.type === "overall") {
        // Group cases by template.groupBy fields
        const groupedCases = groupCasesByFields(allMatchingCases, template.groupBy || []);

        for (const [groupKey, groupCases] of Object.entries(groupedCases)) {
          let ackId: any;

          if (notifType.requiresAcknowledgment) {
            const ack = await NotificationAcknowledge.create({
              status: "pending",
              caseId: groupCases[0]._id, // or null if no caseId for group
              notificationTypeId: notifType._id,
            });
            ackId = ack._id;
          }

          // Pass grouped cases as caseData for payload building
          const caseDataForPayload = {
            ...groupCases[0], // representative case for placeholders
            groupCases,       // all grouped cases for summary
          };

          const preparedDoc = {
            organizationId: groupCases[0].organizationId,
            notificationTypeId: notifType._id,
            frequencySettingId: setting._id,
            templateId: template._id,
            mediumSettingId: mediumSetting?._id,
            scheduledAt: new Date(),
            sentAt,
            payload: buildPayload(template, caseDataForPayload, notifType, ackId),
            recipients: resolveRecipients(caseDataForPayload, notifType),
            status: "pending",
            notificationTriggerId: trigger._id,
            acknowledgeId: ackId,
          };

          await PreparedNotification.create(preparedDoc);
          totalPrepared++;
        }
      }

    } catch (error) {
      console.error(`Error preparing notifications for setting ${setting._id}:`, error);
    }
  }

  console.log(`Prepared ${totalPrepared} notifications for today`);
}