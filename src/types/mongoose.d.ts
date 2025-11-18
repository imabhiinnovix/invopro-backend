// src/types/mongoose.d.ts
import "mongoose";

declare module "mongoose" {
  // Override populate typing to be lightweight
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    populate(
      path: string | any,
      select?: string | any,
      model?: any,
      match?: any
    ): this;
  }

  // All mongoose documents will use _id: string | ObjectId
  interface Document {
    _id: string | Types.ObjectId;
  }
}