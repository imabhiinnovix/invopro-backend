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

async function resolveRecipientsFromSetting(
  caseData: any,
  recipients: { attributeId?: Types.ObjectId; refAttributeId?: Types.ObjectId[]; customEmails?: string[] }[],
  attributeMap: Map<string, any>
): Promise<string[]> {
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
      const attr = attributeMap.get(String(recipient.attributeId));
      if (!attr) continue;

      // Resolve full dot path
      const fieldPath = await resolveFieldPath(attr, recipient.refAttributeId || []);

      // Get value from flattened rowData
      const val = getNestedValue(caseData.rowData, fieldPath);

      if (typeof val === "string" && val.trim() !== "") {
        emails.add(val.trim().toLowerCase());
      }
    }
  }

  return Array.from(emails);
}


// Wrapper to match PreparedNotification schema
async function resolveRecipients(caseData: any, freqSetting: any, attributeMap: any) {
  const to = await resolveRecipientsFromSetting(caseData, freqSetting.recipients_to, attributeMap);
  const cc = await resolveRecipientsFromSetting(caseData, freqSetting.recipients_cc, attributeMap);
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





// Batch fetch matching cases with recursive lookups and flattening
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

  // Map by attribute name
  const attributesMap: Record<string, any> = entity.attributes.reduce((acc: any, attr: any) => {
    acc[attr.name] = attr;
    return acc;
  }, {});

  // --- Recursive $lookup generator ---
  async function generateLookupsForAllReferences(
    attrMap: Record<string, any>,
    parentPath = ''
  ): Promise<any[]> {
    const lookups: any[] = [];

    for (const [attrName, attr] of Object.entries(attrMap)) {
      const fullPath = parentPath ? `${parentPath}.${attrName}` : attrName;

      if (attr.referenceEntitySetting?.refEntityId) {
        const refModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
        const localField = parentPath ? `${parentPath}.${attrName}` : `rowData.${attrName}`;
        const asField = parentPath ? `${parentPath}.${attrName}_resolved` : `rowData.${attrName}_resolved`;

        lookups.push({
          $lookup: {
            from: refModel.collection.name,
            localField,
            foreignField: "_id",
            as: asField,
          },
        });
        lookups.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });

        // Recursively generate lookups for referenced entity's attributes
        const refEntity = await findEntityById(attr.referenceEntitySetting.refEntityId);
        const refAttrMap = (refEntity?.attributes || []).reduce((acc: any, a: any) => {
          acc[a.name] = a;
          return acc;
        }, {});
        const nestedLookups = await generateLookupsForAllReferences(refAttrMap, asField + '.rowData');
        lookups.push(...nestedLookups);
      }
    }

    return lookups;
  }

  // --- Recursive flattening ---
