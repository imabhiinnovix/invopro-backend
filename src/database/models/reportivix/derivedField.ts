import { Schema, model, Types } from 'mongoose';
import config from '../../../config';

const ConditionSchema = new Schema(
  {
    fieldId: { type: Schema.Types.ObjectId, required: true }, // e.g., "Entity", "ActionDueItem"
    refFieldId: { type: Schema.Types.ObjectId, required: false }, // e.g., "owner_id", "_id"
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
    matchValues: [{ type: Schema.Types.Mixed }],
  },
  { _id: false }
);

const ValueRuleSchema = new Schema(
  {
    value: { type: String, required: true },
    conditionOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [ConditionSchema],
  },
  { _id: true }
);

const DerivedFieldSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g., "report_category"
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true }, // Entities this derived field applies to
    persist: { type: Boolean, default: false }, // If value should be saved in DB
    type: {
      type: String,
      required: true,
      enum: config.FIELD_TYPE_ENUM,
    },
    valueRules: [ValueRuleSchema],
  },
  { timestamps: true }
);

export const DerivedField = model('DerivedField', DerivedFieldSchema);
