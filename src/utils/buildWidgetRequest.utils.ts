/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */
import { Types } from "mongoose";
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from "./common.utils";
import { getUserDataPermissionRecord } from "../database/services/common/userDataPermission.service";
import { getDataSourceVersion } from "../database/services/common/dataSourceVersion.services";


export const buildWidgetRequestPayload = async (widget: any) => {
  let {
    dataSourceId,
    entityId,
    dimensions = [],
    groupBy = [],
    aggregation,
    conditions = [],
    organizationId,
    createdBy,
  } = widget;

  const organization = organizationId;
  const dataSource = dataSourceId;
  const user = createdBy;

  if (!organization?.code) {
    throw new Error("Organization not populated in widget");
  }

  if (!dataSource?.code) {
    throw new Error("DataSource not populated in widget");
  }

  const orgCode = organization.code;
  const userId = user._id;

  // ----------------------------------
  // Schema Name
  // ----------------------------------
  const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode,
    versionCode: dataSource.code,
  });

  // ----------------------------------
  // Base Query
  // ----------------------------------
  const query: any = {
    dataSourceId: new Types.ObjectId(dataSource._id),
    status: "active",
  };

  //  User permission logic (unchanged)
    const userPermission = await getUserDataPermissionRecord({
      userId,
      dataSourceId,
      organizationId,
    });

    if (userPermission?.conditions?.length) {
      const userConditionsMap = new Map(
        userPermission.conditions.map((c: any) => [c.field, c])
      );

      const mergedMap = new Map();
      for (const cond of conditions || []) mergedMap.set(cond.field, cond);
      for (const [field, cond] of userConditionsMap.entries())
        mergedMap.set(field, cond);

      conditions = Array.from(mergedMap.values());
    }

  

  // ----------------------------------
  // LATEST ACTIVE DATA SOURCE VERSION
  // ----------------------------------
  const version: any = await getDataSourceVersion({
    query: {
      dataSourceId: dataSource._id,
      isCurrent: true,
      isActive: true,
    },
    sort: { versionValue: -1 },
  });

  if (!version?._id) {
    throw new Error("Active data source version not found");
  }

  query.dataSourceVersionId = {
    $in: [new Types.ObjectId(version._id)],
  };

  // ----------------------------------
  // SORTING (UNCHANGED)
  // ----------------------------------
  let effectiveSortBy: any = {};

  if (groupBy.length) {
    effectiveSortBy[groupBy[0]] = 1;
  } else if (dimensions.length) {
    effectiveSortBy[dimensions[0]] = 1;
  }

  // ----------------------------------
  // FINAL PAYLOAD
  // ----------------------------------
  return {
    schemaName,
    query,
    dashboardFilters: {},
    entityId,
    aggregation: {
      type: aggregation?.type || "count",
      attributeName: aggregation?.attributeName || "_id",
    },
    conditions,
    dashBoardType: "normal",
    dataSourceDetails: dataSource,
    isPaginate: true,
    page: 1,
    limit: 1000,
    sort: effectiveSortBy,
  };
};
