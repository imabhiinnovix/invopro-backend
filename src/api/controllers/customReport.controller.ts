import { Request, Response, NextFunction } from 'express';

import * as customReportServices from '../../database/services/customReport.services';
import * as dataSourceVersionServices from '../../database/services/dataSourceVersion.services';
import * as reportRequestService from '../../database/services/reportRequest.services';
import * as dataSourceService from '../../database/services/dataSource.services';

import { DateTime } from 'luxon';
import { generateMonthlyIpReport } from '../../functions/reports/monthlyip';
import path from 'path';

import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import { generateSupplementalIpReport } from '../../functions/reports/supplementalip';
import { CustomReportModelAccess } from '../../database/models/customReportModels';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import * as dataSourceVersionValueService from '../../database/services/defaultDataSourceVersionValue.services';
import mongoose from 'mongoose';
import { transformMonthlyIpData, transformMonthlySTCData } from '../../utils/common.report';
const ObjectId = mongoose.Types.ObjectId;

export const generateCustomReportsFunction = async ({
  userId,
  organizationId,
  versionValue,
  customReportId,
  orgCode,
  reportRequestId,
  isRowData,
}: {
  userId: string;
  organizationId: string;
  versionValue: string;
  customReportId: string;
  orgCode: string;
  reportRequestId?: any;
  isRowData?: boolean;
}) => {
  try {
    const customReportDetails = await customReportServices.findCustomReportById(customReportId);

    if (!customReportDetails) {
      throw new Error('Custom report not found');
    }

    // Extract all data source IDs
    const dataSourceIds = customReportDetails.dataSourceIds.map((ds) => ds.dataSourceId);

    const requiredDataSourceIds = customReportDetails.dataSourceIds
      .filter((ds) => ds.isRequired === true)
      .map((ds) => ds.dataSourceId);

    const dataSourceVersionDetails = await dataSourceVersionServices.getDataSourceVersionList({
      query: { dataSourceId: { $in: dataSourceIds }, versionValue: versionValue, isCurrent: true },
    });

    const foundRequiredDataSourceIds = dataSourceVersionDetails.data.map((dsv) => dsv.dataSourceId.toString());
    const missingRequiredIds = requiredDataSourceIds.filter(
      (id) => !foundRequiredDataSourceIds.includes(id.toString())
    );

    if (missingRequiredIds.length > 0) {
      let notFoundItems = customReportDetails.dataSourceIds.filter((ds) =>
        missingRequiredIds.includes(ds.dataSourceId.toString())
      );

      let notFoundFileNames = notFoundItems.map((dsv) => dsv.fileDetails);
      let flattenedFileNames = notFoundFileNames.flatMap((files) => files.map((file) => file.name));

      console.log(
        `Not all required data is available for this report. Please upload the following files before generating the report: ${versionValue}. ${flattenedFileNames.join(', ')}`
      );
      throw new Error(
        `Not all required data is available for this report. Please upload the following files before generating the report: ${versionValue}. ${flattenedFileNames.join(', ')}`
      );
    }

    const currentDateTime = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss');

    const fileName = `${customReportDetails.reportName}_${versionValue}_${currentDateTime}.xlsx`;
    let reportRequestPayload: any = {
      organizationId: organizationId,
      versionValue: versionValue,
      customReportId: customReportDetails._id,
      status: 'processing',
      fileName: fileName,
      filePath: path.join('uploads', organizationId, userId, 'generatedReports', `${fileName}`),
      fileType: 'xlsx',
      createdBy: userId,
    };
    if (reportRequestId) {
      reportRequestPayload = await reportRequestService.findReportRequestById(reportRequestId);
    }
    if (!reportRequestId) {
      const requestedReport = await reportRequestService.createReportRequest(reportRequestPayload);
      reportRequestId = requestedReport._id;
    }
    const customReportModel = await CustomReportModelAccess({ orgCode });
    if (customReportDetails.reportName.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() === 'monthlyip') {
      const versionMap = Object.fromEntries(
        dataSourceVersionDetails.data.map((v) => [v.dataSourceId.toString(), v._id.toString()])
      );

      const disclosureDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'disclosure');

      const portfolioDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'portfolio');

      const sabicipDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'sabicip');

      const ctclinsabDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'ctclinsab');

      const annuitiesbDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'annuities');

      const staticNewFilingsDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'newfilings');

      const currentStaticEstimatesDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'estimates');
      const monthlyIpDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'monthlyipglobal');
      const monthlyipstcDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'monthlyipstc');

      const staticProjectOpenedDataSource = customReportDetails.dataSourceIds.find(
        (ds) => ds.code === 'projectsopened'
      );
      const data = await generateMonthlyIpReport({
        reportRequestPayload,
        requestedReportId: reportRequestId as string,
        sampleFilePath: customReportDetails.sampleFilePath!,
        disclosureDataSourceVersionId: versionMap[disclosureDataSource?.dataSourceId!],
        portfolioDataSourceVersionId: versionMap[portfolioDataSource?.dataSourceId!],
        sabicipDataSourceVersionId: versionMap[sabicipDataSource?.dataSourceId!],
        ctclinsabDataSourceVersionId: versionMap[ctclinsabDataSource?.dataSourceId!],
        annuitiesbDataSourceVersionId: versionMap[annuitiesbDataSource?.dataSourceId!],
        staticNewFilingsDataSourceId: staticNewFilingsDataSource?.dataSourceId!,
        staticEstimatesDataSourceId: currentStaticEstimatesDataSource?.dataSourceId!,
        staticProjectOpenedDataSourceId: staticProjectOpenedDataSource?.dataSourceId!,
        monthlyIpDataSource: monthlyIpDataSource?.dataSourceId!,
        monthlyipstcDataSource: monthlyipstcDataSource?.dataSourceId!,
        isRowData,
        userId,
        organizationId,
        orgCode,
        customReportModel,
        headers: customReportDetails.headers,
      });

      return data;
    } else if (customReportDetails.reportName.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() === 'supplementalip') {
      const versionMap = Object.fromEntries(
        dataSourceVersionDetails.data.map((v) => [v.dataSourceId.toString(), v._id.toString()])
      );

      const disclosureDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'disclosure');

      const portfolioDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'portfolio');

      const sabicipDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'sabicip');

      const ctclinsabDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'ctclinsab');

      const annuitiesbDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'annuities');

      const sabicContractDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'sabiccontracts');

      const shppContractDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'shppcontracts');

      const ksaContractDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'ksacontracts');

      const attorneyMappingDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'attorneymapping');

      const agreementTypeMappingDataSource = customReportDetails.dataSourceIds.find(
        (ds) => ds.code === 'agreementtypemapping'
      );

      const ipAnalystDashboardDataSource = customReportDetails.dataSourceIds.find(
        (ds) => ds.code === 'ipanalystdashboard'
      );

      const shppAccoladeDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'shppaccolade');

      const sabicAccoladeDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'sabicaccolade');

      const data = await generateSupplementalIpReport({
        reportRequestPayload,
        requestedReportId: reportRequestId,
        sampleFilePath: customReportDetails.sampleFilePath!,
        disclosureDataSourceVersionId: versionMap[disclosureDataSource?.dataSourceId!],
        portfolioDataSourceVersionId: versionMap[portfolioDataSource?.dataSourceId!],
        sabicipDataSourceVersionId: versionMap[sabicipDataSource?.dataSourceId!],
        ctclinsabDataSourceVersionId: versionMap[ctclinsabDataSource?.dataSourceId!],
        annuitiesbDataSourceVersionId: versionMap[annuitiesbDataSource?.dataSourceId!],
        sabicContractsDataSourceVersionId: versionMap[sabicContractDataSource?.dataSourceId!],
        shppContractsDataSourceVersionId: versionMap[shppContractDataSource?.dataSourceId!],
        ksaContractsDataSourceVersionId: versionMap[ksaContractDataSource?.dataSourceId!],
        attorneyMappingDataSourceVersionId: versionMap[attorneyMappingDataSource?.dataSourceId!],
        agreementTypeMappingDataSourceVersionId: versionMap[agreementTypeMappingDataSource?.dataSourceId!],
        ipAnalystDataSourceVersionId: versionMap[ipAnalystDashboardDataSource?.dataSourceId!],
        shppAccoladeDataSourceVersionId: versionMap[shppAccoladeDataSource?.dataSourceId!],
        sabicAccoladeDataSourceVersionId: versionMap[sabicAccoladeDataSource?.dataSourceId!],
        headers: customReportDetails.headers,
        customReportModel,
      });

      return data;
    } else {
      await reportRequestService.updateReportRequest(reportRequestId, { status: 'failed' });
    }
  } catch (e) {
    console.log('Error in generateCustomReportsFunction.', e);
    await reportRequestService.updateReportRequest(reportRequestId, { status: 'failed' });
  }
};
export const generateCustomReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionValue, customReportId, isRowData } = req.body;
    const { userId, organizationId, orgCode } = req?.user;
    let data = await generateCustomReportsFunction({
      versionValue,
      userId,
      organizationId,
      orgCode,
      customReportId,
      isRowData,
    });
    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data,
    });
  } catch (e) {
    console.log('Error in generateCustomReportsFunction', e);
    next(e);
  }
};

