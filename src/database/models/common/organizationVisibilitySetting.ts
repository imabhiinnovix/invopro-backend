/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from "mongoose";

export interface IAttributeVisibility {
  attributeId: Types.ObjectId;
  visibility: "primary" | "secondary" | "hide";
  refAttributeId?: Types.ObjectId[];
}

export interface IOrganizationVisibilitySetting extends Document {
  organizationId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  visibility: "primary" | "secondary" | "hide"; // Root-level visibility
  attributes: IAttributeVisibility[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const attributeVisibilitySchema = new Schema<IAttributeVisibility>(
  {
    attributeId: { type: Schema.Types.ObjectId, ref: "Attribute", required: true },
    visibility: {
      type: String,
      enum: ["primary", "secondary", "hide"],
      required: true,
    },
    refAttributeId: { type: [Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const organizationVisibilitySettingSchema = new Schema<IOrganizationVisibilitySetting>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: "DataSource",
      required: true,
      index: true,
    },

    visibility: {  // Root-level visibility for the data source
      type: String,
      enum: ["primary", "secondary", "hide"],
      required: true,
    },

    attributes: {
      type: [attributeVisibilitySchema],
      default: [],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "user" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

organizationVisibilitySettingSchema.index(
  { organizationId: 1, dataSourceId: 1 },
  { unique: true }
);

export const OrganizationVisibilitySetting = model<IOrganizationVisibilitySetting>(
  "organization_visibility_setting",
  organizationVisibilitySettingSchema
);