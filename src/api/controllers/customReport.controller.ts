import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import {
  addCellMaping,
  getCurrentYearNewApplicationFiled,
  getDisclosureCount,
  percentageOfCurrentYearInventionDisclosureConvertedToFilings,
  processData,
} from '../../database/services/monthlyipReport.services';
import path from 'path';
import { writeDataToExcel } from '../../utils/excel.utils';

export const generateMonthlyIpReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { disclosureDataSourceVersionId, portfolioDataSourceVersionId } = req.body;
    const { organizationId, userId } = req.user;

    const currentYear = '2024';
    const currentYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
    });

    const processedCurrentYearApplicationFiledData = processData(currentYearApplicationFiledData, {
      'SBU SHPP': 'H3',
      'SBU Agri-nutrients': 'D3',
      'SBU Polymers': 'F3',
      'SBU Chemicals': 'E3',
      'SBU T&I': 'B3',
      'SBU MISC': 'I3',
      'SBU Metals': 'C3',
      Total: 'J3',
      Petchem: 'G3',
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
        'SBU MISC': 'I4',
        'SBU Metals': 'C4',
        Total: 'J4',
        'Petchem Total': 'G4',
      }
    );

    //TODO:here currern year filter need to discuss
    const draftedApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
    });
    const processedDraftedApplicationDisclosureCount = processData(draftedApplicationDisclosureCount, {
      'SBU T&I': 'B11',
      'SBU Metals': 'C11',
      'SBU Agri-nutrients': 'D11',
      'SBU Chemicals': 'E11',
      'SBU Polymers': 'F11',
      Petchem: 'G11',
      'SBU SHPP': 'H11',
      'SBU MISC': 'I11',
      Total: 'J11',
    });
    const openApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
    });

    const processedOpenApplicationDisclosureCount = processData(openApplicationDisclosureCount, {
      'SBU T&I': 'B12',
      'SBU Metals': 'C12',
      'SBU Agri-nutrients': 'D12',
      'SBU Chemicals': 'E12',
      'SBU Polymers': 'F12',
      Petchem: 'G12',
      'SBU SHPP': 'H12',
      'SBU MISC': 'I12',
      Total: 'J12',
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
      Petchem: 'G19',
      'SBU SHPP': 'H19',
      'SBU MISC': 'I19',
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
      Petchem: 'G20',
      'SBU SHPP': 'H20',
      'SBU MISC': 'I20',
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
      Petchem: 'G22',
      'SBU SHPP': 'H22',
      'SBU MISC': 'I22',
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
      Petchem: 'G23',
      'SBU SHPP': 'H23',
      'SBU MISC': 'I23',
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
      Petchem: 'G24',
      'SBU SHPP': 'H24',
      'SBU MISC': 'I24',
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
      Petchem: 'G25',
      'SBU SHPP': 'H25',
      'SBU MISC': 'I25',
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
      Petchem: 'G26',
      'SBU SHPP': 'H26',
      'SBU MISC': 'I26',
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
      Petchem: 'G28',
      'SBU SHPP': 'H28',
      'SBU MISC': 'I28',
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
      Petchem: 'G29',
      'SBU SHPP': 'H29',
      'SBU MISC': 'I29',
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
      Petchem: 'G30',
      'SBU SHPP': 'H30',
      'SBU MISC': 'I30',
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
      Petchem: 'G31',
      'SBU SHPP': 'H31',
      'SBU MISC': 'I31',
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
      Petchem: 'G32',
      'SBU SHPP': 'H32',
      'SBU MISC': 'I32',
      Total: 'J32',
    });

    const newFilePath = path.join('reports', 'generated', organizationId, userId, `${Date.now()}.xlsx`);
    const sampleFilePath = path.join('reports', 'sample', 'sample-monthly-ip-report.xlsx');
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
      ],
      newFilePath
    );
    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data: percentageOfCurrentYearInventionDisclosureConvertedToFilingsData,
    });
  } catch (err) {
    next(err);
  }
};
