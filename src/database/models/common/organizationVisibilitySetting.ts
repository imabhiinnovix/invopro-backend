/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from "mongoose";

export interface IOrganizationVisibilitySetting extends Document {
  organizationId: Types.ObjectId;

  dataSourceId?: Types.ObjectId | null;    // datasource-level visibility
  attributeId?: Types.ObjectId | null;     // attribute-level visibility
  refAttributeId?: Types.ObjectId[];       // reference/nested attributes

  visibility: "primary" | "secondary" | "hide";

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const organizationVisibilitySettingSchema =
  new Schema<IOrganizationVisibilitySetting>(
    {
      organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },

      dataSourceId: {
        type: Schema.Types.ObjectId,
        ref: "data_source",
        default: null,
        index: true,
      },

      attributeId: {
        type: Schema.Types.ObjectId,
        default: null,
        index: true,
      },

      refAttributeId: {
        type: [Schema.Types.ObjectId],
        default: [],
      },

      visibility: {
        type: String,
        enum: ["primary", "secondary", "hide"],
        required: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    },
    {
      timestamps: true,
    }
  );

// Optional: prevent duplicate overrides for same scope
organizationVisibilitySettingSchema.index(
  { organizationId: 1, dataSourceId: 1, attributeId: 1, refAttributeId: 1 },
  { unique: false }
);

export const OrganizationVisibilitySetting = model<IOrganizationVisibilitySetting>(
  "organization_visibility_setting",
  organizationVisibilitySettingSchema
);