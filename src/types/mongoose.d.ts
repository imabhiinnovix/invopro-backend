import "mongoose";
import { Types } from "mongoose";

declare module "mongoose" {

  /** Fix populate typing */
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    populate(
      path: string | any,
      select?: string | any,
      model?: any,
      match?: any
    ): this;
  }

  interface Aggregate<R> {
    populate(
      path: string | any,
      select?: string | any,
      model?: any,
      match?: any
    ): this;
  }

  /**
   * --------------------------------------------------
   * FIX: Patch generic Document definition
   * --------------------------------------------------
   */
  interface Document<TId = Types.ObjectId, TSchema = any>
    extends NodeJS.EventEmitter {
    _id: string | Types.ObjectId;
  }

  interface HydratedDocument<T, TId = Types.ObjectId> extends Document {
    _id: string | Types.ObjectId;
  }

  interface LeanDocument<T> {
    _id: string | Types.ObjectId;
  }
}