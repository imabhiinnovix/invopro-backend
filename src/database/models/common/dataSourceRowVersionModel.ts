/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import {
  Schema,
  model,
  models,
  connection,
  Document,
  Types,
  Model,
} from 'mongoose';

export interface IDataSourceRowVersion extends Document {
  organizationId: Types.ObjectId;
  entityId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  dataSourceVersionId: Types.ObjectId;

  recordId?: Types.ObjectId;
  version?: number;

  versionValue: string;

  auditLevel: 'INVOICE' | 'LINE_ITEM';

  rowData: Record<string, any>;

  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  changeType:
    | 'UPLOAD'
    | 'EXTRACTION'
    | 'VALIDATION'
    | 'EDIT'
    | 'REVALIDATION'
    | 'APPROVAL'
    | 'REJECTION'
    | 'PAYMENT_STATUS';

  source: 'MANUAL' | 'AI' | 'SYSTEM' | 'API';

  changedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}


// 🔥 SCHEMA
const dataSourceRowVersionSchema = new Schema<IDataSourceRowVersion>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    dataSourceId: { type: Schema.Types.ObjectId, ref: 'DataSource' },
    dataSourceVersionId: { type: Schema.Types.ObjectId, ref: 'data_source_version' },

    recordId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    version: {
      type: Number,
    },

    versionValue: {
      type: String,
      required: true,
      index: true,
    },

    auditLevel: {
      type: String,
      enum: ['INVOICE', 'LINE_ITEM'],
      required: true,
      index: true,
    },

    rowData: {
      type: Schema.Types.Mixed,
    },

    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],

    changeType: {
      type: String,
      enum: [
        'UPLOAD',
        'EXTRACTION',
        'VALIDATION',
        'EDIT',
        'REVALIDATION',
        'APPROVAL',
        'REJECTION',
        'PAYMENT_STATUS',
      ],
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ['MANUAL', 'AI', 'SYSTEM', 'API'],
      required: true,
      index: true,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user'
    },
  },
  {
    timestamps: true,
  }
);


// 🔥 INDEXES

// line item version history
dataSourceRowVersionSchema.index({
  recordId: 1,
  version: -1,
});

// datasource filtering
dataSourceRowVersionSchema.index({
  dataSourceId: 1,
  entityId: 1,
});

dataSourceRowVersionSchema.index({
  dataSourceVersionId: 1,
});

// version grouping
dataSourceRowVersionSchema.index({
  versionValue: 1,
  recordId: 1,
  version: -1,
});

// filtering
dataSourceRowVersionSchema.index({
  recordId: 1,
  changeType: 1,
});

dataSourceRowVersionSchema.index({
  recordId: 1,
  source: 1,
});

dataSourceRowVersionSchema.index({
  recordId: 1,
  auditLevel: 1,
});

// invoice level history
dataSourceRowVersionSchema.index({
  dataSourceVersionId: 1,
  auditLevel: 1,
});

// timeline
dataSourceRowVersionSchema.index({
  createdAt: 1,
});


// 🔥 Unique only for line-item versions
dataSourceRowVersionSchema.index(
  { recordId: 1, version: 1 },
  {
    unique: true,
    partialFilterExpression: {
      auditLevel: 'LINE_ITEM',
      recordId: { $exists: true },
      version: { $exists: true },
    },
  }
);


// ✅ EXPECTED FIELDS
const expectedFields = Object.keys(
  dataSourceRowVersionSchema.paths
);


// ✅ MODEL CREATOR
const createDataSourceRowVersionModel = (
  schemaName: string
): Model<IDataSourceRowVersion> => {
  const modelName = schemaName;

  const existingModel =
    models[modelName] as Model<IDataSourceRowVersion>;

  if (existingModel) {
    const existingFields = Object.keys(
      existingModel.schema.paths
    );

    const missingFields = expectedFields.filter(
      (f) => !existingFields.includes(f)
    );

    if (missingFields.length > 0) {
      console.warn(
        `Schema for ${modelName} is missing fields: ${missingFields.join(
          ', '
        )}, refreshing model...`
      );

      connection.deleteModel(modelName);
    } else {
      return existingModel;
    }
  }

  return model<IDataSourceRowVersion>(
    modelName,
    dataSourceRowVersionSchema
  );
};

export default createDataSourceRowVersionModel;