/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";

// Enums
export enum OperatorType {
  EQUALS = 'equal',
  LESS_THAN = 'lt',
  LESS_THAN_EQUALS = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_EQUALS = 'gte',
  NOT_EQUALS = 'ne',
  BLANK = 'blank',
  NOT_BLANK = 'notblank',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notcontains',
  STARTS_WITH = 'startswith',
  ENDS_WITH = 'endswith',
  BETWEEN = 'between',
  BEFORE = 'before',
  AFTER = 'after',
  ON = 'on',
  NOT_ON = 'noton',
}

export enum AggregationType {
  COUNT = 'Count',
  SUM = 'Sum',
  AVERAGE = 'Average',
}

// Helper type for IDs returned by Mongoose
export type MongoId = string | Types.ObjectId;

// Types
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface Condition {
  field: string;
  operator: OperatorType;
  value: any;
}

export interface Aggregation {
  type: AggregationType;
  attributeName: string;
}

export interface Widget {
  dataSourceId: { _id: MongoId };
  dataSourceVersionId: MongoId;
  dimensions: string[];
  groupBy: string[];
  conditions?: Condition[];
  aggregation: Aggregation;
  entity: any;
  widgetType: string;
}

// MongoDB specific types
export interface MongoDateRange {
  $gte: Date;
  $lt: Date;
}

export interface MongoOperator {
  $lt?: any;
  $lte?: any;
  $gt?: any;
  $gte?: any;
  $ne?: any;
  $eq?: any;
  $regex?: string;
  $options?: string;
  $not?: any;
}

export type MatchCondition = Record<string, any>;
export type GroupFields = Record<string, string>;
export type AggregationOperation = Record<string, { $sum: number | string } | { $avg: string }>;

// Response types
export interface DashboardWidgetResponse {
  success: boolean;
  message: string;
  data: {
    _id: MongoId;
    dataSourceId: {
      _id: MongoId;
      code: string;
    };
    data: any[];
  };
}

export interface DataSourceVersion {
  _id: MongoId;
  isCurrent: boolean;
  isActive: boolean;
}

export interface DashboardWidget {
  _id: MongoId;
  dataSourceId: {
    _id: MongoId;
    code: string;
  };
  data?: any[];
}