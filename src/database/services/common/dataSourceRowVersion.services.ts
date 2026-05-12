/* eslint-disable @typescript-eslint/no-explicit-any */
import createDataSourceRowVersionModel from '../../models/common/dataSourceRowVersionModel';
import mongoose, { Types, Model } from 'mongoose';
import { IDataSourceRowVersion } from '../../models/common/dataSourceRowVersionModel';


// 🔥 helper: calculate changes (diff)
export const getRowChanges = (
  oldData: Record<string, any> = {},
  newData: Record<string, any> = {}
) => {
  const changes: any[] = [];

  const keys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of keys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
};


// ✅ GET MODEL (typed wrapper to avoid TS issues)
const getModel = (schemaName: string): Model<IDataSourceRowVersion> => {
  return createDataSourceRowVersionModel(schemaName);
};


// ✅ CREATE ROW VERSION (EDIT / AI / SYSTEM)
export const createRowVersion = async ({
  schemaName,
  entityId,
  dataSourceId,
  dataSourceVersionId,
  recordId,
  rowData,
  changeType,
  source,
  versionValue,
  changedBy,
}: {
  schemaName: string;
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  recordId: string;
  rowData: any;
  changeType: any;
  source: any;
  versionValue: string;
  changedBy?: Types.ObjectId;
}) => {
  const Model = getModel(schemaName);

  // 🔥 latest version lookup (fast)
  const last: any = await Model.findOne({ recordId })
    .sort({ version: -1 })
    .select({ version: 1, rowData: 1 })
    .lean();

  const version = last ? last.version + 1 : 1;

  let changes: any[] = [];

  if (last?.rowData) {
    changes = getRowChanges(last.rowData, rowData);
  }

  return await Model.create({
    entityId,
    dataSourceId,
    dataSourceVersionId,
    recordId,
    version,
    versionValue,
    rowData,
    auditLevel: 'LINE_ITEM',
    changes,
    changeType,
    source,
    changedBy,
  });
};


// ✅ BULK INSERT (UPLOAD → FIRST VERSION)
export const bulkCreateRowVersionsFromInserted = async ({
  schemaName,
  insertedRows,
  entityId,
  dataSourceId,
  dataSourceVersionId,
  userId,
  versionValue,
}: {
  schemaName: string;
  insertedRows: any[];
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  userId: Types.ObjectId;
  versionValue: string;
}) => {
  if (!insertedRows?.length) return;

  const Model = getModel(schemaName);

  const now = new Date();

  const bulkDocs = insertedRows.map((doc: any) => ({
    entityId,
    dataSourceId,
    dataSourceVersionId,
    recordId: doc._id.toString(),
    version: 1,
    versionValue,
    rowData: doc.rowData,
    changeType: 'UPLOAD',
    source: 'SYSTEM',
    auditLevel: 'LINE_ITEM',
    changedBy: userId,
    createdAt: now,
    updatedAt: now,
  }));

  await Model.insertMany(bulkDocs, { ordered: false });
};


// ✅ GET FULL HISTORY (PAGINATED)
export const getRowVersionHistory = async ({
  schemaName,
  versionId,
  recordId,
  page = 1,
  limit = 10,
}: {
  schemaName: string;
  versionId: string;
  recordId?: string;
  page?: number;
  limit?: number;
}) => {
  const Model = getModel(schemaName);

  const query: any = {
    dataSourceVersionId: versionId,
  };

  if (recordId) {
    query.recordId = recordId;
    query.auditLevel = 'LINE_ITEM';
  } else {
    query.auditLevel = 'INVOICE';
  }

  const sort: any = recordId
    ? { version: -1 }
    : { createdAt: -1 };

  const [data, totalCount] = await Promise.all([
    Model.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('changedBy', 'firstName lastName')
      .lean(),

    Model.countDocuments(query),
  ]);

  return {
    data,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
};


// ✅ GET LATEST VERSION
export const getLatestRowVersion = async ({
  schemaName,
  recordId,
}: {
  schemaName: string;
  recordId: string;
}) => {
  const Model = getModel(schemaName);

  return await Model.findOne({ recordId })
    .sort({ version: -1 })
    .lean();
};


// ✅ FLEXIBLE QUERY
export const findRowVersions = async ({
  schemaName,
  query,
  select = '',
  sort = { version: -1 },
  populate,
}: {
  schemaName: string;
  query: any;
  select?: string;
  sort?: any;
  populate?: any[];
}) => {
  const Model = getModel(schemaName);

  let q: any = Model.find(query)
    .select(select)
    .sort(sort);

  if (populate?.length) {
    for (const field of populate) {
      q = q.populate(field);
    }
  }

  return await q.lean().exec();
};


// ✅ COUNT
export const countRowVersions = async ({
  schemaName,
  query,
}: {
  schemaName: string;
  query: any;
}) => {
  const Model = getModel(schemaName);

  return await Model.countDocuments(query);
};

// ✅ CREATE INVOICE LEVEL LOG
export const createInvoiceAuditLog = async ({
  schemaName,
  entityId,
  dataSourceId,
  dataSourceVersionId,
  rowData = {},
  changeType,
  source,
  versionValue,
  changedBy,
}: {
  schemaName: string;
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;
  rowData?: any;
  changeType: 'UPLOAD' | 'EXTRACTION';
  source: any;
  versionValue: string;
  changedBy?: Types.ObjectId;
}) => {
  const Model = getModel(schemaName);

  return await Model.create({
    entityId,
    dataSourceId,
    dataSourceVersionId,
    versionValue,
    auditLevel: 'INVOICE',
    rowData,
    changeType,
    source,
    changedBy,
  });
};