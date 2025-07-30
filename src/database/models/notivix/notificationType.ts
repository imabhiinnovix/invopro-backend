import { Schema, model, Types, Document } from 'mongoose';

// Interface: NotificationCondition
interface INotificationCondition {
  attributeId: Types.ObjectId;
  referenceEntityId?: Types.ObjectId;
  referenceEntityAttributeId?: Types.ObjectId;
  operator: 'eq' | 'lt' | 'gt' | 'in' | 'like';
  value: string;
}

// Interface: NotificationConditionGroup
interface INotificationConditionGroup {
  group_operator: 'AND' | 'OR';
  conditions: INotificationCondition[];
}

// Interface: NotificationType
export interface INotificationType extends Document {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  entityId: Types.ObjectId;
  triggerFieldId: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  conditionGroups: INotificationConditionGroup[];
}

// Embedded Schema: NotificationCondition
const notificationConditionSchema = new Schema<INotificationCondition>(
  {
    attributeId: { type: Schema.Types.ObjectId, required: true },
    referenceEntityId: { type: Schema.Types.ObjectId, ref: 'Entity' },
    referenceEntityAttributeId: { type: Schema.Types.ObjectId },
    operator: { type: String, enum: ['eq', 'lt', 'gt', 'in', 'like'], required: true },
    value: { type: String },
  },
  { _id: false }
);

// Embedded Schema: NotificationConditionGroup
const notificationConditionGroupSchema = new Schema<INotificationConditionGroup>(
  {
    group_operator: { type: String, enum: ['AND', 'OR'], required: true },
    conditions: { type: [notificationConditionSchema], default: [] },
  },
  { _id: false }
);

// Main Schema: NotificationType
const notificationTypeSchema = new Schema<INotificationType>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'Entity', required: true },
    triggerFieldId: { type: Schema.Types.ObjectId, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    conditionGroups: { type: [notificationConditionGroupSchema], default: [] },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Indexes (optional, based on use case)
notificationTypeSchema.index({ name: 1, organizationId: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const NotificationType = model<INotificationType>('notification_type', notificationTypeSchema);

export default NotificationType;