export const listCustomReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const { organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId: organizationId };
    if (search) query.reportName = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await customReportServices.getCustomReportList({
        query,
        select: ['_id', 'reportName'],
        page,
        limit,
      });
    } else {
      result = await customReportServices.getCustomReportList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Custom Report List Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const listReportRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false', status } = req.query;
    const { organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId: organizationId };
    if (status && status === 'notprocessing') {
      query.status = { $ne: 'processing' };
    } else if (status) {
      query.status = status;
    }
    if (search) query.reportName = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await reportRequestService.getReportRequestList({
        query,
        select: ['versionValue', 'dataSourceVersion', 'status', 'createdAt'],
        page,
        limit,
        populate: [
          {
            path: 'customReportId',
            select: 'reportName', // Only populate reportName
          },
          {
            path: 'createdBy',
            select: 'firstName lastName',
          },
        ],
      });
    } else {
      result = await reportRequestService.getReportRequestList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report Request List Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportRequestId } = req.params;
    // const { userId } = req.user;

    const reportDetails = await reportRequestService.findReportRequestById(reportRequestId);
    // if (reportDetails?.createdBy != userId) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'You do not have permission to download this report.',
    //   });
    // }
    if (reportDetails?.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `The report is currently in '${reportDetails?.status}' status and cannot be downloaded.`,
      });
    }
    res.download(reportDetails.filePath!, reportDetails.fileName!, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Error downloading file');
      }
    });
  } catch (err) {
    console.log('Error in downloadReport', err);
    next(err);
  }
};

