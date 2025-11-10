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
import { getAttributeByName, getEntityAttribute, getModelForEntity } from "../utils/entity.utils";
import { findEntityById } from "../database/services/common/entity.services";
import createDefaultDataSourceVersionModel from "../database/models/common/defaultDataSourceVersionModel";
import { listNotificationFrequency } from "../database/services/notivix/notificationFrequency.service";
import { findDataSourceById } from "../database/services/common/dataSource.services";
import { getSchemaNameBasedOnVersionCodeAndOrgCode, uniqueCode } from "../utils/common.utils";
import { getCurrentDataSourceVersion } from "../database/services/common/dataSourceVersion.services";
import { scheduleEmail } from "../utils/notification.utils";


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
      recipient.customEmails.forEach(email => email && emails.add(email.trim().toLowerCase()));
      continue;
    }

    if (recipient.attributeId) {
      const attr = attributeMap.get(String(recipient.attributeId));
      if (!attr) continue;
      const fieldPath = await resolveFieldPath(attr, recipient.refAttributeId || []);
      const val = getNestedValue(caseData.rowData, fieldPath);

      // If array (like FOName.FOEmail), add each element
      if (Array.isArray(val)) {
        val.forEach((v: string) => v && emails.add(v.trim().toLowerCase()));
      } else if (typeof val === "string" && val.trim() !== "") {
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

async function resolveAckRecipients(caseData: any, freqSetting: any, attributeMap: any) {
  const to = await resolveRecipientsFromSetting(caseData, freqSetting.acknowledge_to, attributeMap);
  const cc = await resolveRecipientsFromSetting(caseData, freqSetting.recipients_to, attributeMap);
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

  // Escape regex for exact match
  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Trim a value or array of values
  function trimValues(values: any): string[] {
    if (!values) return [];
    if (!Array.isArray(values)) values = [values];
    return values
      .flatMap(v => (typeof v === "string" && v.includes(",") ? v.split(",") : v))
      .map(v => (typeof v === "string" ? v.trim() : v))
      .filter(v => v !== "");
  }

  // Build regex filter for multiple values
  function buildRegexOr(values: string[], negate = false) {
    if (values.length === 1) {
      return negate
        ? { [fieldPath]: { $not: { $regex: `^${escapeRegExp(values[0])}$`, $options: "i" } } }
        : { [fieldPath]: { $regex: `^${escapeRegExp(values[0])}$`, $options: "i" } };
    }
    const conditions = values.map(v => ({
      [fieldPath]: negate
        ? { $not: { $regex: `^${escapeRegExp(v)}$`, $options: "i" } }
        : { $regex: `^${escapeRegExp(v)}$`, $options: "i" },
    }));
    return negate ? { $and: conditions } : { $or: conditions };
  }

  let mongoCond: any;

  switch (cond.operator) {
    case "eq":
      mongoCond = buildRegexOr(trimValues(cond.value), false);
      break;

    case "ne":
      mongoCond = buildRegexOr(trimValues(cond.value), true);
      break;

    case "contains":
      mongoCond = buildRegexOr(trimValues(cond.value), false);
      break;

    case "notcontains":
      mongoCond = buildRegexOr(trimValues(cond.value), true);
      break;

    case "startswith":
      mongoCond = { [fieldPath]: { $regex: `^${escapeRegExp(trimValues(cond.value)[0])}`, $options: "i" } };
      break;

    case "endswith":
      mongoCond = { [fieldPath]: { $regex: `${escapeRegExp(trimValues(cond.value)[0])}$`, $options: "i" } };
      break;

    case "blank":
      mongoCond = { [fieldPath]: { $in: [null, ""] } };
      break;

    case "notblank":
      mongoCond = { [fieldPath]: { $nin: [null, ""] } };
      break;

    // Date operators
    case "before":
    case "onOrBefore":
    case "after":
    case "onOrAfter":
    case "beforePast":
    case "onOrBeforePast":
    case "afterPast":
    case "onOrAfterPast": {
      const numVal = Number(cond.value);
      const now = new Date();
      const multiplier = cond.timeUnit === "d" ? 86400000 : cond.timeUnit === "h" ? 3600000 : 1000;
      let targetDate: Date;

      if (["before", "onOrBefore", "after", "onOrAfter"].includes(cond.operator)) {
        targetDate = new Date(now.getTime() + numVal * multiplier);
      } else {
        targetDate = new Date(now.getTime() - numVal * multiplier);
      }

      if (cond.operator === "before" || cond.operator === "beforePast") mongoCond = { [fieldPath]: { $lt: targetDate } };
      else if (cond.operator === "onOrBefore" || cond.operator === "onOrBeforePast") mongoCond = { [fieldPath]: { $lte: targetDate } };
      else if (cond.operator === "after" || cond.operator === "afterPast") mongoCond = { [fieldPath]: { $gt: targetDate } };
      else if (cond.operator === "onOrAfter" || cond.operator === "onOrAfterPast") mongoCond = { [fieldPath]: { $gte: targetDate } };
      break;
    }

    case "on":
      mongoCond = { [fieldPath]: { $gte: new Date(cond.value), $lt: new Date(new Date(cond.value).getTime() + 86400000) } };
      break;

    case "noton":
      mongoCond = { [fieldPath]: { $not: { $gte: new Date(cond.value), $lt: new Date(new Date(cond.value).getTime() + 86400000) } } };
      break;

    case "onOrAfterToday": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mongoCond = { [fieldPath]: { $gte: today } };
      break;
    }

    case "onOrBeforeToday": {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      mongoCond = { [fieldPath]: { $lte: today } };
      break;
    }

    case "afterToday": {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      mongoCond = { [fieldPath]: { $gt: today } };
      break;
    }

    case "beforeToday": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mongoCond = { [fieldPath]: { $lt: today } };
      break;
    }

    default:
      mongoCond = { [fieldPath]: cond.value };
  }

  return mongoCond;
}








