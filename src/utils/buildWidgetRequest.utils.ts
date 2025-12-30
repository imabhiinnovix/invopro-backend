/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */
import { Types } from "mongoose";
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from "./common.utils";
import { getPlotTypeConfig, plotTypesConfig } from "../config/plotType.config";
import { getUserDataPermissionRecord } from "../database/services/common/userDataPermission.service";
import { getDataSourceVersion } from "../database/services/common/dataSourceVersion.services";

export const buildWidgetRequestPayload = async (widget: any) => {
  const {
    dataSourceId,
    entityId,
    dimensions = [],
    groupBy = [],
    plotType = [],
    aggregation,
    conditions = [],
    organizationId,
    createdBy,
  } = widget;

  const organization = organizationId;
  const dataSource = dataSourceId;
  const user = createdBy;

  if (!organization?.code) throw new Error("Organization not populated in widget");
  if (!dataSource?.code) throw new Error("DataSource not populated in widget");

  const orgCode = organization.code;
  const userId = user._id;

  const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode,
    versionCode: dataSource.code,
  });

  const query: any = {
    dataSourceId: new Types.ObjectId(dataSource._id),
    status: "active",
  };

  const dashboardFilters: any = { filters: {} };
  const filters: Record<string, any> = {};

  let dateGroupingMode: string | null = null;

  if (plotType?.length) {
    const mode = Array.isArray(plotType) ? plotType[0] : plotType;
    const validModes = plotTypesConfig.map((p) => p.type.toLowerCase());
    if (typeof mode === "string" && validModes.includes(mode.toLowerCase())) {
      dateGroupingMode = mode.toLowerCase();
    }
  }

  const getDateGroupingModeCondition = async (field: string, value: any) => {
    if (value == null || !dateGroupingMode) return;

    const raw = String(value);
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const config = getPlotTypeConfig(dateGroupingMode as any);

    if (dateGroupingMode === "monthly") {
      const [y, m] = raw.split("-");
      startDate = new Date(Date.UTC(+y, +m - 1, 1));
      endDate = new Date(Date.UTC(+y, +m, 0));
    } else if (dateGroupingMode === "weekly") {
      const [from, to] = raw.split("~");
      startDate = new Date(Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate()));
      endDate = new Date(Date.UTC(new Date(to).getUTCFullYear(), new Date(to).getUTCMonth(), new Date(to).getUTCDate()));
    } else if (dateGroupingMode === "yearly") {
      startDate = new Date(Date.UTC(+raw, 0, 1));
      endDate = new Date(Date.UTC(+raw, 11, 31));
    } else if (dateGroupingMode === "daily") {
      const d = new Date(raw);
      startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    } else if (dateGroupingMode === "quarterly" && config?.monthRange) {
      const [yearStr, quarterStr] = raw.split("-");
      const range = config.monthRange[quarterStr.toLowerCase()];
      if (range) {
        startDate = new Date(Date.UTC(+yearStr, range[0], 1));
        endDate = new Date(Date.UTC(+yearStr, range[1] + 1, 0));
      }
    }

    if (startDate && endDate) filters[field] = { $gte: startDate, $lte: endDate };
  };

  const isDueDaysField = (key: string) => key === "Derived.dueDays";
  const dueDaysFilterValue: string | null = null;

  const isDateField = (field: string) =>
    dataSource.fieldSettings?.some((f) => {
      const matchField = f.mappedAttributeName === field || f.label === field;
      return matchField && (f.type === "date" || f.type === "date-range");
    });

  // Dimensions
  dimensions.forEach((dimension: any) => {
    if (dimension && typeof dimension === "object") {
      const [field, value] = Object.entries(dimension)[0];
      if (isDateField(field) && dateGroupingMode) getDateGroupingModeCondition(field, value);
      else filters[field] = value;
    }
  });

  // GroupBy
  groupBy.forEach((group: any) => {
    if (group && typeof group === "object") {
      const [field, value] = Object.entries(group)[0];
      if (isDateField(field) && dateGroupingMode) getDateGroupingModeCondition(field, value);
      else filters[field] = value;
    }
  });

  dashboardFilters.filters = filters;

  // User permission conditions
  let finalConditions = [...conditions];
  const permission = await getUserDataPermissionRecord({
    userId,
    dataSourceId: dataSource._id,
    organizationId: organization._id,
  });

  if (permission?.conditions?.length) {
    const merged = new Map<string, any>();
    finalConditions.forEach((c) => merged.set(c.field, c));
    permission.conditions.forEach((c: any) => merged.set(c.field, c));
    finalConditions = Array.from(merged.values());
  }

  // -----------------------------
  // FETCH LATEST DATA SOURCE VERSION
  // -----------------------------
  const version = await getDataSourceVersion({
    query: { dataSourceId: dataSource._id, isCurrent: true, isActive: true },
    sort: { versionValue: -1 },
  });

  const dataSourceVersion = [version];
  const dataSourceVersionIdArray = dataSourceVersion.map((d) => new Types.ObjectId(d._id));

  // Add version array to query
  query.dataSourceVersionId = { $in: dataSourceVersionIdArray };

  // Sorting
  let effectiveSortBy: any = {};
  if (groupBy.length) effectiveSortBy[Object.keys(groupBy[0])[0]] = 1;
  else if (dimensions.length) effectiveSortBy[Object.keys(dimensions[0])[0]] = 1;

  return {
    schemaName,
    query,
    dashboardFilters,
    entityId,
    aggregation: { type: aggregation?.type || "count", attributeName: aggregation?.attributeName || "_id" },
    conditions: finalConditions,
    dashBoardType: "normal",
    dataSourceDetails: dataSource,
    isPaginate: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    sort: effectiveSortBy,
  };
};