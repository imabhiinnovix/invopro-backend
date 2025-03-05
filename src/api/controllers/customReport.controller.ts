import { Request, Response, NextFunction } from 'express';

import * as customReportServices from '../../database/services/customReport.services';
import * as dataSourceVersionServices from '../../database/services/dataSourceVersion.services';
import * as reportRequestService from '../../database/services/reportRequest.services';
import * as dataSourceService from '../../database/services/dataSource.services';

import { DateTime } from 'luxon';
import { generateMonthlyIpReport } from '../../functions/reports/monthlyip';
import path from 'path';

import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';

export const generateCustomReportsFunction = async ({
  userId,
  organizationId,
  versionValue,
  customReportId,
  orgCode,
}: {
  userId: string;
  organizationId: string;
  versionValue: string;
  customReportId: string;
  orgCode: string;
}) => {
  try {
    const customReportDetails = await customReportServices.findCustomReportById(customReportId);

    if (!customReportDetails) {
      throw new Error('Custom report not found');
    }

    // Extract all data source IDs
    const dataSourceIds = customReportDetails.dataSourceIds.map((ds) => ds.dataSourceId);

    const dataSourceVersionDetails = await dataSourceVersionServices.getDataSourceVersionList({
      query: { dataSourceId: { $in: dataSourceIds }, versionValue: versionValue, isCurrent: true },
    });

    if (!dataSourceVersionDetails.data || dataSourceVersionDetails.data.length != dataSourceIds.length) {
      let notFoundItems = customReportDetails.dataSourceIds.filter((ds) => {
        return !dataSourceVersionDetails.data.some((dsv) => {
          return dsv.dataSourceId.toString() === ds.dataSourceId.toString();
        });
      });

      let notFoundFileNames = notFoundItems.map((dsv) => dsv.fileDetails);
      let flattenedFileNames = notFoundFileNames.flatMap((files) => files.map((file) => file.name));

      throw new Error(
        `Not all required data is available for this report. Please upload the following files before generating the report: ${versionValue}. ${flattenedFileNames.join(', ')}`
      );
    }

    const currentDateTime = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss');

    const fileName = `${customReportDetails.reportName}_${versionValue}_${currentDateTime}.xlsx`;
    const reportRequestPayload = {
      organizationId: organizationId,
      versionValue: versionValue,
      customReportId: customReportDetails._id,
      status: 'processing',
      fileName: fileName,
      filePath: path.join('uploads', organizationId, userId, 'generatedReports', `${fileName}`),
      fileType: 'xlsx',
      createdBy: userId,
    };

    if (customReportDetails.reportName === 'monthlyip') {
      const versionMap = Object.fromEntries(
        dataSourceVersionDetails.data.map((v) => [v.dataSourceId.toString(), v._id.toString()])
      );

      const requestedReport = await reportRequestService.createReportRequest(reportRequestPayload);

      const disclosureDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'disclosure');

      const portfolioDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'portfolio');

      const sabicipDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'sabicip');

      const ctclinsabDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'ctclinsab');

      const annuitiesbDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'annuities');

      let x = await generateMonthlyIpReport({
        reportRequestPayload,
        requestedReportId: requestedReport._id as string,
        sampleFilePath: customReportDetails.sampleFilePath!,
        disclosureDataSourceVersionId: versionMap[disclosureDataSource?.dataSourceId!],
        portfolioDataSourceVersionId: versionMap[portfolioDataSource?.dataSourceId!],
        sabicipDataSourceVersionId: versionMap[sabicipDataSource?.dataSourceId!],
        ctclinsabDataSourceVersionId: versionMap[ctclinsabDataSource?.dataSourceId!],
        annuitiesbDataSourceVersionId: versionMap[annuitiesbDataSource?.dataSourceId!],
      });
      return x;
    }
  } catch (e) {
    throw e;
  }
};
export const generateCustomReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionValue, customReportId } = req.body;
    const { userId, organizationId, orgCode } = req?.user;
    let data = await generateCustomReportsFunction({ versionValue, userId, organizationId, orgCode, customReportId });
    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data,
    });
  } catch (e) {
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
    const { search, paginate = 'false' } = req.query;
    const { organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId: organizationId };
    if (search) query.reportName = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await reportRequestService.getReportRequestList({
        query,
        select: ['versionValue', 'status', 'createdAt'],
        page,
        limit,
        populate: [
          {
            path: 'customReportId',
            select: 'reportName', // Only populate reportName
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
    if (reportDetails?.status !== 'processed') {
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
