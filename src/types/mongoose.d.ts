// src/types/mongoose.d.ts
import "mongoose";
import { Types } from "mongoose";

declare module "mongoose" {
  /**
   * Lightweight populate override
   */
  interface Query<ResultType = any, DocType = any, THelpers = any, RawDocType = any> {
    populate(
      path: any,
      select?: any,
      model?: any,
      match?: any
    ): this;
  }

  /**
   * Fix: Allow _id to be string | ObjectId
   */
  interface Document {
    _id: string | Types.ObjectId;
  }
}