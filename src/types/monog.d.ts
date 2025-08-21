import "mongoose";

declare module "mongoose" {
  // Simplify exec() return types while keeping strict typing intact
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    exec(): Promise<ResultType>;
  }

  // Ensure .lean() works without deep type explosion
  interface DocumentQuery<T, DocType extends T, QueryHelpers = {}> {
    lean(): QueryWithHelpers<
      Require_id<LeanDocument<T>>,
      DocType,
      QueryHelpers
    >;
  }
}