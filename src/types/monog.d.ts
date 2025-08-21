import "mongoose";

declare module "mongoose" {
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    exec(): Promise<any>;
  }
}