async function flattenAllResolved(rowData: Record<string, any>): Promise<Record<string, any>> {
  const newRow: Record<string, any> = {};

  for (const [key, value] of Object.entries(rowData)) {
    if (value && typeof value === "object" && "rowData" in value && typeof value.rowData === "object") {
      // It's a resolved object
      const cleanKey = key.replace(/_resolved$/, "");
      const nested = await flattenAllResolved(value.rowData);

      for (const [subKey, subValue] of Object.entries(nested)) {
        newRow[`${cleanKey}.${subKey}`] = subValue;
      }
    } else if (typeof value === "object" && value !== null && mongoose.Types.ObjectId.isValid(value)) {
      // Skip ObjectId fields that have a resolved version
      const resolvedKey = `${key}_resolved`;
      if (resolvedKey in rowData) continue;
      newRow[key] = value;
    } else {
      newRow[key] = value;
    }
  }

  return newRow;
}





  // --- Transform filters for aggregation ---
  function transformFilterForAggregation(input: any): any {
    if (Array.isArray(input)) return input.map(transformFilterForAggregation);
    if (input && typeof input === "object") {
      const keys = Object.keys(input);
      if (keys.length === 1 && keys[0].startsWith("$")) {
        const op = keys[0];
        const val = (input as any)[op];
        return Array.isArray(val)
          ? { [op]: val.map(transformFilterForAggregation) }
          : { [op]: transformFilterForAggregation(val) };
      }

      const out: any = {};
      for (const [fieldPath, condition] of Object.entries(input)) {
        out[toAggregationFieldPath(fieldPath)] = transformFilterForAggregation(condition);
      }
      return out;
    }
    return input;
  }

  function toAggregationFieldPath(fieldPath: string): string {
    const parts = fieldPath.split(".");
    const first = parts[0];
    const rest = parts.slice(1);
    const attr = attributesMap[first];
    const isRef = !!attr?.referenceEntitySetting?.refEntityId;

    if (isRef && rest.length > 0) {
      return `rowData.${first}_resolved.rowData.${rest.join(".")}`;
    }

    return `rowData.${fieldPath}`;
  }

  // --- Pagination loop ---
  let skip = 0;
  const lookups = await generateLookupsForAllReferences(attributesMap);

  while (true) {
    const aggregationPipeline: any[] = [...lookups];

    if (filters && Object.keys(filters).length > 0) {
      aggregationPipeline.push({ $match: transformFilterForAggregation(filters) });
    }

    aggregationPipeline.push({ $skip: skip }, { $limit: batchSize });

    const rawData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();
    if (rawData.length === 0) break;

    const processedData = await Promise.all(
      rawData.map(async doc => {
        const flatRowData = await flattenAllResolved(doc.rowData);
        return { ...doc, rowData: flatRowData };
      })
    );

    await processBatch(processedData);
    skip += batchSize;
  }
}



// Group cases by template.groupBy fields, handling nested refs
async function resolveFieldPath(attr: any, refAttributeId: (string | Types.ObjectId)[] = []) {
  let fieldPath = attr.name;
  console.log('refAttributeId', refAttributeId);

  if (Array.isArray(refAttributeId) && refAttributeId.length > 0) {
    let currentEntityId = attr.referenceEntitySetting?.refEntityId?.toString();
    let mappedName = attr.name || "Unknown";

    for (const refAttrId of refAttributeId) {
      if (!currentEntityId) break;

      const refEntity: any = await findEntityById(currentEntityId);
      if (!refEntity) break;

      const refAttr = refEntity.attributes.find(
        (a: any) => String(a._id) === refAttrId.toString()
      );
      if (!refAttr) break;

      mappedName += `.${refAttr.name}`;

      // Only update currentEntityId if this attribute is a reference
      if (refAttr.referenceEntitySetting?.refEntityId) {
        currentEntityId = refAttr.referenceEntitySetting.refEntityId.toString();
      }
    }

    fieldPath = mappedName;
  }

  console.log('fieldPath', fieldPath);
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
    // console.log('fieldPath',fieldPath);
    for (const item of data) {
      let key = getNestedValue(item.rowData, fieldPath);
      console.log('key', key, item.rowData, fieldPath);
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
      console.log('notifType.conditionGroups',JSON.stringify(notifType.conditionGroups, null, 2));
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
            payload: caseData,
            recipients: await resolveRecipients(caseData, setting, attributeMap),
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
        const groupedCases = await groupCasesByFields(allMatchingCases, [setting.targetEntity], attributeMap);
        console.log(`🔹 Total groups formed: ${Object.keys(groupedCases).length}`);

        const preparedDocs: any = [];

        for (const [groupKey, groupCases] of Object.entries(groupedCases)) {
          if(groupKey == 'Unknown')
            continue;  
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
          console.log('groupKey',groupKey);
        //   const caseDataForPayload = {
        //     ...groupCases[0],
        //     groupCases,
        //   };
          preparedDocs.push({
            organizationId: notifType.organizationId,
            notificationTypeId: notifType._id,
            frequencySettingId: setting._id,
            templateId: template._id,
            mediumSettingId: mediumSetting?._id,
            scheduledAt: new Date(),
            sentAt,
            payload: await groupCasesByFields(groupCases, template.groupBy, attributeMap),
            recipients: await resolveRecipients(groupCases[0], setting, attributeMap),
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