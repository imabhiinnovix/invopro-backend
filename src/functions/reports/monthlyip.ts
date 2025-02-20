import { promises as fsPromises } from 'fs';
import path from 'path';

import * as reportRequestService from '../../database/services/reportRequest.services';
import {
  addCellMaping,
  getAllProsecutionSavings,
  getAnnuitySavingsFromReductions,
  getAppsFiledBasedOnStc,
  getCurrentYearNewApplicationFiled,
  getCurrentYearRenewalDue,
  getDisclosureCount,
  getNumberOfProsecutionReduction,
  getProjectBasedOnStcs,
  getReductions,
  getTotalCostSavings,
  getTotalPortfolio,
  getTotalPortfolioPercentage,
  percentageOfCurrentYearInventionDisclosureConvertedToFilings,
  processData,
  processSTCData,
} from '../../database/services/monthlyipReport.services';
import { createExcelSheetFile, writeDataToExcel } from '../../utils/excel.utils';

export const generateMonthlyIpReport = async ({
  reportRequestPayload,
  requestedReportId,
  sampleFilePath,
  disclosureDataSourceVersionId,
  portfolioDataSourceVersionId,
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
}: {
  reportRequestPayload: any;
  requestedReportId: string;
  sampleFilePath: string;
  disclosureDataSourceVersionId: string;
  portfolioDataSourceVersionId: string;
  sabicipDataSourceVersionId: string;
  ctclinsabDataSourceVersionId: string;
  annuitiesbDataSourceVersionId: string;
}) => {
  try {
    const currentYear = reportRequestPayload.versionValue.split('-')[0];

    const currentYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
    });
    const newFilePath = reportRequestPayload.filePath;
    // let reductionCount = await getReductionsAndCostSavings({
    //   portfolioDataSourceVersionId,
    //   sabicipDataSourceVersionId,
    //   ctclinsabDataSourceVersionId,
    //   annuitiesbDataSourceVersionId,
    //   currentYear,
    //   isCurrentYearReductionCount: true,
    // });

    // return reductionCount;
    const processedCurrentYearApplicationFiledData = processData({
      data: currentYearApplicationFiledData,
      cellMappings: {
        'SBU T&I': 'B3',
        'SBU Metals': 'C3',
        'SBU Agri-nutrients': 'D3',
        'SBU Chemicals': 'E3',
        'SBU Polymers': 'F3',
        'SBU SHPP': 'G3',
        'SBU Strategy & Transformation': 'H3',
        'Scientific Design': 'I3',
        Total: 'J3',
      },
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
        'SBU T&I': 'B4',
        'SBU Metals': 'C4',
        'SBU Agri-nutrients': 'D4',
        'SBU Chemicals': 'E4',
        'SBU Polymers': 'F4',
        'SBU SHPP': 'G4',
        'SBU Strategy & Transformation': 'H4',
        'Scientific Design': 'I4',
        Total: 'J4',
      }
    );

    const draftedApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
      isYearRequired: false,
    });
    const processedDraftedApplicationDisclosureCount = processData({
      data: draftedApplicationDisclosureCount,
      cellMappings: {
        'SBU T&I': 'B11',
        'SBU Metals': 'C11',
        'SBU Agri-nutrients': 'D11',
        'SBU Chemicals': 'E11',
        'SBU Polymers': 'F11',
        'SBU SHPP': 'G11',
        'SBU Strategy & Transformation': 'H11',
        'Scientific Design': 'I11',
        Total: 'J11',
      },
    });
    const openApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
    });
    const processedOpenApplicationDisclosureCount = processData({
      data: openApplicationDisclosureCount,
      cellMappings: {
        'SBU T&I': 'B12',
        'SBU Metals': 'C12',
        'SBU Agri-nutrients': 'D12',
        'SBU Chemicals': 'E12',
        'SBU Polymers': 'F12',
        'SBU SHPP': 'G12',
        'SBU Strategy & Transformation': 'H12',
        'Scientific Design': 'I12',
        Total: 'J12',
      },
    });

    const totalActiveProjects = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
    });

    const processedTotalActiveDisclosureCount = processData({
      data: totalActiveProjects,
      cellMappings: {
        'SBU T&I': 'B17',
        'SBU Metals': 'C17',
        'SBU Agri-nutrients': 'D17',
        'SBU Chemicals': 'E17',
        'SBU Polymers': 'F17',
        'SBU SHPP': 'G17',
        'SBU Strategy & Transformation': 'H17',
        'Scientific Design': 'I17',
        Total: 'J17',
      },
    });
    const currentYearUsIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearUSIssued: true,
    });
    const processedCurrentYearUsIssued = processData({
      data: currentYearUsIssued,
      cellMappings: {
        'SBU T&I': 'B19',
        'SBU Metals': 'C19',
        'SBU Agri-nutrients': 'D19',
        'SBU Chemicals': 'E19',
        'SBU Polymers': 'F19',
        'SBU SHPP': 'G19',
        'SBU Strategy & Transformation': 'H19',
        'Scientific Design': 'I19',
        Total: 'J19',
      },
    });
    const currentYearINTIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearINTIssued: true,
    });
    const processedCurrentYearINTIssued = processData({
      data: currentYearINTIssued,
      cellMappings: {
        'SBU T&I': 'B20',
        'SBU Metals': 'C20',
        'SBU Agri-nutrients': 'D20',
        'SBU Chemicals': 'E20',
        'SBU Polymers': 'F20',
        'SBU SHPP': 'G20',
        'SBU Strategy & Transformation': 'H20',
        'Scientific Design': 'I20',
        Total: 'J20',
      },
    });
    const usPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSPendingApplication: true,
    });
    const processedUSPendingApplication = processData({
      data: usPendingApplication,
      cellMappings: {
        'SBU T&I': 'B22',
        'SBU Metals': 'C22',
        'SBU Agri-nutrients': 'D22',
        'SBU Chemicals': 'E22',
        'SBU Polymers': 'F22',
        'SBU SHPP': 'G22',
        'SBU Strategy & Transformation': 'H22',
        'Scientific Design': 'I22',
        Total: 'J22',
      },
    });
    const epPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPPendingApplication: true,
    });
    const processedEPPendingApplication = processData({
      data: epPendingApplication,
      cellMappings: {
        'SBU T&I': 'B23',
        'SBU Metals': 'C23',
        'SBU Agri-nutrients': 'D23',
        'SBU Chemicals': 'E23',
        'SBU Polymers': 'F23',
        'SBU SHPP': 'G23',
        'SBU Strategy & Transformation': 'H23',
        'Scientific Design': 'I23',
        Total: 'J23',
      },
    });
    const cnPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNPendingApplication: true,
    });
    const processedCNPendingApplication = processData({
      data: cnPendingApplication,
      cellMappings: {
        'SBU T&I': 'B24',
        'SBU Metals': 'C24',
        'SBU Agri-nutrients': 'D24',
        'SBU Chemicals': 'E24',
        'SBU Polymers': 'F24',
        'SBU SHPP': 'G24',
        'SBU Strategy & Transformation': 'H24',
        'Scientific Design': 'I24',
        Total: 'J24',
      },
    });
    const otherPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherPendingApplication: true,
    });
    const processedOtherPendingApplication = processData({
      data: otherPendingApplication,
      cellMappings: {
        'SBU T&I': 'B25',
        'SBU Metals': 'C25',
        'SBU Agri-nutrients': 'D25',
        'SBU Chemicals': 'E25',
        'SBU Polymers': 'F25',
        'SBU SHPP': 'G25',
        'SBU Strategy & Transformation': 'H25',
        'Scientific Design': 'I25',
        Total: 'J25',
      },
    });
    const totalPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalPendingApplication: true,
    });
    const processedTotalPendingApplication = processData({
      data: [...totalPendingApplication, { SBU: 'Scientific Design', value: 109 }],
      cellMappings: {
        'SBU T&I': 'B26',
        'SBU Metals': 'C26',
        'SBU Agri-nutrients': 'D26',
        'SBU Chemicals': 'E26',
        'SBU Polymers': 'F26',
        'SBU SHPP': 'G26',
        'SBU Strategy & Transformation': 'H26',
        'Scientific Design': 'I26',
        Total: 'J26',
      },
    });

    //   {
    //     'SBU T&I': 'B26',
    //     'SBU Metals': 'C26',
    //     'SBU Agri-nutrients': 'D26',
    //     'SBU Chemicals': 'E26',
    //     'SBU Polymers': 'F26',
    //     // Petchem: 'G26',
    //     'SBU SHPP': 'H26',
    //     'SBU Strategy & Transformation': 'I26',
    //     Total: 'J26',
    //   },
    //   staticTotal: 109,
    // });
    const usIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSIssuedApplication: true,
    });
    const processedUSIssuedApplication = processData({
      data: usIssuedApplication,
      cellMappings: {
        'SBU T&I': 'B28',
        'SBU Metals': 'C28',
        'SBU Agri-nutrients': 'D28',
        'SBU Chemicals': 'E28',
        'SBU Polymers': 'F28',
        'SBU SHPP': 'G28',
        'SBU Strategy & Transformation': 'H28',
        'Scientific Design': 'I28',
        Total: 'J28',
      },

      // {
      //   'SBU T&I': 'B28',
      //   'SBU Metals': 'C28',
      //   'SBU Agri-nutrients': 'D28',
      //   'SBU Chemicals': 'E28',
      //   'SBU Polymers': 'F28',
      //   // Petchem: 'G28',
      //   'SBU SHPP': 'H28',
      //   'SBU Strategy & Transformation': 'I28',
      //   Total: 'J28',
      // },
    });
    const epIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPIssuedApplication: true,
    });
    const processedEPIssuedApplication = processData({
      data: epIssuedApplication,
      cellMappings: {
        'SBU T&I': 'B29',
        'SBU Metals': 'C29',
        'SBU Agri-nutrients': 'D29',
        'SBU Chemicals': 'E29',
        'SBU Polymers': 'F29',
        'SBU SHPP': 'G29',
        'SBU Strategy & Transformation': 'H29',
        'Scientific Design': 'I29',
        Total: 'J29',
      },
    });
    const cnIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNIssuedApplication: true,
    });
    const processedCNIssuedApplication = processData({
      data: cnIssuedApplication,
      cellMappings: {
        'SBU T&I': 'B30',
        'SBU Metals': 'C30',
        'SBU Agri-nutrients': 'D30',
        'SBU Chemicals': 'E30',
        'SBU Polymers': 'F30',
        'SBU SHPP': 'G30',
        'SBU Strategy & Transformation': 'H30',
        'Scientific Design': 'I30',
        Total: 'J30',
      },
    });
    const otherIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherIssuedApplication: true,
    });
    const processedOtherIssuedApplication = processData({
      data: otherIssuedApplication,
      cellMappings: {
        'SBU T&I': 'B31',
        'SBU Metals': 'C31',
        'SBU Agri-nutrients': 'D31',
        'SBU Chemicals': 'E31',
        'SBU Polymers': 'F31',
        'SBU SHPP': 'G31',
        'SBU Strategy & Transformation': 'H31',
        'Scientific Design': 'I31',
        Total: 'J31',
      },
    });
    const totalIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalIssuedApplication: true,
    });
    const processedTotalIssuedApplication = processData({
      data: [...totalIssuedApplication, { SBU: 'Scientific Design', value: 263 }],
      cellMappings: {
        'SBU T&I': 'B32',
        'SBU Metals': 'C32',
        'SBU Agri-nutrients': 'D32',
        'SBU Chemicals': 'E32',
        'SBU Polymers': 'F32',
        'SBU SHPP': 'G32',
        'SBU Strategy & Transformation': 'H32',
        'Scientific Design': 'I32',
        Total: 'J32',
      },
    });

    const totalPortFolio = await getTotalPortfolio({
      totalAppsPendingData: processedTotalPendingApplication,
      totalIssuedData: processedTotalIssuedApplication,
    });

    const processedTotalPortFolio = processData({
      data: totalPortFolio,
      cellMappings: {
        'SBU T&I': 'B34',
        'SBU Metals': 'C34',
        'SBU Agri-nutrients': 'D34',
        'SBU Chemicals': 'E34',
        'SBU Polymers': 'F34',
        'SBU SHPP': 'G34',
        'SBU Strategy & Transformation': 'H34',
        'Scientific Design': 'I34',
        Total: 'J34',
      },
      isCellOnly: true,
    });

    const totalPortFolioPercentage = getTotalPortfolioPercentage({ data: totalPortFolio });
    const processedTotalPortFolioPercentage = processData({
      data: totalPortFolioPercentage,
      cellMappings: {
        'SBU T&I': 'B35',
        'SBU Metals': 'C35',
        'SBU Agri-nutrients': 'D35',
        'SBU Chemicals': 'E35',
        'SBU Polymers': 'F35',
        'SBU SHPP': 'G35',
        'SBU Strategy & Transformation': 'H35',
        'Scientific Design': 'I35',
        Total: 'J35',
      },
      isCellOnly: true,
    });

    const currentYearRenewalDue = await getCurrentYearRenewalDue({
      portfolioDataSourceVersionId,
      sabicipDataSourceVersionId,
      ctclinsabDataSourceVersionId,
      annuitiesbDataSourceVersionId,
      currentYear,
    });

    const processedCurrentYearRenewalDue = processData({
      data: currentYearRenewalDue,
      cellMappings: {
        'SBU T&I': 'B37',
        'SBU Metals': 'C37',
        'SBU Agri-nutrients': 'D37',
        'SBU Chemicals': 'E37',
        'SBU Polymers': 'F37',
        'SBU SHPP': 'G37',
        'SBU Strategy & Transformation': 'H37',
        'Scientific Design': 'I37',
        Total: 'J37',
      },
    });

    let reductionData = await getReductions({
      portfolioDataSourceVersionId,
      currentYear,
    });

    const processedReductionCount = processData({
      data: reductionData.dropCountResult,
      cellMappings: {
        'SBU T&I': 'B39',
        'SBU Metals': 'C39',
        'SBU Agri-nutrients': 'D39',
        'SBU Chemicals': 'E39',
        'SBU Polymers': 'F39',
        'SBU SHPP': 'G39',
        'SBU Strategy & Transformation': 'H39',
        'Scientific Design': 'I39',
        Total: 'J39',
      },
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
    });

    const processedAnnuitySavingsForCurrentYear = processData({
      data: annuitySavingsForCurrentYear,
      cellMappings: {
        'SBU T&I': 'B40',
        'SBU Metals': 'C40',
        'SBU Agri-nutrients': 'D40',
        'SBU Chemicals': 'E40',
        'SBU Polymers': 'F40',
        'SBU SHPP': 'G40',
        'SBU Strategy & Transformation': 'H40',
        'Scientific Design': 'I40',
        Total: 'J40',
      },
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
    });

    const processedAnnuitySavingsForNextYear = processData({
      data: annuitySavingsForNextYear,
      cellMappings: {
        'SBU T&I': 'B41',
        'SBU Metals': 'C41',
        'SBU Agri-nutrients': 'D41',
        'SBU Chemicals': 'E41',
        'SBU Polymers': 'F41',
        'SBU SHPP': 'G41',
        'SBU Strategy & Transformation': 'H41',
        'Scientific Design': 'I41',
        Total: 'J41',
      },
    });

    const totalAnnuitySavingsMap = {};

    annuitySavingsForCurrentYear.forEach((entry) => {
      totalAnnuitySavingsMap[entry.SBU] = (totalAnnuitySavingsMap[entry.SBU] || 0) + entry.value;
    });

    annuitySavingsForNextYear.forEach((entry) => {
      totalAnnuitySavingsMap[entry.SBU] = (totalAnnuitySavingsMap[entry.SBU] || 0) + entry.value;
    });

    const totalAnnuitySavings = Object.keys(totalAnnuitySavingsMap).map((SBU) => ({
      SBU,
      value: totalAnnuitySavingsMap[SBU],
    }));

    const processedTotalAnnuitySavings = processData({
      data: totalAnnuitySavings,
      cellMappings: {
        'SBU T&I': 'B42',
        'SBU Metals': 'C42',
        'SBU Agri-nutrients': 'D42',
        'SBU Chemicals': 'E42',
        'SBU Polymers': 'F42',
        'SBU SHPP': 'G42',
        'SBU Strategy & Transformation': 'H42',
        'Scientific Design': 'I42',
        Total: 'J42',
      },
    });

    const allProsecutionDrop = await getNumberOfProsecutionReduction({
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
    });

    const processedAllProsecutionDrop = processData({
      data: allProsecutionDrop,
      cellMappings: {
        'SBU T&I': 'B44',
        'SBU Metals': 'C44',
        'SBU Agri-nutrients': 'D44',
        'SBU Chemicals': 'E44',
        'SBU Polymers': 'F44',
        'SBU SHPP': 'G44',
        'SBU Strategy & Transformation': 'H44',
        'Scientific Design': 'I44',
        Total: 'J44',
      },
    });

    const allProsecutionSavings = await getAllProsecutionSavings({
      priorityDrop: reductionData.priorityDropArray,
      pctDrop: reductionData.pctDropArray,
      prosecutionDrop: reductionData.prosecutionDropArray,
    });

    const processedAllProsecutionSavings = processData({
      data: allProsecutionSavings,
      cellMappings: {
        'SBU T&I': 'B45',
        'SBU Metals': 'C45',
        'SBU Agri-nutrients': 'D45',
        'SBU Chemicals': 'E45',
        'SBU Polymers': 'F45',
        'SBU SHPP': 'G45',
        'SBU Strategy & Transformation': 'H45',
        'Scientific Design': 'I45',
        Total: 'J45',
      },
    });

    const totalCostSavings = await getTotalCostSavings({
      totalAnnuitySavings,
      allProsecutionSaving: allProsecutionSavings,
    });

    const processedTotalCostSavings = processData({
      data: totalCostSavings,
      cellMappings: {
        'SBU T&I': 'B47',
        'SBU Metals': 'C47',
        'SBU Agri-nutrients': 'D47',
        'SBU Chemicals': 'E47',
        'SBU Polymers': 'F47',
        'SBU SHPP': 'G47',
        'SBU Strategy & Transformation': 'H47',
        'Scientific Design': 'I47',
        Total: 'J47',
      },
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
        ...processedTotalPortFolio,
        ...processedTotalPortFolioPercentage,
        ...processedCurrentYearRenewalDue,
        ...processedReductionCount,
        ...processedAnnuitySavingsForCurrentYear,
        ...processedAnnuitySavingsForNextYear,
        ...processedTotalAnnuitySavings,
        ...processedAllProsecutionDrop,
        ...processedAllProsecutionSavings,
        ...processedTotalCostSavings,
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
        {
          cellName: 'A36',
          value: `${currentYear} Renewals Due`,
          SBU: '',
        },
        {
          cellName: 'A37',
          value: `${currentYear} Renewals Due(USD)`,
          SBU: '',
        },
        {
          cellName: 'A39',
          value: `Total No. of ${currentYear}** Reductions (Including reductions during prosecution)`,
          SBU: '',
        },
        {
          cellName: 'A40',
          value: `${currentYear} Annuity Savings from ${currentYear} reductions`,
          SBU: '',
        },
        {
          cellName: 'A41',
          value: `${Number(currentYear) + 1} Annuity Savings from ${currentYear} reductions`,
          SBU: '',
        },
        {
          cellName: 'A42',
          value: `${currentYear}-${Number(currentYear) + 1} Annuity Savings from ${currentYear} reductions`,
          SBU: '',
        },
        {
          cellName: 'A44',
          value: `No. of Prosecution reductions in ${currentYear}`,
          SBU: '',
        },
        {
          cellName: 'A45',
          value: `Prosecution cost Savings`,
          SBU: '',
        },
        {
          cellName: 'A47',
          value: `Total Cost Savings: (${currentYear}-${Number(currentYear) + 1}) Annuity Savings + Prosecution savings from ${currentYear} reductions`,
          SBU: '',
        },
      ],
      newFilePath
    );

    //stc tab
    //first table
    const newProjectOpenedBasedOnStc = await getProjectBasedOnStcs({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
      isYearRequired: true,
    });

    const processedNewProjectOpenedBasedOnStc = processSTCData(newProjectOpenedBasedOnStc);

    const totalOpenProjectsBasedOnStc = await getProjectBasedOnStcs({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: true,
      isDrafted: false,
      isYearRequired: false,
    });

    const processedTotalOpenProjectsBasedOnStc = processSTCData(totalOpenProjectsBasedOnStc);

    const newAppsFiledBasedOnStc = await getAppsFiledBasedOnStc({
      portfolioDataSourceVersionId,
      currentYear,
    });

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

    if (allSTCArray.includes('Total')) {
      allSTCArray = allSTCArray.filter((item) => item !== 'Total' && item !== 'Blank'); // Remove "total"
      allSTCArray.push('Blank');
      allSTCArray.push('Total'); // Add "total" at the end
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

    await createExcelSheetFile(combinedSTCData, newFilePath, 'STC');
    //second table
    const newProjectOpened = processedOpenApplicationDisclosureCount.map((data) => {
      return {
        SBU: data.SBU,
        [`New Projects opened in ${currentYear}`]: data.value,
      };
    });
    const totalOpenProject = processedTotalActiveDisclosureCount.map((data) => {
      return {
        SBU: data.SBU,
        [`Total Open Projects`]: data.value,
      };
    });

    const newApplicationFiledData = processedCurrentYearApplicationFiledData.map((data) => {
      return {
        SBU: data.SBU,
        [`${currentYear} Filed`]: data.value,
      };
    });

    const combinedData: any[] = [];

    const allSBUs = new Set([
      ...newProjectOpened.map((data) => data.SBU),
      ...totalOpenProject.map((data) => data.SBU),
      ...newApplicationFiledData.map((data) => data.SBU),
    ]);

    let allSBUsArray = Array.from(allSBUs);
    if (allSBUsArray.includes('Total')) {
      allSBUsArray = allSBUsArray.filter((item) => item !== 'Total'); // Remove "total",blank
      allSBUsArray.push('Total'); // Add "total" at the end
    }

    allSBUsArray.forEach((sbu) => {
      // Find matching data for each SBU

      const newProject = newProjectOpened.find((item) => item.SBU === sbu);
      const totalProject = totalOpenProject.find((item) => item.SBU === sbu);
      const applicationFiled = newApplicationFiledData.find((data) => data.SBU === sbu);

      // Construct the final combined object for this SBU
      const result = {
        SBU: sbu,
        [`New Projects opened in ${currentYear}`]: newProject ? newProject[`New Projects opened in ${currentYear}`] : 0,
        [`Total Open Projects`]: totalProject ? totalProject[`Total Open Projects`] : 0,
        [`${currentYear} Filed`]: applicationFiled ? applicationFiled[`${currentYear} Filed`] : 0,
      };

      // Add the result to the combinedData array
      combinedData.push(result);
    });
    await createExcelSheetFile(combinedData, newFilePath, 'STC');

    await reportRequestService.updateReportRequest(requestedReportId, { status: 'processed' });
  } catch (err) {
    console.log(err);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
