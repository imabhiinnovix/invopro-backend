/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import CentralFile from '../../models/common/centralFile';

export const findCentralFiles = async (query: any) => {
  return await CentralFile.find(query);
};

export const findLatestCentralFile = async (query: any) => {
  return await CentralFile.findOne(query).sort({ version: -1 });
};

export const findCentralFileById = async (id: string) => {
  return await CentralFile.findById(id);
};

export const createCentralFile = async (data: any) => {
  const file = new CentralFile(data);
  return await file.save();
};

export const updateCentralFiles = async (query: any, updateData: any) => {
  return await CentralFile.updateMany(query, updateData);
};

export const updateCentralFileById = async (id: string, updateData: any) => {
  return await CentralFile.findByIdAndUpdate(id, updateData, { new: true });
};

export const getCentralFileList = async ({ query, page, limit }: any) => {
  const data = await CentralFile.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalCount = await CentralFile.countDocuments(query);

  return { data, totalCount };
};


export const getLatestCentralMappingAndSeparator = async ({
  organizationId,
  customReportId,
  dataSourceId,
  year,
  month,
  week,
}: any) => {

  // ✅ At least one required
  if (!customReportId && !dataSourceId) {
    throw new Error(
      'Either customReportId or dataSourceId must be provided.'
    );
  }

  // ---------------------------------------
  // Build Dynamic Query
  // ---------------------------------------

  const query: any = {
    organizationId,
    year,
    month,
    isLatest: true,
    validationStatus: 'validated',
  };

  // ✅ Add week only if valid
  if (
    week !== undefined &&
    week !== null &&
    week !== '' &&
    !isNaN(Number(week))
  ) {
    query.week = Number(week);
  }

  // ✅ If customReportId present → use it
  if (customReportId) {
    query.reportId = customReportId;
  }

  // ✅ If only dataSourceId present
  if (!customReportId && dataSourceId) {
    query.dataSourceId = dataSourceId;
  }

  // ---------------------------------------
  // Fetch Central Files
  // ---------------------------------------

  const centralFiles = await findCentralFiles(query);

  const mapping: Record<string, any> = {};
  const separator: Record<string, any> = {};
  const processedDataSource = new Set<string>();

  // ---------------------------------------
  // Deduplicate by datasourceId
  // ---------------------------------------

  for (const file of centralFiles) {
    const dsId = file?.dataSourceId?.toString();
    if (!dsId) continue;

    if (processedDataSource.has(dsId)) continue;

    mapping[dsId] = file.mapping || {};
    separator[dsId] = file.separator || {};

    processedDataSource.add(dsId);
  }

  return { mapping, separator };
};
