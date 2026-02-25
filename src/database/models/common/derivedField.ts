/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Types } from 'mongoose';
import config from '../../../config';

const ConditionSchema = new Schema(
  {
    fieldId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    refFieldId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    operator: {
      type: String,
      enum: [
        'equals',
        'in',
        'not_in',
        'exists',
        'not_exists',
        'match_case_insensitive_array',
        'not_match_case_insensitive_array',
      ],
      required: true,
    },
    matchValues: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false }
);

const ValueRuleSchema = new Schema(
  {
    value: { type: String, required: true },
    conditionOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: {
      type: [ConditionSchema],
      default: [],
    },
  },
  { _id: true }
);

const DerivedFieldSchema = new Schema(
  {
    name: { type: String, required: true }, // ← ❌ removed unique: true
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    persist: { type: Boolean, default: false },
    type: {
      type: String,
      required: true,
      enum: config.FIELD_TYPE_ENUM,
    },
    valueRules: {
      type: [ValueRuleSchema],
      default: [],
    },
  },
  { timestamps: true }
);

/**
 * ✅ Add compound unique index: (name + entityId)
 */
DerivedFieldSchema.index({ name: 1, entityId: 1 }, { unique: true });

export const DerivedField = model('DerivedField', DerivedFieldSchema);