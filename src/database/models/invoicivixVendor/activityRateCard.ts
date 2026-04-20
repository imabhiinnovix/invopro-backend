/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema, model, Types, Document } from "mongoose";

export interface IActivityRateCard extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;

  activityEntity: "vendor" | "attorney" | "subvendor";

  vendorId: Types.ObjectId;
  attorneyId?: Types.ObjectId | null;
  subVendorId?: Types.ObjectId | null;

  engagementLetterId: Types.ObjectId;

  costCode?: string;
  costType?: string;

  rateType: "fixed" | "hourly" | "per_word" | "per_page" | "upper_cap";

  rate?: number;
  minRate?: number;
  maxRate?: number;

  currency: string;

  languageFrom?: string;
  languageTo?: string;

  upperCap?: number;

   conversion?: {
    baseCurrency: string;
    targetCurrency: string;
    rate: number;
  };

  status: "active" | "inactive";

  createdAt: Date;
  updatedAt: Date;
}

const activityRateCardSchema = new Schema<IActivityRateCard>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Organization",
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "user",
      index: true,
    },

    activityEntity: {
      type: String,
      enum: ["vendor", "attorney", "subvendor"],
      default: "vendor",
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Vendor",
      index: true,
    },

    attorneyId: {
      type: Schema.Types.ObjectId,
      ref: "VendorAttorney",
      default: null,
      index: true,
    },

    subVendorId: {
      type: Schema.Types.ObjectId,
      ref: "SubVendor",
      default: null,
      index: true,
    },

    engagementLetterId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    costCode: {
      type: String,
      index: true,
    },

    costType: {
      type: String,
      index: true,
    },

    rateType: {
      type: String,
      enum: ["fixed", "hourly", "per_word", "per_page", "upper_cap"],
      required: true,
    },

    rate: Number,

    minRate: Number,

    maxRate: Number,

    currency: {
      type: String,
      required: true,
    },

    languageFrom: String,

    languageTo: String,

    upperCap: Number,

    conversion: {
      baseCurrency: { type: String },
      targetCurrency: { type: String },
      rate: { type: Number },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

activityRateCardSchema.index(
  {
    activityEntity: 1,
    vendorId: 1,
    attorneyId: 1,
    subVendorId: 1,
    engagementLetterId: 1,
    costCode: 1,
    costType: 1,
    languageFrom: 1,
    languageTo: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
      costCode: { $exists: true, $ne: null },
      costType: { $exists: true, $ne: null },
      languageFrom: { $exists: true, $ne: null },
      languageTo: { $exists: true, $ne: null }
    }
  }
);

export default model<IActivityRateCard>(
  "ActivityRateCard",
  activityRateCardSchema
);