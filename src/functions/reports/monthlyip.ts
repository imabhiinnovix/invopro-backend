import { promises as fsPromises } from 'fs';
import path from 'path';

import * as reportRequestService from '../../database/services/reportRequest.services';
import {
  addCellMaping,
  DataItem,
  getAllProsecutionSavings,
  getAnnuitySavingsFromReductions,
  getAppsFiledBasedOnStc,
  getCurrentYearNewApplicationFiled,
  getCurrentYearRenewalDue,
  getDisclosureCount,
  getFormattedDataToProcessReportHeaders,
  getNumberOfProsecutionReduction,
  getProjectBasedOnStcs,
  getReductions,
  getTotalCostSavings,
  getTotalPortfolio,
  getTotalPortfolioPercentage,
  percentageOfCurrentYearInventionDisclosureConvertedToFilings,
  processData,
  processStaticData,
  processSTCData,
} from '../../database/services/monthlyipReport.services';
import { createExcelSheetFile, createUpdateExcelTable, writeDataToExcel } from '../../utils/excel.utils';
import { CustomReportModelAccessReturnType } from '../../database/models/customReportModels';
import { createUpdateCustomDataSourceVersionValueFunction } from '../../api/controllers/dataSourceVersion.controller';
import { processReportHeaders, transformMonthlyIpData } from '../../utils/common.report';
import { ReportHeaders } from '../../utils/common.type';

