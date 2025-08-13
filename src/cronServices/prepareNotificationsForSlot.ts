import mongoose, { Types } from "mongoose";
import config from '../config';
// Import all models **after connecting** to ensure populate works
import "../database/models/notivix/notificationType";
import "../database/models/notivix/notificationTemplate";
import "../database/models/notivix/notificationMediumSetting";
import "../database/models/notivix/notificationFrequencySetting";
import "../database/models/notivix/notificationAcknowledge";
import "../database/models/notivix/preparedNotification";
import "../database/models/notivix/notificationTrigger";
import "../database/models/common/organization";
import NotificationFrequencySetting from "../database/models/notivix/notificationFrequencySetting";
import NotificationAcknowledge from "../database/models/notivix/notificationAcknowledge";
import PreparedNotification from "../database/models/notivix/preparedNotification";
import NotificationTriggerModel from "../database/models/notivix/notificationTrigger";
import { getModelForEntity } from "../utils/entity.utils";
import { findEntityById } from "../database/services/common/entity.services";
import createDefaultDataSourceVersionModel from "../database/models/common/defaultDataSourceVersionModel";
import { listNotificationFrequency } from "../database/services/notivix/notificationFrequency.service";
import { findDataSourceById } from "../database/services/common/dataSource.services";
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from "../utils/common.utils";



// --------------------
// Helpers
// --------------------


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

// --------------------
// Recipient resolution
// --------------------

function resolveRecipientsFromSetting(
  caseData: any,
  recipients: { attributeId?: Types.ObjectId; refAttributeId?: Types.ObjectId[]; customEmails?: string[] }[]
): string[] {
  const emails = new Set<string>();
  if (!recipients || recipients.length === 0) return [];

  for (const recipient of recipients) {
    // Custom emails
    if (recipient.customEmails && recipient.customEmails.length > 0) {
      for (const email of recipient.customEmails) {
        if (email) emails.add(email.trim().toLowerCase());
      }
      continue;
    }

    // Attribute resolution
    if (recipient.attributeId) {
      let val: any = caseData.rowData?.[recipient.attributeId.toString()];
      if (recipient.refAttributeId && recipient.refAttributeId.length > 0) {
        for (const refId of recipient.refAttributeId) {
          val = val?.rowData?.[refId.toString()] ?? val;
        }
      }
      if (typeof val === "string" && val.trim() !== "") {
        emails.add(val.trim().toLowerCase());
      }
    }
  }

  return Array.from(emails);
}

// Wrapper to match PreparedNotification schema
function resolveRecipients(caseData: any, notifType: any, freqSetting: any) {
  const to = resolveRecipientsFromSetting(caseData, freqSetting.recipients_to);
  const cc = resolveRecipientsFromSetting(caseData, freqSetting.recipients_cc);
  return { recipient_to: to, recipient_cc: cc };
}

// --------------------
// Notification processing
// --------------------

// Build filters from notification conditions
// Recursive filter builder
// Build a Mongo filter from your conditionGroups structure.
// - Preserves the exact grouping in your JSON (AND/OR at each node)
// - Avoids redundant extra $and at the top
// - Never turns OR leaves into AND
async function buildFiltersFromConditions(
  conditionGroups: any[],
  attributeMap: Map<string, any>
): Promise<any> {
  if (!Array.isArray(conditionGroups) || conditionGroups.length === 0) return {};

  // Build each top-level group. "conditionGroups" themselves are combined with AND
  const groupFilters: any[] = [];
  for (const group of conditionGroups) {
    const f = await buildGroupFilter(group, attributeMap);
    if (Object.keys(f).length) groupFilters.push(f);
  }

  // If only one top-level group, return it as-is (NO extra $and wrapper)
  if (groupFilters.length === 1) return groupFilters[0];

  // Otherwise AND the groups together
  return { $and: groupFilters };
}

function isGroupNode(node: any): boolean {
  return !!node && typeof node === "object" && Array.isArray(node.conditions) && node.group_operator;
}

async function buildGroupFilter(
  node: any,
  attributeMap: Map<string, any>
): Promise<any> {
  // If this node is actually a leaf with attributeId, handle as leaf
  if (!isGroupNode(node) && node?.attributeId) {
    const leaf = await buildLeafFilter(node, attributeMap);
    return leaf ?? {};
  }

  // If it's a group, recurse children
  if (isGroupNode(node)) {
    const op = String(node.group_operator).toLowerCase() === "or" ? "$or" : "$and";
    const children: any[] = [];

    for (const child of node.conditions) {
      // Child can be a nested group or a leaf
      if (isGroupNode(child)) {
        const nested = await buildGroupFilter(child, attributeMap);
        if (Object.keys(nested).length) children.push(nested);
      } else if (child?.attributeId) {
        const lf = await buildLeafFilter(child, attributeMap);
        if (lf && Object.keys(lf).length) children.push(lf);
      }
      // silently skip empty/invalid nodes
    }

    if (children.length === 0) return {};
    // Always return this group's own wrapper so explicit nesting is preserved
    return { [op]: children };
  }

  // Fallback
  return {};
}