// Batch fetch matching cases with recursive lookups and flattening
async function processBatchedMatchingCases({
  schemaName,
  dataSourceVersion,
  entity,
  filters = {},
  batchSize = 100,
  processBatch,
}: {
  schemaName: string;
  dataSourceVersion: Record<string, any>;
  entity: Record<string, any>;
  filters?: Record<string, any>;
  batchSize?: number;
  processBatch: (cases: any[]) => Promise<void>;
}) {
  const DataSourceVersionValue = createDefaultDataSourceVersionModel(schemaName);

  // Map by attribute name
  const attributesMap: Record<string, any> = await buildExtendedAttributeMap(entity);

  // --- Recursive $lookup generator ---
async function generateLookupsForAllReferences(
  attrMap: Record<string, any>,
  parentPath = '',
  visitedEntities: Set<string> = new Set()
): Promise<any[]> {
  const lookups: any[] = [];

  for (const [attrName, attr] of Object.entries(attrMap)) {
    const fullPath = parentPath ? `${parentPath}.${attrName}` : attrName;

    if (!attr.referenceEntitySetting?.refEntityId) continue;

    const refEntityId = attr.referenceEntitySetting.refEntityId.toString();

    // Prevent infinite recursion
    if (visitedEntities.has(refEntityId)) continue;
    visitedEntities.add(refEntityId);

    const refModel = await getModelForEntity(refEntityId);
    const refField = attr.referenceEntitySetting.refField || "_id";

    const localField = parentPath ? `${parentPath}.${attrName}` : `rowData.${attrName}`;
    const asField = parentPath ? `${parentPath}.${attrName}_resolved` : `rowData.${attrName}_resolved`;

    // Mapping relation case
    if (
      attr.referenceEntitySetting.relationType === "mapping_many_to_one" ||
      attr.referenceEntitySetting.relationType === "mapping_one_to_one"
    ) {
      // Step 1: lookup mapping table (bridge)
      const mappingAsField = `${asField}_map`;

      lookups.push({
        $lookup: {
          from: refModel.collection.name, // mapping table collection
          localField,
          foreignField: refField, // field in mapping table pointing to source entity
          as: mappingAsField,
        },
      });
      lookups.push({ $unwind: { path: `$${mappingAsField}`, preserveNullAndEmptyArrays: true } });

      // Step 2: lookup target entity through mapping table
      lookups.push({
        $lookup: {
          from: refModel.collection.name, // target entity collection (same refEntityId)
          localField: `${mappingAsField}.${refField}`, // field in mapping pointing to target _id
          foreignField: "_id",
          as: asField,
        },
      });
      lookups.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    } else {
      // Normal reference lookup
      lookups.push({
        $lookup: {
          from: refModel.collection.name,
          localField,
          foreignField: "_id",
          as: asField,
        },
      });
      lookups.push({ $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true } });
    }

    // Recursively generate lookups for referenced entity’s attributes
    const refEntity = await findEntityById(refEntityId);
    const refAttrMap = (refEntity?.attributes || []).reduce((acc: any, a: any) => {
      acc[a.name] = a;
      return acc;
    }, {});

    const nestedLookups = await generateLookupsForAllReferences(
      refAttrMap,
      `${asField}.rowData`,
      visitedEntities
    );

    lookups.push(...nestedLookups);
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
async function transformFilterForAggregation(input: any): Promise<any> {
  if (Array.isArray(input)) {
    return Promise.all(input.map((item) => transformFilterForAggregation(item)));
  }

  // Treat Date and ObjectId (or any non-plain object) as primitives
  if (input instanceof Date || input?.constructor?.name === "ObjectId") {
    return input;
  }

  if (input && typeof input === "object") {
    const keys = Object.keys(input);

    // Already a MongoDB operator object like {$lt: Date} or {$in: [...]}
    const isMongoOpObject = keys.every((k) => k.startsWith("$"));
    if (isMongoOpObject) {
      const out: any = {};
      for (const k of keys) {
        const val = input[k];
        out[k] = Array.isArray(val)
          ? await Promise.all(val.map((v) => transformFilterForAggregation(v)))
          : await transformFilterForAggregation(val);
      }
      return out;
    }

    // Normal object: transform fields recursively
    const out: any = {};
    for (const [fieldPath, cond] of Object.entries(input)) {
      const aggPath = await toAggregationFieldPath(fieldPath);
      out[aggPath] = await transformFilterForAggregation(cond);
    }
    return out;
  }

  // Primitive value (string, number, boolean)
  return input;
}


async function resolveRefAttribute(
  attr: any,
  refResolved: any,
  key: string,
  rowData: Record<string, any>,
  currentAttr?: any
) {
  if (!refResolved) return;

  let displayField: string | undefined;
  if (attr.referenceEntitySetting?.refEntityField) {
    const refFieldAttr = await getEntityAttribute(attr.referenceEntitySetting.refEntityId, attr.referenceEntitySetting.refEntityField);
    displayField = refFieldAttr?.name;
  }

  // Handle mapping relations
  if (currentAttr && ["mapping_one_to_one", "mapping_many_to_one"].includes(currentAttr.referenceEntitySetting?.relationType)) {
    const refFieldAttr = await getEntityAttribute(attr.referenceEntitySetting.refEntityId, attr.referenceEntitySetting.refEntityField);
    const refFieldName = refFieldAttr?.name;
    if (refFieldName && refResolved?.rowData?.[refFieldName]) {
      const refValue = refResolved.rowData[refFieldName];
      const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
      const relatedDocs: any[] = await RefModel.find({ _id: refValue, 'status': 'active' }).lean();

      if(currentAttr.referenceEntitySetting?.relationType === "mapping_one_to_one"){
        for (const r of relatedDocs) {
          for (const subKey in r.rowData) {
            const arrayKey = `${key}.${subKey}`;
            const value = r.rowData[subKey];
            if (value !== undefined) rowData[arrayKey] = value;
          }
        }
      } else { // mapping_many_to_one
        for (const r of relatedDocs) {
          for (const subKey in r.rowData) {
            const arrayKey = `${key}.${subKey}`;
            if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
            const value = r.rowData[subKey];
            if (Array.isArray(value)) rowData[arrayKey].push(...value);
            else if (value !== undefined) rowData[arrayKey].push(value);
            rowData[arrayKey] = Array.from(new Set(rowData[arrayKey]));
          }
        }
      }
    }
  }
  // Default handling
  else if (Array.isArray(refResolved)) {
    const displayValues: string[] = [];
    for (const ref of refResolved) {
      if (!ref?.rowData) continue;
      for (const subKey in ref.rowData) {
        const arrayKey = `${key}.${subKey}`;
        if (!Array.isArray(rowData[arrayKey])) rowData[arrayKey] = [];
        const value = ref.rowData[subKey];
        if (Array.isArray(value)) rowData[arrayKey].push(...value);
        else if (value !== undefined) rowData[arrayKey].push(value);
      }
      const displayVal = displayField && ref.rowData[displayField] !== undefined
        ? ref.rowData[displayField]
        : Object.values(ref.rowData)[0];
      displayValues.push(displayVal);
    }
    rowData[key] = displayValues;
  } else if (refResolved && refResolved.rowData) {
    const refRowData = refResolved.rowData;
    for (const subKey in refRowData) rowData[`${key}.${subKey}`] = refRowData[subKey];
    rowData[key] = displayField && refRowData[displayField] !== undefined
      ? refRowData[displayField]
      : Object.values(refRowData)[0];
  }
}




  async function toAggregationFieldPath(fieldPath: string): Promise<string> {
  const parts = fieldPath.split(".");
  const first = parts[0];
  const rest = parts.slice(1);
  const attr = attributesMap[first];
  const isRef = !!attr?.referenceEntitySetting?.refEntityId;

  if (isRef) {
    if (rest.length > 0) {
      return `rowData.${first}_resolved.rowData.${rest.join(".")}`;
    }
    // fallback: use configured refEntityField
    const refField = attr.referenceEntitySetting?.refEntityField;
    const refFieldAttr = await getEntityAttribute(attr.referenceEntitySetting?.refEntityId, refField);

    return refFieldAttr
      ? `rowData.${first}_resolved.rowData.${refFieldAttr.name}`
      : `rowData.${first}_resolved._id`;
  }

  return `rowData.${fieldPath}`;
}



  // --- Pagination loop ---
  let skip = 0;
// const lookups = await generateLookupsForAllReferences(attributesMap);
// --- Build lookups for each root-level attribute separately ---
let lookups: any[] = [];

for (const [attrName, attr] of Object.entries(attributesMap)) {
  // Reset visitedEntities for each root-level attribute
  const visitedEntities = new Set<string>();

  const singleAttrMap: Record<string, any> = { [attrName]: attr };
  const rootLookups = await generateLookupsForAllReferences(singleAttrMap, "", visitedEntities);

  lookups.push(...rootLookups);
}


while (true) {
  const aggregationPipeline: any[] = [...lookups];

  if (filters && Object.keys(filters).length > 0) {
    const transformedFilters = await transformFilterForAggregation(filters);
    transformedFilters["dataSourceVersionId"] = dataSourceVersion._id;
    aggregationPipeline.push({ $match: transformedFilters });
  } else {
    aggregationPipeline.push({ $match: { dataSourceVersionId: dataSourceVersion._id } });
  }


  aggregationPipeline.push({ $skip: skip }, { $limit: batchSize });
  console.log('final aggregationPipeline',JSON.stringify(aggregationPipeline));
  const versionValueData = await DataSourceVersionValue.aggregate(aggregationPipeline).exec();
  if (versionValueData.length === 0) break;
        // console.log('attributesMap',attributesMap);

  const transformedData = await Promise.all(
    versionValueData.map(async (doc: any) => {
      const newDoc = { ...doc };
      const rowData: Record<string, any> = { ...doc.rowData };
      for (const key in attributesMap) {
        const attr = attributesMap[key];
        // --------- Mapping attributes logic ---------
        if (attr.referenceEntitySetting?.relationType?.startsWith("mapping_") && rowData[key] != null) {
          const isMany = attr.referenceEntitySetting.relationType === "mapping_many_to_one";

          const RefModel = await getModelForEntity(attr.referenceEntitySetting.refEntityId);
          // console.log('RefModel',RefModel,doc);
          // Get display field name from reference setting
          const refFieldAttr = await getEntityAttribute(
            attr.referenceEntitySetting.refEntityId,
            attr.referenceEntitySetting.refEntityField
          );
          const displayField = refFieldAttr?.name;
          if (!displayField) continue;

          const rowIds: any[] = [];
          const subValuesMap: Record<string, any[]> = {};
          const topLevelAttribute = await getTopLevelAttribute(key);
          // console.log('doc.rowData.${topLevelAttribute}_resolved._id',`doc.rowData.${topLevelAttribute}_resolved`);
          // Find the document(s) where display field matches parent _id
          const resolvedObj = doc.rowData[`${topLevelAttribute}_resolved`];
          if (!resolvedObj) continue;

          const parentId = resolvedObj._id; // this is the ObjectId you want

          const relatedDocs: any[] = await RefModel.find({ [`rowData.${displayField}`]: parentId, 'status': 'active' }).lean();
          // console.log('relatedDocs',relatedDocs);
          for (const r of relatedDocs) {
            if (!r?.rowData) continue;

            rowIds.push(r._id);

            // Collect subValues for each subKey
            for (const subKey in r.rowData) {
              if (subKey === displayField) continue;

              const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);
              if (!refAttr?.referenceEntitySetting) continue;

              if (!subValuesMap[subKey]) subValuesMap[subKey] = [];
              subValuesMap[subKey].push(r.rowData[subKey]);
            }
          }

          // Resolve subValues in batch
          for (const subKey in subValuesMap) {
            const refAttr = await getAttributeByName(attr.referenceEntitySetting.refEntityId, subKey);
            const subValues = subValuesMap[subKey];

            await resolveRefAttribute(
              { referenceEntitySetting: refAttr.referenceEntitySetting },
              { rowData: { [subKey]: isMany ? subValues : subValues[0] } },
              `${key}.${subKey}`,
              rowData,
              attr
            );
          }

          // Assign main field ObjectId(s) if needed
          // rowData[key] = isMany ? rowIds : rowIds[0];
        }
        // --------- Already resolved references from aggregation pipeline ---------
        else if (rowData.hasOwnProperty(`${key}_resolved`)) {
          const refResolved = rowData[`${key}_resolved`];
          await resolveRefAttribute(attr, refResolved, key, rowData);
          delete rowData[`${key}_resolved`];
        }
      }

      // Flatten resolved nested fields
      const flatRowData = await flattenAllResolved(rowData);
      newDoc.rowData = flatRowData;

      return newDoc;
    })
  );
  // console.log('transformedData',transformedData);
  await processBatch(transformedData);
  skip += batchSize;
}

}