export const viewReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportRequestId, dataSourceVersionId } = req.params;
    const { organizationId, orgCode } = req.user;

    const reportDetails = await reportRequestService.findReportRequestById(reportRequestId);

    if (reportDetails) {
      if (reportDetails.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: `The report is currently in '${reportDetails?.status}' status and cannot be viewed.`,
        });
      }
      const versionValue = reportDetails.versionValue;
      const customReportId = String(reportDetails.customReportId);
      const customReportDetails = await customReportServices.findCustomReportById(customReportId);
      const designDetails = customReportDetails?.design;
      let sectionDetails: any[] = [];
      let mappings: Record<string, any> = {};
      const dataSourceVersionIdArray = reportDetails.dataSourceVersion;
      const reportName = customReportDetails?.reportName;
      if (dataSourceVersionIdArray && dataSourceVersionIdArray.length > 0) {
        let transformedSectionData: any[] = [];
        let transformedVersionData: any[] = [];
        for (let i = 0; i < dataSourceVersionIdArray.length; i++) {
          const dataSourceVersion = dataSourceVersionIdArray[i];

          const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
            orgCode,
            versionCode: dataSourceVersion.versionCode,
          });

          if (reportName && reportName.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() === 'monthlyip') {
            if (String(dataSourceVersion['dataSourceVersionId']) === String(dataSourceVersionId)) {
              const currentYearVersionValue = versionValue.split('-')[0];

              const pageName = dataSourceVersion['code'];
              if (pageName === 'global') {
                sectionDetails = designDetails?.['global'] ? designDetails?.['global'] : [];
                mappings = transformMonthlyIpData({
                  currentYear: Number(currentYearVersionValue),
                  isReverseMapping: false,
                });
              }
              if (pageName === 'stc') {
                sectionDetails = designDetails?.['stc'] ? designDetails?.['stc'] : [];
                mappings = transformMonthlySTCData({
                  currentYear: Number(currentYearVersionValue),
                  isReverseMapping: false,
                });
              }

              const query = { dataSourceVersionId: new ObjectId(dataSourceVersionId) };
              const dataSourceVersionData = await dataSourceVersionValueService.getDataSourceVersionValue({
                schemaName,
                query,
                page: 1,
                select: 'rowData',
                limit: Number.MAX_SAFE_INTEGER,
              });

              transformedVersionData = dataSourceVersionData.data.map((entry) => {
                const newRow = {};
                const rowData = entry.rowData;

                for (const [originalKey, mappedKey] of Object.entries(mappings)) {
                  newRow[mappedKey] = rowData[originalKey] !== undefined ? rowData[originalKey] : null;
                }
                return {
                  ...newRow,
                };
              });

              transformedSectionData = sectionDetails.map((section) => {
                const transformedSectionName = mappings[section.sectionName] || section.sectionName;

                const updatedSubSections = section.subSections.map((sub) => {
                  return {
                    ...sub,
                    headerName: mappings[sub.headerName] || sub.headerName,
                  };
                });
                return {
                  ...section,
                  sectionName: transformedSectionName,
                  subSections: updatedSubSections,
                };
              });
            }
          }
        }

        res.status(200).json({
          success: true,
          message: 'Report Details Fetched Successfully',
          data: transformedVersionData,
          sections: transformedSectionData,
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Report data not found.`,
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: `Report details not found.`,
      });
    }
  } catch (err) {
    console.log('Error in viewReprt', err);
    next(err);
  }
};

export const getReportVersionValuesBasedOnReportIdAndVersionValue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reportRequestId, versionValue } = req.query as { reportRequestId: string; versionValue: string };

    const customReportData = await customReportServices.findCustomReportById(reportRequestId);

    const requiredDataSourceIds = customReportData?.dataSourceIds?.map((data) => data.dataSourceId);

    const dataSourceResult = await dataSourceService.getDataSourceList({
      query: { _id: { $in: requiredDataSourceIds } },

      populate: [
        {
          path: 'entityId',
          select: 'name attributes', // Specify the fields to populate
        },
      ],
    });
    const query: any = { dataSourceId: { $in: requiredDataSourceIds }, versionValue: versionValue, isCurrent: true };

    const availableVersionValue = await dataSourceVersionService.getDataSourceVersionList({
      query,
    });

    const versionMap = new Map<string, any[]>();

    for (let i = 0; i < availableVersionValue?.data?.length || 0; i++) {
      const version = availableVersionValue?.data[i];
      if (versionMap[version.dataSourceId]) {
        versionMap[version.dataSourceId].push(version);
      } else {
        versionMap[version.dataSourceId] = [version];
      }
    }

    const reportDataSourceFileNameMap = new Map<string, any[]>();

    for (let i = 0; i < customReportData?.dataSourceIds?.length! || 0; i++) {
      const dataSource = customReportData?.dataSourceIds[i]!;
      reportDataSourceFileNameMap[dataSource.dataSourceId] = dataSource.fileDetails;
    }

    const versionValueDetails = dataSourceResult?.data?.map((source) => ({
      ...source,
      requiredFiles: reportDataSourceFileNameMap[source._id],
      reportName: customReportData?.reportName,
      versions: versionMap[source._id] || [], // Include versions if available, else empty array
    }));

    res.status(200).json({
      success: true,
      message: 'Report Request List Fetched Successfully',
      versionValueDetails,
    });
  } catch (err) {
    next(err);
  }
};

export const getReportRequestDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportRequestId } = req.params;
    const reportDetails = await reportRequestService.findReportRequestById(reportRequestId);
    res.status(200).json({
      success: true,
      message: 'Report details retrieved successfully.',
      reportDetails,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomReportDataBasedOnDataSourcedIdAndVersionValueRange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { dataSourceId } = req.params;
    const { periodStart, periodEnd, versionCode } = req.query;

    const query: any = {
      dataSourceId: dataSourceId,
      versionValue: {
        $gte: periodStart,
        $lte: periodEnd,
      },
      isCurrent: true,
    };

    const availableVersionValue = await dataSourceVersionService.getDataSourceVersionList({
      query,
      sort: { versionValue: 1 },
    });

    const dataSourceVesionIdArray: any[] = [];
    const versionValueMap = {};
    for (let i = 0; i < availableVersionValue.data.length; i++) {
      const versionData = availableVersionValue.data[i];
      const versionId = versionData._id;
      const versionValue = versionData.versionValue;
      dataSourceVesionIdArray.push(versionId);
      versionValueMap[String(versionId)] = versionValue;
    }

    const dataQuery = { dataSourceVersionId: { $in: dataSourceVesionIdArray } };
    const { orgCode } = req.user;
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: versionCode as string,
    });

    const dataSourceVersionData = await dataSourceVersionValueService.getDataSourceVersionValue({
      schemaName,
      query: dataQuery,
      page: 1,
      select: 'dataSourceVersionId rowData',
      limit: Number.MAX_SAFE_INTEGER,
    });

    const finalDataSourceVersionData = dataSourceVersionData.data.map((data) => {
      return {
        ...data.rowData,
        versionValue: versionValueMap[data.dataSourceVersionId],
      };
    });

    res.status(200).json({
      success: true,
      message: 'Report details retrieved successfully.',
      data: finalDataSourceVersionData,
      versionValueMap,
    });
  } catch (err) {
    console.log('Error in getCustomReportChartData.', err);
    next(err);
  }
};
