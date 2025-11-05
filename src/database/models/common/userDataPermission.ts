import { Schema, model, Types, Document } from "mongoose";

interface IDataPermissionCondition {
  field: string;
  operator: string;
  value: any;
  fieldType: string;
}

export interface IUserDataPermission extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  dataSourceId: Types.ObjectId;
  conditions: IDataPermissionCondition[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const dataPermissionConditionSchema = new Schema<IDataPermissionCondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
    fieldType: { type: String },
  },
  { _id: false }
);

const userDataPermissionSchema = new Schema<IUserDataPermission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    dataSourceId: { type: Schema.Types.ObjectId, ref: "data_source", required: true },
    conditions: { type: [dataPermissionConditionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "user" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

userDataPermissionSchema.index({ userId: 1, dataSourceId: 1 }, { unique: true });

const UserDataPermission = model<IUserDataPermission>('user_data_permission', userDataPermissionSchema);
export default UserDataPermission;