async function buildLeafFilter(cond: any, attributeMap: Map<string, any>): Promise<any> {
  const attr = attributeMap.get(String(cond.attributeId));
  if (!attr) return {};

  // Resolve field path, including refAttributeId chain if any
  const fieldPath = await resolveFieldPath(attr, cond.refAttributeId);

  // Map operator
  let mongoCond: any;
  switch (cond.operator) {
    case "equals":
      mongoCond = cond.value;
      break;
    case "contains":
      mongoCond = { $in: Array.isArray(cond.value) ? cond.value : [cond.value] };
      break;
    case "notcontains":
      mongoCond = { $nin: Array.isArray(cond.value) ? cond.value : [cond.value] };
      break;
    case "exists":
      mongoCond = { $exists: true, $ne: null };
      break;
    case "not_exists":
      mongoCond = { $exists: false };
      break;
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const numVal = Number(cond.value);
      if (cond.timeUnit && !isNaN(numVal)) {
        const now = new Date();
        const multiplier =
          cond.timeUnit === "d" ? 86400000 :
          cond.timeUnit === "h" ? 3600000 : 1000;
        const targetDate = new Date(now.getTime() + numVal * multiplier);
        mongoCond = { [`$${cond.operator}`]: targetDate };
      } else {
        mongoCond = { [`$${cond.operator}`]: cond.value };
      }
      break;
    }
    default:
      mongoCond = cond.value;
  }

  return { [fieldPath]: mongoCond };
}





// Batch fetch matching cases with lookups and flattening
async function processBatchedMatchingCases({
  schemaName,
  entity,
  filters = {},
  batchSize = 100,
  processBatch,
}: {
  schemaName: string;
  entity: Record<string, any>;
  filters?: Record<string, any>;
  batchSize?: number;
  processBatch: (cases: any[]) => Promise<void>;
}) {
  const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

  // Map by attribute *name* (that's what buildFiltersFromConditions used)
  const attributesMap: Record<string, any> = entity.attributes.reduce((acc: any, attr: any) => {
    acc[attr.name] = attr;
    return acc;
  }, {});

  // --- helpers -------------------------------------------------------------

  // Turn a logical/field filter into an aggregation-ready one by rewriting field paths
  function transformFilterForAggregation(input: any): any {
    if (Array.isArray(input)) {
      return input.map(transformFilterForAggregation);
    }
    if (input && typeof input === "object") {
      const keys = Object.keys(input);
      // Logical operator object? ($and, $or, $nor, $not)
      if (keys.length === 1 && keys[0].startsWith("$")) {
        const op = keys[0];
        const val = (input as any)[op];
        if (Array.isArray(val)) {
          return { [op]: val.map(transformFilterForAggregation) };
        }
        // $not expects an expression (object), still transform inside
        return { [op]: transformFilterForAggregation(val) };
      }

      // Field conditions
      const out: any = {};
      for (const [fieldPath, condition] of Object.entries(input)) {
        out[toAggregationFieldPath(fieldPath)] = transformFilterForAggregation(condition);
      }
      return out;
    }
    // Primitive (string/number/date/etc.)
    return input;
  }

  // Convert "Field" or "Ref.Field" into the right `rowData.*` path for $match
  function toAggregationFieldPath(fieldPath: string): string {
    // e.g. "Attorney.Name" or "LocalAgentName"
    const parts = fieldPath.split(".");
    const first = parts[0];
    const rest = parts.slice(1);

    const attr = attributesMap[first];
    const isRef = !!attr?.referenceEntitySetting?.refEntityId;

    // If it's a reference attribute AND user is filtering a subfield → use _resolved.rowData.<sub>
    if (isRef && rest.length > 0) {
      return `rowData.${first}_resolved.rowData.${rest.join(".")}`;
    }

    // Otherwise match directly on the stored value in rowData (scalar or _id)
    return `rowData.${fieldPath}`;
  }

  // ------------------------------------------------------------------------

  let skip = 0;

  while (true) {
    const aggregationPipeline: any[] = [];

    // $lookup each referenced attribute once (as you already do)
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

    // Transform your nested filter object to use the correct rowData / _resolved paths
    if (filters && Object.keys(filters).length > 0) {
      const matchFilter = transformFilterForAggregation(filters);
      aggregationPipeline.push({ $match: matchFilter });
    }

    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: batchSize });

    console.log("aggregationPipeline", JSON.stringify(aggregationPipeline, null, 2));

    const rawData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();
    if (rawData.length === 0) break;

    // Flatten resolved refs back into 'Attorney.Name'-style keys for payloads, like before
    const processedData = rawData.map((doc: any) => {
      const rowData = { ...doc.rowData };
      for (const key of Object.keys(attributesMap)) {
        const attr = attributesMap[key];
        const resolvedKey = `${key}_resolved`;
        if (attr.referenceEntitySetting && Object.prototype.hasOwnProperty.call(rowData, resolvedKey)) {
          const refResolved = rowData[resolvedKey];
          if (refResolved?.rowData) {
            for (const [subKey, value] of Object.entries(refResolved.rowData)) {
              rowData[`${key}.${subKey}`] = value;
            }
          }
          delete rowData[key];          // remove original ObjectId field
          delete rowData[resolvedKey];  // and the resolved doc
        }
      }
      return { ...doc, rowData };
    });

    await processBatch(processedData);
    skip += batchSize;
  }
}