// Group cases by template.groupBy fields, handling nested refs
async function resolveFieldPath(attr: any, refAttributeId: (string | Types.ObjectId)[] = []) {
  let fieldPath = attr.name;
  // console.log('refAttributeId', refAttributeId);

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

  // console.log('fieldPath', fieldPath);
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
  // Resolve field paths in order and filter out non-existing fields
  const resolvedGroupBy: any[] = [];
  for (const gb of groupBy) {
    const attr = attributeMap.get(String(gb.attributeId));
    if (!attr) continue;

    const fieldPath = await resolveFieldPath(attr, gb.refAttributeId);

    // Only include if at least one row has this field
    const existsInData = cases.some(
      item => getNestedValue(item.rowData, fieldPath) !== undefined
    );
    if (!existsInData) continue;

    resolvedGroupBy.push({ ...gb, fieldPath });
  }

  // Recursive function for ordered grouping
  function groupRecursive(data: any[], level: number): Record<string, any> | any[] {
    if (level >= resolvedGroupBy.length) {
      return data; // no more levels, return cases array
    }

    const fieldPath = resolvedGroupBy[level].fieldPath;
    const grouped: Record<string, any> = {};

    for (const item of data) {
      let key = getNestedValue(item.rowData, fieldPath);

      // If the key is missing or null, skip this level
      if (key === undefined || key === null) {
        key = "Unknown";
      } else if (Array.isArray(key)) {
        // If multiple values exist, join them as string
        key = key.join(", ");
      } else {
        key = String(key);
      }

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

function getTopLevelAttribute(dotKey: string): string {
  return dotKey.split('.')[0]; // take everything before first dot
}
async function buildExtendedAttributeMap(entity: any): Promise<Record<string, any>> {
  const attributesMap: Record<string, any> = {};

  // Add direct attributes
  for (const attr of entity.attributes) {
    attributesMap[attr.name] = attr;

    // If this is a mapping relation, fetch referenced attributes
      if(attr?.referenceEntitySetting?.refEntityId){
      const refEntityId = attr.referenceEntitySetting.refEntityId.toString();
      const refEntity: any = await findEntityById(refEntityId);
      if (refEntity?.attributes) {
        for (const refAttr of refEntity.attributes) {
          // Avoid overwriting original key, prefix with mapping key
          const mapKey = `${attr.name}.${refAttr.name}`;
          attributesMap[mapKey] = refAttr;
        }
      }
    }
  }

  return attributesMap;
}


// Main function to prepare today's notifications
export async function prepareTodayNotifications(isForce = false) {
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

      if (!isDueToday(setting, today) && !isForce) {
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
      const dataSourceVersion: any = await getCurrentDataSourceVersion(dataSourceDetails._id);
      await processBatchedMatchingCases({
        schemaName,
        dataSourceVersion,
        entity,
        filters,
        batchSize: 1000,
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
        organizationId:notifType.organizationId,
        actionsLastUploadedDate: dataSourceVersion?.createdAt,
        source: "cron",
      });
      
      if (template.type === "single") {
        console.log("📬 Preparing single notifications");
        const preparedDocs: any = [];

        for (const caseData of allMatchingCases) {
          let ackId: any;
          if (Array.isArray(setting.acknowledge_to) && setting.acknowledge_to.length > 0) {
            let sender = await resolveRecipientsFromSetting(caseData, [setting.targetEntity], attributeMap);
            console.log(`🔑 Creating acknowledgment for case ${caseData._id}`);
            const ack = await NotificationAcknowledge.create({
              organizationId: notifType.organizationId,
              senderId: sender.length ? sender[0] : null ,
              notificationTriggerId: trigger._id,
              recipients: await resolveAckRecipients(caseData, setting, attributeMap),
              identifierKey: uniqueCode(20)
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
          if (Array.isArray(setting.acknowledge_to) && setting.acknowledge_to.length > 0) {
            let sender = await resolveRecipientsFromSetting(groupCases[0], [setting.targetEntity], attributeMap);
            console.log(`🔑 Creating acknowledgment for group ${groupKey}`);
            const ack = await NotificationAcknowledge.create({
              organizationId: notifType.organizationId,
              senderId: sender.length ? sender[0] : null,
              notificationTriggerId: trigger._id,
              recipients: await resolveAckRecipients(groupCases[0], setting, attributeMap),
              identifierKey: uniqueCode(20)
            });
            ackId = ack._id;
          }
          // console.log('groupKey',groupKey);
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

        if (preparedDocs.length > 0) {
          const inserted = await PreparedNotification.insertMany(preparedDocs);
          totalPrepared += inserted.length;

          // ✅ Schedule each prepared notification in BullMQ
          for (const notif of inserted) {
            await scheduleEmail(notif);
          }

          console.log(`✅ Inserted & scheduled ${inserted.length} notifications`);
        }
      }
    } catch (error) {
      console.error(`❌ Error preparing notifications for setting ${setting._id}:`, error);
    }
  }

  console.log(`🏁 Finished. Total notifications prepared: ${totalPrepared}`);
}

// Run directly if executed as standalone script
// prepareTodayNotifications();