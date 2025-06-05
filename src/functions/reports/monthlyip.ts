import * as reportRequestService from '../../database/services/reportRequest.services';
import {
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
  processStaticData,
  processSTCData,
} from '../../database/services/monthlyipReport.services';

import { CustomReportModelAccessReturnType } from '../../database/models/customReportModels';
import { createUpdateCustomDataSourceVersionValueFunction } from '../../api/controllers/dataSourceVersion.controller';
import {
  processReportHeaders,
  transformDataByEntityMapping,
  transformMonthlyIpData,
  transformMonthlySTCData,
  transformMonthlySTCSBUData,
} from '../../utils/common.report';
import { ReportHeaders } from '../../utils/common.type';

export const generateMonthlyIpReport = async ({
  reportRequestPayload,
  requestedReportId,
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
  monthlyipstcDataSource,
  monthlyipstcsbuDataSource,
  headers,
  intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails,
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails,
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails,
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails,
  intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails,
  intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails,
  intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails,
  intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails,
  intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails,
  entityDetails,
  intermediateReportId,
}: {
  reportRequestPayload: any;
  requestedReportId: string;
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
  monthlyipstcDataSource: string;
  monthlyipstcsbuDataSource: string;
  intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails: any;
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails: any;
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails: any;
  intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails: any;
  intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails: any;
  intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails: any;
  intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails: any;
  intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails: any;
  intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails: any;
  entityDetails: any;
  intermediateReportId: any;
}) => {
  try {
    const versionValue = reportRequestPayload.versionValue;
    const customReportId = reportRequestPayload.customReportId;
    const splitedVersionValue = versionValue.split('-');
    const currentYear = splitedVersionValue[0];
    const currentMonth = splitedVersionValue[1];
    const sbuHeaders = headers['global']['columns'];

    const toBeProcessedReportHeaders = [
      { reportHeader: 'SBU', attributeValues: ['SBU'] },
      ...headers['global']['columns'],
      { reportHeader: 'Totals', attributeValues: ['Totals'] },
    ];

    const currentYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData,
    });
    const currentYearApplicationFiledRawData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData: true,
    });

    const transformedCurrentYearApplicationFiledRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails.entityId,
      entityDetails,
      data: currentYearApplicationFiledRawData,
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

    const processedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsData: any =
      await percentageOfCurrentYearInventionDisclosureConvertedToFilings({
        portfolioDataSourceVersionId,
        disclosureDataSourceVersionId,
        currentYear,
        customReportModel,
        isRowData,
        headers: sbuHeaders,
      });
    const percentageOfCurrentYearInventionDisclosureConvertedToFilingsRawData: any =
      await percentageOfCurrentYearInventionDisclosureConvertedToFilings({
        portfolioDataSourceVersionId,
        disclosureDataSourceVersionId,
        currentYear,
        customReportModel,
        isRowData: true,
        headers: sbuHeaders,
      });

    const transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataD =
      transformDataByEntityMapping({
        entityId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails.entityId,
        entityDetails,
        data: percentageOfCurrentYearInventionDisclosureConvertedToFilingsRawData.newYearApplicationFiledFilteredData,
      });

    const transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataI =
      transformDataByEntityMapping({
        entityId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails.entityId,
        entityDetails,
        data: percentageOfCurrentYearInventionDisclosureConvertedToFilingsRawData.activeDisclosureCount,
      });

    const transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataTotal =
      transformDataByEntityMapping({
        entityId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails.entityId,
        entityDetails,
        data: percentageOfCurrentYearInventionDisclosureConvertedToFilingsRawData.totalDisclosureCount,
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

    const draftedApplicationDisclosureCountRawData = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
      isYearRequired: false,
      customReportModel,
      isRowData: true,
    });

    const transformedDraftedApplicationDisclosureCountRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails.entityId,
      entityDetails,
      data: draftedApplicationDisclosureCountRawData,
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

    const openApplicationDisclosureCountRawData = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
      customReportModel,
      isRowData: true,
    });

    const transformedOpenApplicationDisclosureCountRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails.entityId,
      entityDetails,
      data: openApplicationDisclosureCountRawData,
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

    const totalActiveProjectsRawData = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
      customReportModel,
      isRowData: true,
    });

    const transformedtotalActiveProjectsRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails.entityId,
      entityDetails,
      data: totalActiveProjectsRawData,
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

    const currentYearUsIssuedRawData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearUSIssued: true,
      customReportModel,
      isRowData: true,
    });

    const transformedCurrentYearUsIssuedRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails.entityId,
      entityDetails,
      data: currentYearUsIssuedRawData,
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

    const currentYearIntlssuedRawData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearINTIssued: true,
      customReportModel,
      isRowData: true,
    });

    const transformedCurrentYearIntIssuedRawData = transformDataByEntityMapping({
      entityId: intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails.entityId,
      entityDetails,
      data: currentYearIntlssuedRawData,
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

    const reverseMapping = transformMonthlyIpData({ currentYear: Number(currentYear), isReverseMapping: true });
    const reverseStcMapping = transformMonthlySTCData({ currentYear: Number(currentYear), isReverseMapping: true });
    const reverseStcSbuMapping = transformMonthlySTCSBUData({
      currentYear: Number(currentYear),
      isReverseMapping: true,
    });

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

    const stcHeaders = ['STC', `New Projects opened in ${currentYear}`, `Total Open Projects`, `${currentYear} Filed`];

    const saveStcData: any[] = [];

    for (let i = 0; i < combinedSTCData.length; i++) {
      const stcData = combinedSTCData[i];
      const entry = {};
      for (let j = 0; j < stcHeaders.length; j++) {
        entry[reverseStcMapping[stcHeaders[j]]] = stcData[stcHeaders[j]];
      }
      saveStcData.push(entry);
    }

    const stcSBUHeaders = [
      'SBU',
      `New Projects opened in ${currentYear}`,
      `Total Open Projects`,
      `${currentYear} Filed`,
    ];

    const saveStcSbuData: any[] = [];

    for (let i = 0; i < combinedData.length; i++) {
      const stcSBUData = combinedData[i];
      const entry = {};
      for (let j = 0; j < stcSBUHeaders.length; j++) {
        entry[reverseStcSbuMapping[stcSBUHeaders[j]]] = stcSBUData[stcSBUHeaders[j]];
      }
      saveStcSbuData.push(entry);
    }

    const dataSourceVersionDetailsMonthlyIp = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: monthlyIpDataSource,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: saveData,
      userId,
      organizationId,
      orgCode,
    });

    const dataSourceVersionDetailsMonthlyIpStc = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: monthlyipstcDataSource,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: saveStcData,
      userId,
      organizationId,
      orgCode,
    });

    const dataSourceVersionDetailsMonthlyIpStcSBU = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: monthlyipstcsbuDataSource,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: saveStcSbuData,
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
      customReportId: customReportId,
      reportRequestId: requestedReportId,
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
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      orgCode,
    });

    //intermediateReport
    const intermediateDataSourceVersionDetailsCurrentYearApplicationFiled =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedCurrentYearApplicationFiledRawData,
        userId,
        organizationId,
        orgCode,
      });
    const intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataD =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataD,
        userId,
        organizationId,
        orgCode,
      });
    const intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataI =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataI,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataTotal =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId:
          intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataTotal,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailsAppsBeingDraftedEnitityDataSourceDetails =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedDraftedApplicationDisclosureCountRawData,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailsOpenApplicationDisclosureCountDataSourceDetails =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedOpenApplicationDisclosureCountRawData,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailsTotalActiveProjectsDataSourceDetails =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedtotalActiveProjectsRawData,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailsCurrentYearUsIssued =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedCurrentYearUsIssuedRawData,
        userId,
        organizationId,
        orgCode,
      });

    const intermediateDataSourceVersionDetailsCurrentYearIntIssued =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails.dataSourceId,
        customReportId: intermediateReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: transformedCurrentYearIntIssuedRawData,
        userId,
        organizationId,
        orgCode,
      });
    await reportRequestService.updateReportRequest(requestedReportId, {
      status: 'completed',
      intermediateReportId: intermediateReportId,
      dataSourceVersion: [
        {
          sheetName: 'Global',
          sheetCode: 'global',
          tabName: 'Global',
          mappingFuctionName: 'transformMonthlyIpData',
          designCode: 'global',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsMonthlyIp.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsMonthlyIp.versionCode,
          dataSourceId: monthlyIpDataSource,
        },
        {
          sheetName: 'STC',
          sheetCode: 'stc',
          tabName: 'STC',
          mappingFuctionName: 'transformMonthlySTCData',
          designCode: 'stc',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsMonthlyIpStc.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsMonthlyIpStc.versionCode,
          dataSourceId: monthlyipstcDataSource,
        },
        {
          sheetName: 'STC',
          sheetCode: 'stc',
          tabName: 'STC:SBU',
          mappingFuctionName: 'transformMonthlySTCSBUData',
          designCode: 'sbu',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsMonthlyIpStcSBU.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsMonthlyIpStcSBU.versionCode,
          dataSourceId: monthlyipstcsbuDataSource,
        },
        {
          sheetName: 'Current Year New Apps Filed',
          sheetCode: 'currentyearnewappfiled',
          tabName: 'Current Year New Apps Filed',
          mappingFuctionName: 'entity',
          designCode: 'currentyearnewappfiled',
          allowPdfDownload: false,
          dataSourceVersionId: intermediateDataSourceVersionDetailsCurrentYearApplicationFiled.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsCurrentYearApplicationFiled.versionCode,
          dataSourceId: intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpCurrentYearNewAppFiledEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: '%CYInvDisclosuresCnvtFiling(D)',
          sheetCode: 'pctcyinvdisclosurescnvtfilingd',
          tabName: '%CYInvDisclosuresCnvtFiling(D)',
          mappingFuctionName: 'entity',
          designCode: 'pctcyinvdisclosurescnvtfilingd',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataD.dataSourceVersionId,
          versionCode:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataD.versionCode,
          dataSourceId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails.dataSourceId,
          entityId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorDEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: '%CYInvDisclosuresCnvtFiling(I)',
          sheetCode: 'pctcyinvdisclosurescnvtfilingi',
          tabName: '%CYInvDisclosuresCnvtFiling(I)',
          mappingFuctionName: 'entity',
          designCode: 'pctcyinvdisclosurescnvtfilingi',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataI.dataSourceVersionId,
          versionCode:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataI.versionCode,
          dataSourceId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails.dataSourceId,
          entityId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsNumeratorIEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: '%CYInvDisclosuresCnvtFiling(T)',
          sheetCode: 'pctcyinvdisclosurescnvtfilingt',
          tabName: '%CYInvDisclosuresCnvtFiling(T)',
          mappingFuctionName: 'entity',
          designCode: 'pctcyinvdisclosurescnvtfilingt',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataTotal.dataSourceVersionId,
          versionCode:
            intermediateDataSourceVersionDetailstPercentageOfCurrentYearInventionDisclosureConvertedToFilingsRawDataTotal.versionCode,
          dataSourceId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails.dataSourceId,
          entityId:
            intermediateMonthlyPercentageOfCurrentYearInventionDisclosuresConvertedToFilingsDenominatorTotalEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: 'Apps Being Drafted',
          sheetCode: 'appsbeingdrafted',
          tabName: 'Apps Being Drafted',
          mappingFuctionName: 'entity',
          designCode: 'appsbeingdrafted',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailsAppsBeingDraftedEnitityDataSourceDetails.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsAppsBeingDraftedEnitityDataSourceDetails.versionCode,
          dataSourceId: intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpAppsBeingDraftedEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: 'Projects Opened in CY',
          sheetCode: 'projects_opened_cy',
          tabName: 'Projects Opened in CY',
          mappingFuctionName: 'entity',
          designCode: 'projects_opened_cy',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailsOpenApplicationDisclosureCountDataSourceDetails.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsOpenApplicationDisclosureCountDataSourceDetails.versionCode,
          dataSourceId: intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpOpenApplicationDisclosureEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: 'Total Active Projects',
          sheetCode: 'total_active_projects',
          tabName: 'Total Active Projects',
          mappingFuctionName: 'entity',
          designCode: 'total_active_projects',
          allowPdfDownload: false,
          dataSourceVersionId:
            intermediateDataSourceVersionDetailsTotalActiveProjectsDataSourceDetails.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsTotalActiveProjectsDataSourceDetails.versionCode,
          dataSourceId: intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpTotalActiveProjectsEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: 'CY US Issued',
          sheetCode: 'cy_us_issued',
          tabName: 'CY US Issued',
          mappingFuctionName: 'entity',
          designCode: 'cy_us_issued',
          allowPdfDownload: false,
          dataSourceVersionId: intermediateDataSourceVersionDetailsCurrentYearUsIssued.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsCurrentYearUsIssued.versionCode,
          dataSourceId: intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpCurrentYearUsIssuedEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
        {
          sheetName: 'CY Intl Issued',
          sheetCode: 'cy_intl_issued',
          tabName: 'CY Intl Issued',
          mappingFuctionName: 'entity',
          designCode: 'cy_intl_issued',
          allowPdfDownload: false,
          dataSourceVersionId: intermediateDataSourceVersionDetailsCurrentYearIntIssued.dataSourceVersionId,
          versionCode: intermediateDataSourceVersionDetailsCurrentYearIntIssued.versionCode,
          dataSourceId: intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails.dataSourceId,
          entityId: intermediateMonthlyIpCurrentYearIntlssuedEnitityDataSourceDetails.entityId,
          isIntermediate: true,
        },
      ],
    });
  } catch (err) {
    console.log(err);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
