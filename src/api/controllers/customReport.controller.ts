import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import {
  addCellMaping,
  getCurrentYearNewApplicationFiled,
  getDisclosureCount,
  percentageOfCurrentYearInventionDisclosureConvertedToFilings,
  processData,
} from '../../database/services/monthlyipReport.services';
import * as customReportServices from '../../database/services/customReport.services';
import * as dataSourceVersionServices from '../../database/services/dataSourceVersion.services';
import * as reportRequestService from '../../database/services/reportRequest.services';
import path from 'path';
import { writeDataToExcel } from '../../utils/excel.utils';

const generateMonthlyIpReport = async ({
  reportRequestPayload,
  requestedReportId,
  sampleFilePath,
  disclosureDataSourceVersionId,
  portfolioDataSourceVersionId,
}: {
  reportRequestPayload: any;
  requestedReportId: string;
  sampleFilePath: string;
  disclosureDataSourceVersionId: string;
  portfolioDataSourceVersionId: string;
}) => {
  try {
    const currentYear = reportRequestPayload.versionValue.split('-')[0];
    const currentYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
    });
    const newFilePath = reportRequestPayload.filePath;
    const processedCurrentYearApplicationFiledData = processData(currentYearApplicationFiledData, {
      'SBU SHPP': 'H3',
      'SBU Agri-nutrients': 'D3',
      'SBU Polymers': 'F3',
      'SBU Chemicals': 'E3',
      'SBU T&I': 'B3',
      'SBU Strategy & Transformation': 'I3',
      'SBU Metals': 'C3',
      Total: 'J3',
      // Petchem: 'G3',
    });
    const percentageOfCurrentYearInventionDisclosureConvertedToFilingsData =
      await percentageOfCurrentYearInventionDisclosureConvertedToFilings(
        portfolioDataSourceVersionId,
        disclosureDataSourceVersionId,
        currentYear
      );
    const processedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsData = addCellMaping(
      percentageOfCurrentYearInventionDisclosureConvertedToFilingsData,
      {
        'SBU SHPP': 'H4',
        'SBU Agri-nutrients': 'D4',
        'SBU Polymers': 'F4',
        'SBU Chemicals': 'E4',
        'SBU T&I': 'B4',
        'SBU Strategy & Transformation': 'I4',
        'SBU Metals': 'C4',
        Total: 'J4',
        // 'Petchem Total': 'G4',
      }
    );

    const draftedApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
      isYearRequired: false,
    });
    const processedDraftedApplicationDisclosureCount = processData(draftedApplicationDisclosureCount, {
      'SBU T&I': 'B11',
      'SBU Metals': 'C11',
      'SBU Agri-nutrients': 'D11',
      'SBU Chemicals': 'E11',
      'SBU Polymers': 'F11',
      // Petchem: 'G11',
      'SBU SHPP': 'H11',
      'SBU Strategy & Transformation': 'I11',
      Total: 'J11',
    });
    const openApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
    });
    const processedOpenApplicationDisclosureCount = processData(openApplicationDisclosureCount, {
      'SBU T&I': 'B12',
      'SBU Metals': 'C12',
      'SBU Agri-nutrients': 'D12',
      'SBU Chemicals': 'E12',
      'SBU Polymers': 'F12',
      // Petchem: 'G12',
      'SBU SHPP': 'H12',
      'SBU Strategy & Transformation': 'I12',
      Total: 'J12',
    });

    const totalActiveProjects = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
    });

    const processedTotalActiveDisclosureCount = processData(totalActiveProjects, {
      'SBU T&I': 'B17',
      'SBU Metals': 'C17',
      'SBU Agri-nutrients': 'D17',
      'SBU Chemicals': 'E17',
      'SBU Polymers': 'F17',
      // Petchem: 'G12',
      'SBU SHPP': 'H17',
      'SBU Strategy & Transformation': 'I17',
      Total: 'J17',
    });
    const currentYearUsIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearUSIssued: true,
    });
    const processedCurrentYearUsIssued = processData(currentYearUsIssued, {
      'SBU T&I': 'B19',
      'SBU Metals': 'C19',
      'SBU Agri-nutrients': 'D19',
      'SBU Chemicals': 'E19',
      'SBU Polymers': 'F19',
      // Petchem: 'G19',
      'SBU SHPP': 'H19',
      'SBU Strategy & Transformation': 'I19',
      Total: 'J19',
    });
    const currentYearINTIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearINTIssued: true,
    });
    const processedCurrentYearINTIssued = processData(currentYearINTIssued, {
      'SBU T&I': 'B20',
      'SBU Metals': 'C20',
      'SBU Agri-nutrients': 'D20',
      'SBU Chemicals': 'E20',
      'SBU Polymers': 'F20',
      // Petchem: 'G20',
      'SBU SHPP': 'H20',
      'SBU Strategy & Transformation': 'I20',
      Total: 'J20',
    });
    const usPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSPendingApplication: true,
    });
    const processedUSPendingApplication = processData(usPendingApplication, {
      'SBU T&I': 'B22',
      'SBU Metals': 'C22',
      'SBU Agri-nutrients': 'D22',
      'SBU Chemicals': 'E22',
      'SBU Polymers': 'F22',
      // Petchem: 'G22',
      'SBU SHPP': 'H22',
      'SBU Strategy & Transformation': 'I22',
      Total: 'J22',
    });
    const epPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPPendingApplication: true,
    });
    const processedEPPendingApplication = processData(epPendingApplication, {
      'SBU T&I': 'B23',
      'SBU Metals': 'C23',
      'SBU Agri-nutrients': 'D23',
      'SBU Chemicals': 'E23',
      'SBU Polymers': 'F23',
      // Petchem: 'G23',
      'SBU SHPP': 'H23',
      'SBU Strategy & Transformation': 'I23',
      Total: 'J23',
    });
    const cnPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNPendingApplication: true,
    });
    const processedCNPendingApplication = processData(cnPendingApplication, {
      'SBU T&I': 'B24',
      'SBU Metals': 'C24',
      'SBU Agri-nutrients': 'D24',
      'SBU Chemicals': 'E24',
      'SBU Polymers': 'F24',
      // Petchem: 'G24',
      'SBU SHPP': 'H24',
      'SBU Strategy & Transformation': 'I24',
      Total: 'J24',
    });
    const otherPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherPendingApplication: true,
    });
    const processedOtherPendingApplication = processData(otherPendingApplication, {
      'SBU T&I': 'B25',
      'SBU Metals': 'C25',
      'SBU Agri-nutrients': 'D25',
      'SBU Chemicals': 'E25',
      'SBU Polymers': 'F25',
      // Petchem: 'G25',
      'SBU SHPP': 'H25',
      'SBU Strategy & Transformation': 'I25',
      Total: 'J25',
    });
    const totalPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalPendingApplication: true,
    });
    const processedTotalPendingApplication = processData(totalPendingApplication, {
      'SBU T&I': 'B26',
      'SBU Metals': 'C26',
      'SBU Agri-nutrients': 'D26',
      'SBU Chemicals': 'E26',
      'SBU Polymers': 'F26',
      // Petchem: 'G26',
      'SBU SHPP': 'H26',
      'SBU Strategy & Transformation': 'I26',
      Total: 'J26',
    });
    const usIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSIssuedApplication: true,
    });
    const processedUSIssuedApplication = processData(usIssuedApplication, {
      'SBU T&I': 'B28',
      'SBU Metals': 'C28',
      'SBU Agri-nutrients': 'D28',
      'SBU Chemicals': 'E28',
      'SBU Polymers': 'F28',
      // Petchem: 'G28',
      'SBU SHPP': 'H28',
      'SBU Strategy & Transformation': 'I28',
      Total: 'J28',
    });
    const epIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPIssuedApplication: true,
    });
    const processedEPIssuedApplication = processData(epIssuedApplication, {
      'SBU T&I': 'B29',
      'SBU Metals': 'C29',
      'SBU Agri-nutrients': 'D29',
      'SBU Chemicals': 'E29',
      'SBU Polymers': 'F29',
      // Petchem: 'G29',
      'SBU SHPP': 'H29',
      'SBU Strategy & Transformation': 'I29',
      Total: 'J29',
    });
    const cnIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNIssuedApplication: true,
    });
    const processedCNIssuedApplication = processData(cnIssuedApplication, {
      'SBU T&I': 'B30',
      'SBU Metals': 'C30',
      'SBU Agri-nutrients': 'D30',
      'SBU Chemicals': 'E30',
      'SBU Polymers': 'F30',
      // Petchem: 'G30',
      'SBU SHPP': 'H30',
      'SBU Strategy & Transformation': 'I30',
      Total: 'J30',
    });
    const otherIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherIssuedApplication: true,
    });
    const processedOtherIssuedApplication = processData(otherIssuedApplication, {
      'SBU T&I': 'B31',
      'SBU Metals': 'C31',
      'SBU Agri-nutrients': 'D31',
      'SBU Chemicals': 'E31',
      'SBU Polymers': 'F31',
      // Petchem: 'G31',
      'SBU SHPP': 'H31',
      'SBU Strategy & Transformation': 'I31',
      Total: 'J31',
    });
    const totalIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalIssuedApplication: true,
    });
    const processedTotalIssuedApplication = processData(totalIssuedApplication, {
      'SBU T&I': 'B32',
      'SBU Metals': 'C32',
      'SBU Agri-nutrients': 'D32',
      'SBU Chemicals': 'E32',
      'SBU Polymers': 'F32',
      // Petchem: 'G32',
      'SBU SHPP': 'H32',
      'SBU Strategy & Transformation': 'I32',
      Total: 'J32',
    });

    await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
    await fsPromises.copyFile(sampleFilePath, newFilePath);
    await writeDataToExcel(
      [
        ...processedCurrentYearApplicationFiledData,
        ...processedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsData,
        ...processedDraftedApplicationDisclosureCount,
        ...processedDraftedApplicationDisclosureCount,
        ...processedOpenApplicationDisclosureCount,
        ...processedCurrentYearUsIssued,
        ...processedCurrentYearINTIssued,
        ...processedUSPendingApplication,
        ...processedEPPendingApplication,
        ...processedCNPendingApplication,
        ...processedOtherPendingApplication,
        ...processedTotalPendingApplication,
        ...processedUSIssuedApplication,
        ...processedEPIssuedApplication,
        ...processedCNIssuedApplication,
        ...processedOtherIssuedApplication,
        ...processedTotalIssuedApplication,
        ...processedTotalActiveDisclosureCount,
        { cellName: 'A3', value: `${currentYear} New Apps Filed`, SBU: '' },
        { cellName: 'A4', value: `% of ${currentYear} Invention Disclosures converted to Filings`, SBU: '' },
        { cellName: 'A5', value: `${currentYear} New Apps Estimate`, SBU: '' },
        { cellName: 'A6', value: `${Number(currentYear) - 1} New Apps filed`, SBU: '' },
        {
          cellName: 'A7',
          value: `${Number(currentYear) - 2} New Apps filed`,
          SBU: '',
        },
        {
          cellName: 'A8',
          value: `${Number(currentYear) - 3} New Apps filed`,
          SBU: '',
        },
        {
          cellName: 'A9',
          value: `${Number(currentYear) - 4} New Apps filed`,
          SBU: '',
        },
        {
          cellName: 'A12',
          value: `Projects Opened in ${currentYear}`,
          SBU: '',
        },
        {
          cellName: 'A13',
          value: `Projects Opened in ${Number(currentYear) - 1}`,
          SBU: '',
        },
        {
          cellName: 'A14',
          value: `Projects Opened in ${Number(currentYear) - 2}`,
          SBU: '',
        },
        {
          cellName: 'A15',
          value: `Projects Opened in ${Number(currentYear) - 3}`,
          SBU: '',
        },
        {
          cellName: 'A16',
          value: `Projects Opened in ${Number(currentYear) - 4}`,
          SBU: '',
        },
        {
          cellName: 'A18',
          value: `${currentYear} Issued`,
          SBU: '',
        },
        {
          cellName: 'A19',
          value: `${currentYear} US Issued`,
          SBU: '',
        },
        {
          cellName: 'A20',
          value: `${currentYear} Intl Issued`,
          SBU: '',
        },
      ],
      newFilePath
    );

    await reportRequestService.updateReportRequest(requestedReportId, { status: 'processed' });
  } catch (err) {
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};

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

    if (customReportDetails.reportName === 'monthlyip') {
      const fileName = `${customReportDetails.reportName}_${versionValue}.xlsx`;
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

      const versionMap = Object.fromEntries(
        dataSourceVersionDetails.data.map((v) => [v.dataSourceId.toString(), v._id.toString()])
      );

      const requestedReport = await reportRequestService.createReportRequest(reportRequestPayload);

      const disclosureDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'disclosure');

      const portfolioDataSource = customReportDetails.dataSourceIds.find((ds) => ds.code === 'portfolio');

      await generateMonthlyIpReport({
        reportRequestPayload,
        requestedReportId: requestedReport._id as string,
        sampleFilePath: customReportDetails.sampleFilePath,
        disclosureDataSourceVersionId: versionMap[disclosureDataSource?.dataSourceId!],
        portfolioDataSourceVersionId: versionMap[portfolioDataSource?.dataSourceId!],
      });

      res.status(201).json({
        success: true,
        message: 'Report Generated Successfully',
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
    if (search) query.name = { $regex: search, $options: 'i' };

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
