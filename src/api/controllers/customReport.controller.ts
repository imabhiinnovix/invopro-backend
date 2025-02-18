import { Request, Response, NextFunction } from 'express';

import * as customReportServices from '../../database/services/customReport.services';
import * as dataSourceVersionServices from '../../database/services/dataSourceVersion.services';
import * as reportRequestService from '../../database/services/reportRequest.services';

import { DateTime } from 'luxon';
import { generateMonthlyIpReport } from '../../functions/reports/monthlyip';
import path from 'path';

export const generateCustomReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionValue, customReportId } = req.body;
    const { userId, organizationId, orgCode } = req?.user;
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
      throw new Error(`Not all required data is available for this report with version value ${versionValue}.`);
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
        sampleFilePath: customReportDetails.sampleFilePath,
        disclosureDataSourceVersionId: versionMap[disclosureDataSource?.dataSourceId!],
        portfolioDataSourceVersionId: versionMap[portfolioDataSource?.dataSourceId!],
        sabicipDataSourceVersionId: versionMap[sabicipDataSource?.dataSourceId!],
        ctclinsabDataSourceVersionId: versionMap[ctclinsabDataSource?.dataSourceId!],
        annuitiesbDataSourceVersionId: versionMap[annuitiesbDataSource?.dataSourceId!],
      });

      res.status(201).json({
        success: true,
        message: 'Report Generated Successfully',
        x,
      });
    }
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
    const { organizationId, userId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId: organizationId, createdBy: userId };
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