// Group cases by template.groupBy fields, handling nested refs
async function resolveFieldPath(attr: any, refAttributeId: string[] = []) {
  let fieldPath = attr.name;

  if (Array.isArray(refAttributeId) && refAttributeId.length > 0) {
    let currentEntityId = attr.referenceEntitySetting?.refEntityId?.toString();
    let mappedName = attr.name || "Unknown";

    for (const refAttrId of refAttributeId) {
      const refEntity = await findEntityById(currentEntityId);
      const refAttr = refEntity?.attributes?.find(
        (a: any) => String(a._id) === String(refAttrId)
      );
      if (!refAttr) break;
      mappedName += `.${refAttr.name}`;
      currentEntityId = refAttr.referenceEntitySetting?.refEntityId?.toString();
    }

    fieldPath = mappedName;
  }

  return fieldPath;
}

// Simple safe getter for nested properties
function getNestedValue(obj: any, path: string) {
  if (obj == null) return undefined;

  // First, check for flat key match
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  // Then, fall back to dot-path traversal
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return undefined;
  }, obj);
}


export async function groupCasesByFields(
  cases: any[],
  groupBy: any[],
  attributeMap: Map<string, any>
) {
  // Resolve field paths in order
  const resolvedGroupBy: any[] = [];
  for (const gb of groupBy) {
    const attr = attributeMap.get(String(gb.attributeId));
    if (!attr) continue;
    const fieldPath = await resolveFieldPath(attr, gb.refAttributeId);
    resolvedGroupBy.push({ ...gb, fieldPath });
  }

  // Recursive function for ordered grouping
  function groupRecursive(data: any[], level: number): Record<string, any> {
    if (level >= resolvedGroupBy.length) {
      return data; // no more levels, return cases array
    }

    const fieldPath = resolvedGroupBy[level].fieldPath;
    const grouped: Record<string, any> = {};

    for (const item of data) {
      let key = getNestedValue(item.rowData, fieldPath);
      key = key != null ? String(key) : "Unknown";

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    // Recursively group the next level
    for (const key in grouped) {
      grouped[key] = groupRecursive(grouped[key], level + 1);
    }

    return grouped;
  }

  return groupRecursive(cases, 0);
}



// Main function to prepare today's notifications
export async function prepareTodayNotifications() {
  // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);  
  console.log("🔹 Starting prepareTodayNotifications");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log("📅 Today's date:", today.toDateString());
  const query = {
    isActive: 'active',
    schedulerStartDate: { $lte: new Date(today.getTime() + 86399999) },
    $or: [{ schedulerEndDate: null }, { schedulerEndDate: { $gte: today } }],
  };
  const populate = ['notificationTypeId', 'templateId', 'medium'];
  const settings = await listNotificationFrequency({query, populate});

  console.log(`⚙️ Found ${settings.length} active frequency settings`);

  let totalPrepared = 0;

  for (const setting of settings) {
    try {
      console.log(`\n🔹 Processing frequency setting ${setting._id}`);

      if (!isDueToday(setting, today)) {
        console.log("⏭ Not due today, skipping");
        continue;
      }
      console.log("✅ Setting is due today");

      const notifType = setting.notificationTypeId as any;
      const template = setting.templateId as any;
      const mediumSetting = setting.medium as any;
      const sentAt = combineDateAndTime(today, setting.triggerTime);

      if (!notifType || !template) {
        console.log("⚠️ Missing notificationType or template, skipping");
        continue;
      }

      const dataSourceDetails: any = await findDataSourceById(notifType.dataSourceId);
      const entity: any = dataSourceDetails?.entityId;
      const attributeMap: any = new Map(entity.attributes.map((a: any) => [String(a._id), a]));
      console.log(`📌 Loaded entity ${entity._id} with ${entity.attributes.length} attributes`);

      const filters = await buildFiltersFromConditions(notifType.conditionGroups || [], attributeMap);
      console.log("🔍 Built filters from conditions:", JSON.stringify(filters, null, 2));

      const allMatchingCases: any[] = [];
      let trigger: any = null;

      console.log("🚀 Fetching matching cases in batches...");

       const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
                  orgCode : 'reportivix',
                  versionCode: dataSourceDetails.code,
                });

      await processBatchedMatchingCases({
        schemaName,
        entity,
        filters,
        batchSize: 100,
        processBatch: async (casesBatch) => {
          console.log(`📝 Processing batch of ${casesBatch.length} cases`);
          allMatchingCases.push(...casesBatch);
        },
      });
      console.log(`✅ Total matching cases fetched: ${allMatchingCases.length}`);

      if (allMatchingCases.length === 0) {
        console.log("⏭ No matching cases, skipping setting");
        continue;
      }

      console.log("🛠 Creating notification trigger...");
      trigger = await NotificationTriggerModel.create({
        notificationTypeId: notifType._id,
        frequencySettingId: setting._id,
        source: "cron",
      });

      if (template.type === "single") {
        console.log("📬 Preparing single notifications");
        const preparedDocs: any = [];

        for (const caseData of allMatchingCases) {
          let ackId: any;

          if (notifType.requiresAcknowledgment) {
            console.log(`🔑 Creating acknowledgment for case ${caseData._id}`);
            const ack = await NotificationAcknowledge.create({
              status: "pending",
              caseId: caseData._id,
              notificationTypeId: notifType._id,
            });
            ackId = ack._id;
          }

          preparedDocs.push({
            organizationId: notifType.organizationId,
            notificationTypeId: notifType._id,
            frequencySettingId: setting._id,
            templateId: template._id,
            mediumSettingId: mediumSetting?._id,
            scheduledAt: new Date(),
            sentAt,
            payload: buildPayload(template, caseData, notifType, ackId),
            recipients: resolveRecipients(caseData, notifType, setting),
            status: "pending",
            notificationTriggerId: trigger._id,
            acknowledgeId: ackId,
          });
        }

        await PreparedNotification.insertMany(preparedDocs);
        totalPrepared += preparedDocs.length;
        console.log(`✅ Inserted ${preparedDocs.length} single notifications`);

      } else if (template.type === "overall") {
        console.log("📬 Preparing grouped/overall notifications");
        const groupedCases = await groupCasesByFields(allMatchingCases, template.groupBy || [], attributeMap);
        console.log(`🔹 Total groups formed: ${Object.keys(groupedCases).length}`, groupedCases);

        const preparedDocs: any = [];

        for (const [groupKey, groupCases] of Object.entries(groupedCases)) {
          let ackId: any;

          if (notifType.requiresAcknowledgment) {
            console.log(`🔑 Creating acknowledgment for group ${groupKey}`);
            const ack = await NotificationAcknowledge.create({
              status: "pending",
              caseId: groupCases[0]._id,
              notificationTypeId: notifType._id,
            });
            ackId = ack._id;
          }

          const caseDataForPayload = {
            ...groupCases[0],
            groupCases,
          };
          preparedDocs.push({
            organizationId: notifType.organizationId,
            notificationTypeId: notifType._id,
            frequencySettingId: setting._id,
            templateId: template._id,
            mediumSettingId: mediumSetting?._id,
            scheduledAt: new Date(),
            sentAt,
            payload: buildPayload(template, caseDataForPayload, notifType, ackId),
            recipients: resolveRecipients(caseDataForPayload, notifType, setting),
            status: "pending",
            notificationTriggerId: trigger._id,
            acknowledgeId: ackId,
          });
        }

        await PreparedNotification.insertMany(preparedDocs);
        totalPrepared += preparedDocs.length;
        console.log(`✅ Inserted ${preparedDocs.length} grouped notifications`);
      }
    } catch (error) {
      console.error(`❌ Error preparing notifications for setting ${setting._id}:`, error);
    }
  }

  console.log(`🏁 Finished. Total notifications prepared: ${totalPrepared}`);
}

prepareTodayNotifications();