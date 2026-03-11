/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema, model, Types, Document } from "mongoose";

export interface IActivityRateCard extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;
  engagementLetterId: Types.ObjectId;

  costCode: string;
  costType: string;

  rateType: "fixed" | "hourly" | "per_word" | "per_page" | "upper_cap";

  rate?: number;
  minRate?: number;
  maxRate?: number;

  currency: string;

  languageFrom?: string;
  languageTo?: string;

  upperCap?: number;

  status: "active" | "inactive";

  createdAt: Date;
  updatedAt: Date;
}

const activityRateCardSchema = new Schema<IActivityRateCard>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    engagementLetterId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    costCode: {
      type: String,
      required: true,
      index: true,
    },

    costType: {
      type: String,
      required: true,
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

activityRateCardSchema.index(
  {
    vendorId: 1,
    engagementLetterId: 1,
    costCode: 1,
    costType: 1,
    languageFrom: 1,
    languageTo: 1,
  },
  { unique: true }
);

export default model<IActivityRateCard>(
  "ActivityRateCard",
  activityRateCardSchema
);