export const generateMonthlyIpReport = async ({
  reportRequestPayload,
  requestedReportId,
  sampleFilePath,
  disclosureDataSourceVersionId,
  portfolioDataSourceVersionId,
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
  customReportModel,
  isRowData,
  staticNewFilingsDataSourceId,
  staticEstimatesDataSourceId,
  staticProjectOpenedDataSourceId,
  userId,
  orgCode,
  organizationId,
  monthlyIpDataSource,
  headers,
}: {
  reportRequestPayload: any;
  requestedReportId: string;
  sampleFilePath: string;
  disclosureDataSourceVersionId: string;
  portfolioDataSourceVersionId: string;
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
  staticNewFilingsDataSourceId: string;
  staticEstimatesDataSourceId: string;
  staticProjectOpenedDataSourceId: string;
  userId: string;
  orgCode: string;
  organizationId: string;
  headers: ReportHeaders;
  monthlyIpDataSource: string;
}) => {
  try {
    const versionValue = reportRequestPayload.versionValue;
    const splitedVersionValue = versionValue.split('-');
    const currentYear = splitedVersionValue[0];
    const currentMonth = splitedVersionValue[1];
    const newFilePath = reportRequestPayload.filePath;
    const sbuHeaders = headers['global']['columns'];

    const toBeProcessedReportHeaders = [
      { reportHeader: 'SBU', attributeValues: ['SBU'] },
      ...headers['global']['columns'],
      { reportHeader: 'Totals', attributeValues: ['Totals'] },
    ];
    const reportHeaders = toBeProcessedReportHeaders.map((data) => data.reportHeader);

    const currentYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData,
    });
    const partiallyProcessedCurrentYearApplicationFiledData = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${currentYear} New Apps Filed`,
      data: currentYearApplicationFiledData,
    });

    const processedCurrentYearApplicationFiledData = processReportHeaders({
      data: [{ SBU: 'First Filings' }, partiallyProcessedCurrentYearApplicationFiledData],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    const processedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsData =
      await percentageOfCurrentYearInventionDisclosureConvertedToFilings({
        portfolioDataSourceVersionId,
        disclosureDataSourceVersionId,
        currentYear,
        customReportModel,
        isRowData,
        headers: sbuHeaders,
      });

    const staticData = await processStaticData({
      staticNewFilingsDataSourceId,
      staticEstimatesDataSourceId,
      staticProjectOpenedDataSourceId,
      currentYear,
      currentMonth,
      customReportModel,
    });

    let finalProcessedData = [
      ...processedCurrentYearApplicationFiledData,
      ...processedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsData,
    ];

    const draftedApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
      isYearRequired: false,
      customReportModel,
      isRowData,
    });

    const partiallyProcessedDraftedApplicationDisclosureCount = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Apps Being Drafted`,
      data: draftedApplicationDisclosureCount,
    });

    const openApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
      customReportModel,
    });

    const partiallyProcessedOpenApplicationDisclosureCount = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Projects Opened in ${currentYear}`,
      data: openApplicationDisclosureCount,
    });

    const processedOpenApplicationDisclosureCount = processReportHeaders({
      data: [partiallyProcessedOpenApplicationDisclosureCount],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    const totalActiveProjects = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
      customReportModel,
      isRowData,
    });

    const partiallyProcessedTotalActiveProjects = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total Active Projects`,
      data: totalActiveProjects,
    });

    const processedTotalActiveProjects = processReportHeaders({
      data: [partiallyProcessedTotalActiveProjects],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    const currentYearUsIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearUSIssued: true,
      customReportModel,
    });

    const partiallyProcessedCurrentYearUsIssued = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${currentYear} US Issued`,
      data: currentYearUsIssued,
    });

    const currentYearIntlssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearINTIssued: true,
      customReportModel,
    });

    const partiallyProcessedCurrentYearIntlssued = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${currentYear} Intl Issued`,
      data: currentYearIntlssued,
    });

    const usPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSPendingApplication: true,
      customReportModel,
    });

    const partiallyProcessedUsPendingApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total US Apps pending`,
      data: usPendingApplication,
    });

    const epPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPPendingApplication: true,
      customReportModel,
    });

    const partiallyProcessedEpPendingApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total EP Apps pending`,
      data: epPendingApplication,
    });

    const cnPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNPendingApplication: true,
      customReportModel,
    });

    const partiallyProcessedCnPendingApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total CN Apps pending`,
      data: cnPendingApplication,
    });

    const otherPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherPendingApplication: true,
      customReportModel,
    });

    const partiallyProcessedotherPendingApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Other Country Apps pending`,
      data: otherPendingApplication,
    });

    const totalPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalPendingApplication: true,
      customReportModel,
    });

    const partiallyProcessedTotalPendingApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total Apps pending`,
      data: totalPendingApplication,
      defaultValue: { 'Scientific Design': 109 },
    });

    const usIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSIssuedApplication: true,
      customReportModel,
    });

    const partiallyProcessedUsIssuedApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total US Issued`,
      data: usIssuedApplication,
    });

    const epIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPIssuedApplication: true,
      customReportModel,
    });

    const partiallyProcessedEpIssuedApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total EP Issued`,
      data: epIssuedApplication,
    });

    const cnIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNIssuedApplication: true,
      customReportModel,
    });

    const partiallyProcessedCnIssuedApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total CN Issued`,
      data: cnIssuedApplication,
    });

    const otherIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherIssuedApplication: true,
      customReportModel,
    });

    const partiallyProcessedOtherIssuedApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Other Country Issued`,
      data: otherIssuedApplication,
    });

    const totalIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalIssuedApplication: true,
      customReportModel,
    });

    const partiallyProcessedTotalIssuedApplication = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total Issued`,
      data: totalIssuedApplication,
      defaultValue: { 'Scientific Design': 263 },
    });

    const processedFirstLargeData = processReportHeaders({
      data: [
        ...staticData.allNewEstimates,
        ...staticData.allStaticNewFilingData,
        { SBU: 'Disclosures' },
        partiallyProcessedDraftedApplicationDisclosureCount,
        partiallyProcessedOpenApplicationDisclosureCount,
        ...staticData.allNewProject,
        partiallyProcessedTotalActiveProjects,
        { SBU: `${currentYear} Issued` },
        partiallyProcessedCurrentYearUsIssued,
        partiallyProcessedCurrentYearIntlssued,
        { SBU: `Pending Applications` },
        partiallyProcessedUsPendingApplication,
        partiallyProcessedEpPendingApplication,
        partiallyProcessedCnPendingApplication,
        partiallyProcessedotherPendingApplication,
        partiallyProcessedTotalPendingApplication,
        { SBU: 'Issued Patents' },
        partiallyProcessedUsIssuedApplication,
        partiallyProcessedEpIssuedApplication,
        partiallyProcessedCnIssuedApplication,
        partiallyProcessedOtherIssuedApplication,
        partiallyProcessedTotalIssuedApplication,
        { SBU: '' },
      ],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    const partiallyProcessedTotalPortFolio = await getTotalPortfolio({
      partiallyProcessedTotalPendingApplication,
      partiallyProcessedTotalIssuedApplication,
    });

    partiallyProcessedTotalPortFolio['SBU'] = `Total Portfolio: Apps Pending+ Issued`;

    const processedTotalPortFolioData = processReportHeaders({
      data: [partiallyProcessedTotalPortFolio],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    const totalPortFolioPercentage = getTotalPortfolioPercentage({ data: processedTotalPortFolioData });
    const processedTotalPortFolioPercentageData = { ...totalPortFolioPercentage, SBU: '% of Total Portfolio' };

    const currentYearRenewalDue = await getCurrentYearRenewalDue({
      portfolioDataSourceVersionId,
      sabicipDataSourceVersionId,
      ctclinsabDataSourceVersionId,
      annuitiesbDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData,
    });

    const partiallyProcessedCurrentYearRenewalDue = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${currentYear} Renewals Due`,
      data: currentYearRenewalDue,
    });

    let reductionData = await getReductions({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
    });

    const partiallyProcessedDropCountResult = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Total No. of ${currentYear}** Reductions (Including reductions during prosecution)`,
      data: reductionData.dropCountResult,
    });

    const annuitySavingsForCurrentYear = await getAnnuitySavingsFromReductions({
      sabicipDataSourceVersionId,
      ctclinsabDataSourceVersionId,
      annuitiesbDataSourceVersionId,
      currentYear,
      annuityDrop: reductionData.annuityDropArray,
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
      customReportModel,
      isRowData,
    });

    const partiallyProcessedAnnuitySavingsForCurrentYear = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${Number(currentYear)} Annuity Savings from ${currentYear} reductions`,
      data: annuitySavingsForCurrentYear,
    });

    const annuitySavingsForNextYear = await getAnnuitySavingsFromReductions({
      sabicipDataSourceVersionId,
      ctclinsabDataSourceVersionId,
      annuitiesbDataSourceVersionId,
      currentYear: `${Number(currentYear) + 1}`,
      annuityDrop: reductionData.annuityDropArray,
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
      customReportModel,
      isRowData,
    });

    const partiallyProcessedAnnuitySavingsForNextYear = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `${Number(currentYear) + 1} Annuity Savings from ${currentYear} reductions`,
      data: annuitySavingsForNextYear,
    });

    const totalAnnuitySavingsMap = {
      SBU: `${currentYear}-${Number(currentYear) + 1} Annuity Savings from ${currentYear} reductions`,
    };

    annuitySavingsForCurrentYear?.forEach((entry) => {
      totalAnnuitySavingsMap[entry.SBU] = (totalAnnuitySavingsMap[entry.SBU] || 0) + entry.value;
    });

    annuitySavingsForNextYear.forEach((entry) => {
      totalAnnuitySavingsMap[entry.SBU] = (totalAnnuitySavingsMap[entry.SBU] || 0) + entry.value;
    });

    const allProsecutionDrop = await getNumberOfProsecutionReduction({
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
    });

    const partiallyProcessedAllProsecutionDrop = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `No. of Prosecution reductions in ${currentYear}`,
      data: allProsecutionDrop,
    });

    const allProsecutionSavings = await getAllProsecutionSavings({
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
      isRowData,
    });

    const partiallyProcessedAllProsecutionSavings = getFormattedDataToProcessReportHeaders({
      sbuColumnDetails: `Prosecution cost Savings`,
      data: allProsecutionSavings,
    });

    const totalCostSavings = await getTotalCostSavings({
      totalAnnuitySavings: totalAnnuitySavingsMap,
      allProsecutionSaving: allProsecutionSavings,
    });

    totalCostSavings['SBU'] =
      `Total Cost Savings: (${currentYear}-${Number(currentYear) + 1}) Annuity Savings + Prosecution savings from ${currentYear} reductions`;

    const processedSecondLargeData = processReportHeaders({
      data: [
        { SBU: `${currentYear} Renewals Due` },
        partiallyProcessedCurrentYearRenewalDue,
        { SBU: `Reductions & Cost Savings` },
        partiallyProcessedDropCountResult,
        partiallyProcessedAnnuitySavingsForCurrentYear,
        partiallyProcessedAnnuitySavingsForNextYear,
        totalAnnuitySavingsMap,
        { SBU: '' },
        partiallyProcessedAllProsecutionDrop,
        partiallyProcessedAllProsecutionSavings,
        { SBU: '' },
        totalCostSavings,
        { SBU: '' },
        { SBU: '' },
      ],
      headers: toBeProcessedReportHeaders,
      totalColumnName: 'Totals',
    });

    finalProcessedData = [
      ...finalProcessedData,
      ...processedFirstLargeData,
      ...processedTotalPortFolioData,
      processedTotalPortFolioPercentageData,
      ...processedSecondLargeData,
    ];

    await createUpdateExcelTable({
      data: finalProcessedData,
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableColumn: 'A',
      headerColor: 'ffffff',
      headerBackgroundColor: '7b7b7b',
      headers: reportHeaders,
      isWhiteBackGround: false,
      borderColor: { right: '7b7b7b', bottom: '7b7b7b' },
      tableRowBackGroundColor: {
        2: 'ffc000',
        3: 'b5c6e8',
        4: 'b5c6e8',
        5: 'b5c6e8',
        11: 'b5c6e8',
        12: 'b5c6e8',
        17: 'b5c6e8',
        26: 'b5c6e8',
        32: 'b5c6e8',
        34: 'b5c6e8',
        35: 'b5c6e8',
        37: 'b5c6e8',
        39: 'b5c6e8',
        42: 'b5c6e8',
        44: 'b5c6e8',
        45: 'b5c6e8',
        47: 'b5c6e8',
        10: 'ffc000',
        18: 'ffc000',
        21: 'ffc000',
        27: 'ffc000',
        36: 'ffc000',
        38: 'ffc000',
        49: '7b7b7b',
      },
      tableRowAlignment: {
        2: 'center',
        10: 'center',
        18: 'center',
        21: 'center',
        27: 'center',
        36: 'center',
        38: 'center',
      },
      tableRowCellFormat: {
        4: '0%',
        35: '0%',
        37: '"$" #,##0, "K"',
        40: '"$" #,##0, "K"',
        41: '"$" #,##0, "K"',
        42: '"$" #,##0, "K"',
        45: '"$" #,##0, "K"',
        47: '"$" #,##0, "K"',
      },
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 2,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 10,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 18,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 21,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 27,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 36,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 38,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 48,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 49,
      startCellNumber: 1,
      mergeEndColumn: reportHeaders.length + 1,
      isMergeCell: true,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Global',
      gap: 0,
      startTableRow: 1,
      columnBackGroundColor: '7b7b7b',
      columnBackGroundColorIndex: reportHeaders.length + 1,
      numRows: finalProcessedData.length,
      columnWidth: 5,
    });
    //stc tab
    //first table
    const newProjectOpenedBasedOnStc = await getProjectBasedOnStcs({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
      customReportModel,
      isRowData,
    });

    const totalOpenProjectsBasedOnStc = await getProjectBasedOnStcs({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
      customReportModel,
      isRowData,
    });

    const newAppsFiledBasedOnStc = await getAppsFiledBasedOnStc({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData,
    });

    const processedNewProjectOpenedBasedOnStc = processSTCData(newProjectOpenedBasedOnStc);
    const processedTotalOpenProjectsBasedOnStc = processSTCData(totalOpenProjectsBasedOnStc);
    const processedNewAppsFiledBasedOnStc = processSTCData(newAppsFiledBasedOnStc);

    const newProjectOpenedBasedOnStcFinal = processedNewProjectOpenedBasedOnStc.map((data) => {
      return {
        STC: data.STC,
        [`New Projects opened in ${currentYear}`]: data.value,
      };
    });
    const totalOpenProjectBasedOnStcFinal = processedTotalOpenProjectsBasedOnStc.map((data) => {
      return {
        STC: data.STC,
        [`Total Open Projects`]: data.value,
      };
    });

    const newApplicationFiledDataBasedOnStcFinal = processedNewAppsFiledBasedOnStc.map((data) => {
      return {
        STC: data.STC,
        [`${currentYear} Filed`]: data.value,
      };
    });

    const combinedSTCData: any[] = [];

    const allSTC = new Set([
      ...newProjectOpenedBasedOnStcFinal.map((data) => data.STC),
      ...totalOpenProjectBasedOnStcFinal.map((data) => data.STC),
      ...newApplicationFiledDataBasedOnStcFinal.map((data) => data.STC),
    ]);

    // return allSTC;
    let allSTCArray = Array.from(allSTC);

    if (allSTCArray.includes('Totals')) {
      allSTCArray = allSTCArray.filter((item) => item !== 'Totals' && item !== 'Blank'); // Remove "total"
      allSTCArray.push('Blank');
      allSTCArray.push('Totals'); // Add "total" at the end
    }

    allSTCArray.forEach((stc) => {
      const newProject = newProjectOpenedBasedOnStcFinal.find((item) => item.STC === stc);
      const totalProject = totalOpenProjectBasedOnStcFinal.find((item) => item.STC === stc);
      const applicationFiled = newApplicationFiledDataBasedOnStcFinal.find((data) => data.STC === stc);

      // Construct the final combined object for this SBU
      const result = {
        STC: stc,
        [`New Projects opened in ${currentYear}`]: newProject ? newProject[`New Projects opened in ${currentYear}`] : 0,
        [`Total Open Projects`]: totalProject ? totalProject[`Total Open Projects`] : 0,
        [`${currentYear} Filed`]: applicationFiled ? applicationFiled[`${currentYear} Filed`] : 0,
      };

      // Add the result to the combinedData array
      combinedSTCData.push(result);
    });

    //second table

    const combinedData: any[] = [];

    const processedCurrentYearApplicationFiledDataObject =
      processedCurrentYearApplicationFiledData && processedCurrentYearApplicationFiledData.length === 2
        ? processedCurrentYearApplicationFiledData[1]
        : {};

    const processedOpenApplicationDisclosureCountObject =
      processedOpenApplicationDisclosureCount && processedOpenApplicationDisclosureCount.length > 0
        ? processedOpenApplicationDisclosureCount[0]
        : {};

    const processedTotalActiveProjectsObject =
      processedTotalActiveProjects && processedTotalActiveProjects.length > 0 ? processedTotalActiveProjects[0] : {};

    const allSBUs = new Set([
      ...Object.keys(processedOpenApplicationDisclosureCountObject).filter((data) => !['SBU', 'Totals'].includes(data)),
      ...Object.keys(processedCurrentYearApplicationFiledDataObject).filter(
        (data) => !['SBU', 'Totals'].includes(data)
      ),
      ...Object.keys(processedTotalActiveProjectsObject).filter((data) => !['SBU', 'Totals'].includes(data)),
    ]);

    let allSBUsArray = Array.from(allSBUs);
    allSBUsArray.push('Totals');

    allSBUsArray.forEach((sbu) => {
      // Construct the final combined object for this SBU
      const result = {
        SBU: sbu,
        [`New Projects opened in ${currentYear}`]: processedOpenApplicationDisclosureCountObject[sbu]
          ? processedOpenApplicationDisclosureCountObject[sbu]
          : 0,
        [`Total Open Projects`]: processedTotalActiveProjectsObject[sbu] ? processedTotalActiveProjectsObject[sbu] : 0,
        [`${currentYear} Filed`]: processedCurrentYearApplicationFiledDataObject[sbu]
          ? processedCurrentYearApplicationFiledDataObject[sbu]
          : 0,
      };

      // Add the result to the combinedData array
      combinedData.push(result);
    });

    await createUpdateExcelTable({
      data: combinedSTCData,
      filePath: newFilePath,
      sheetName: 'STC',
      gap: 0,
      startTableColumn: 'A',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      isWhiteBackGround: false,
    });

    await createUpdateExcelTable({
      data: combinedData,
      filePath: newFilePath,
      sheetName: 'STC',
      gap: 2,
      startTableColumn: 'A',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      isWhiteBackGround: false,
    });

    const reverseMapping = transformMonthlyIpData({ currentYear: Number(currentYear), isReverseMapping: true });

    const sbusHeader = [...sbuHeaders.map((data) => data.reportHeader), 'Totals'];
    const saveData = sbusHeader.map((sbu) => {
      const entry = {};
      finalProcessedData.forEach((item) => {
        if (item.SBU && reverseMapping[item.SBU]) {
          entry[reverseMapping[item.SBU]] = item[sbu] ? item[sbu] : 0;
        }
      });
      entry['SBU'] = sbu;
      return entry;
    });

    const dataSourceVersionDetailsMonthlyIp = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: monthlyIpDataSource,
      versionValue,
      versionData: saveData,
      userId,
      organizationId,
      orgCode,
    });

    await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: staticNewFilingsDataSourceId,
      versionValue,
      versionData: Object.entries(processedCurrentYearApplicationFiledDataObject)
        .filter(([key]) => key !== 'SBU' && key !== 'Totals')
        .map(([key, value]) => ({
          SBU: key,
          'New Filings': value,
        })),
      userId,
      organizationId,
      orgCode,
    });

    await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: staticProjectOpenedDataSourceId,
      versionValue,
      versionData: Object.entries(processedOpenApplicationDisclosureCountObject)
        .filter(([key]) => key !== 'SBU' && key !== 'Totals')
        .map(([key, value]) => ({
          SBU: key,
          'Projects Opened': value,
        })),
      userId,
      organizationId,
      orgCode,
    });

    await reportRequestService.updateReportRequest(requestedReportId, {
      status: 'completed',
      dataSourceVersion: [
        {
          name: 'global',
          dataSourceVersionId: dataSourceVersionDetailsMonthlyIp.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsMonthlyIp.versionCode,
          dataSourceId: monthlyIpDataSource,
        },
      ],
    });
  } catch (err) {
    console.log(err);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
