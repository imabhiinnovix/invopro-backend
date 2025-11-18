// src/types/mongoose.d.ts
import "mongoose";
import { Types } from "mongoose";

declare module "mongoose" {
  // force global ObjectId type to accept string
  namespace Schema {
    interface Types {
      ObjectId: string | Types.ObjectId;
    }
  }

  // override global document _id
  interface Document {
    _id: string | Types.ObjectId;
  }

  // override hydrated docs
  interface HydratedDocument<T = any> extends Document {
    _id: string | Types.ObjectId;
  }

  // override lean docs
  interface LeanDocument<T = any> {
    _id: string | Types.ObjectId;
  }

  // override populate typing
  interface Query<ResultType = any, DocType = any> {
    populate(path: any, select?: any, model?: any, match?: any): this;
  }

  interface Aggregate<R = any> {
    populate(path: any, select?: any, model?: any, match?: any): this;
  }
}