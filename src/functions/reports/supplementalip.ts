import {
  getAccoladeMappingSheet,
  getAgreementSigned,
  getIpAnalysis,
} from '../../database/services/supplementalipReport.services';
import { createExcelSheetFile } from '../../utils/excel.utils';
import * as reportRequestService from '../../database/services/reportRequest.services';
import { CustomReportModelAccessReturnType } from '../../database/models/customReportModels';
import { ReportHeaders } from '../../utils/common.type';
import { processReportHeaders } from '../../utils/common.report';

export const generateSupplementalIpReport = async ({
  reportRequestPayload,
  requestedReportId,
  sampleFilePath,
  disclosureDataSourceVersionId,
  portfolioDataSourceVersionId,
  sabicipDataSourceVersionId,
  ctclinsabDataSourceVersionId,
  annuitiesbDataSourceVersionId,
  sabicContractsDataSourceVersionId,
  shppContractsDataSourceVersionId,
  ksaContractsDataSourceVersionId,
  attorneyMappingDataSourceVersionId,
  agreementTypeMappingDataSourceVersionId,
  ipAnalystDataSourceVersionId,
  shppAccoladeDataSourceVersionId,
  sabicAccoladeDataSourceVersionId,
  customReportModel,
  isRowData,
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
  sabicContractsDataSourceVersionId: string;
  shppContractsDataSourceVersionId: string;
  ksaContractsDataSourceVersionId: string;
  attorneyMappingDataSourceVersionId: string;
  agreementTypeMappingDataSourceVersionId: string;
  ipAnalystDataSourceVersionId: string;
  shppAccoladeDataSourceVersionId: string;
  sabicAccoladeDataSourceVersionId: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
  headers: ReportHeaders;
}) => {
  try {
    const newFilePath = reportRequestPayload.filePath;
    const currentYear = reportRequestPayload.versionValue.split('-')[0];

    const currentYearAgreementSigned = await getAgreementSigned({
      sabicContractsDataSourceVersionId,
      shppContractsDataSourceVersionId,
      ksaContractsDataSourceVersionId,
      attorneyMappingDataSourceVersionId,
      agreementTypeMappingDataSourceVersionId,
      currentYear,
      customReportModel,
    });

    const proceessedFinalAgreement = processReportHeaders({
      data: currentYearAgreementSigned.finalAgreementResult,
      headers: [
        { reportHeader: 'Final AgreementType', attributeValues: ['Final AgreementType'] },
        ...headers['finalAgreementTypes']['columns'],
        { reportHeader: 'Total', attributeValues: ['Total'] },
      ],
    });

    const proceessedOtherAgreement = processReportHeaders({
      data: currentYearAgreementSigned.otherAgreementResult,
      headers: [
        { reportHeader: 'AgreementType', attributeValues: ['AgreementType'] },
        ...headers['agreementTypes']['columns'],
        { reportHeader: 'Total', attributeValues: ['Total'] },
      ],
    });

    return proceessedOtherAgreement;
    const currentYearIpAnalysis = await getIpAnalysis({
      ipAnalystDataSourceVersionId,
      customReportModel,
    });

    //Supplement ip part-2
    const accoladeMappingSheetData = await getAccoladeMappingSheet({
      portfolioDataSourceVersionId,
      disclosureDataSourceVersionId,
      shppAccoladeDataSourceVersionId,
      sabicAccoladeDataSourceVersionId,
      customReportModel,
      currentYear,
      isRowData,
    });

    const noOfActiveApplicationGroup: Record<string, number> = {};

    accoladeMappingSheetData.activeApplicationAccoladeStdData.forEach((entry) => {
      const accoladeID = entry.activeApplicationData.AccoladeID;
      if (accoladeID) {
        noOfActiveApplicationGroup[accoladeID] = (noOfActiveApplicationGroup[accoladeID] || 0) + 1;
      }
    });

    const noOfActiveApplicationCount = Object.entries(noOfActiveApplicationGroup).map(([AccoladeID, Count]) => ({
      AccoladeID,
      Count,
    }));

    const noOfnewFilingThisYearGroup: Record<string, number> = {};

    accoladeMappingSheetData.newFilingThisYearAccoladeStdData.forEach((entry) => {
      const accoladeID = entry.newFilingThisYearData.AccoladeID;
      if (accoladeID) {
        noOfnewFilingThisYearGroup[accoladeID] = (noOfnewFilingThisYearGroup[accoladeID] || 0) + 1;
      }
    });

    const noOfnewFilingThisYearCount = Object.entries(noOfnewFilingThisYearGroup).map(([AccoladeID, Count]) => ({
      AccoladeID,
      Count,
    }));

    const openDisclosureMap: Record<string, { count: number; cases: string[] }> = {};

    accoladeMappingSheetData.openDisclosureAccoladeStdData.forEach((entry) => {
      const { Accolade, DisclosureNumber } = entry.openDisclosureData;

      if (Accolade) {
        if (!openDisclosureMap[Accolade]) {
          openDisclosureMap[Accolade] = { count: 0, cases: [] };
        }
        openDisclosureMap[Accolade].count += 1;
        if (DisclosureNumber) {
          openDisclosureMap[Accolade].cases.push(DisclosureNumber);
        }
      }
    });

    // Transform the map into an array
    const noOfopenDisclosureCount = Object.entries(openDisclosureMap).map(([Accolade, { count, cases }]) => ({
      Accolade,
      Count: count,
      DisclosureNumbers: cases.join(', '),
    }));

    const draftDisclosureMap: Record<string, { count: number; cases: string[] }> = {};

    accoladeMappingSheetData.draftDisclosureAccoladeStdData.forEach((entry) => {
      const { Accolade, DisclosureNumber } = entry.draftDisclosureData;

      if (Accolade) {
        if (!draftDisclosureMap[Accolade]) {
          draftDisclosureMap[Accolade] = { count: 0, cases: [] };
        }
        draftDisclosureMap[Accolade].count += 1;
        if (DisclosureNumber) {
          draftDisclosureMap[Accolade].cases.push(DisclosureNumber);
        }
      }
    });

    // Transform the map into an array
    const noOfDraftDisclosureCount = Object.entries(draftDisclosureMap).map(([Accolade, { count, cases }]) => ({
      Accolade,
      Count: count,
      DisclosureNumbers: cases.join(', '),
    }));

    // await createExcelSheetFile(currentYearAgreementSigned, newFilePath, `Agreement signed in ${currentYear}`);
    await createExcelSheetFile(currentYearIpAnalysis.countData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(
      currentYearIpAnalysis.firstBarGraphChartData,
      newFilePath,
      `CURRENT YEAR IP ANALYSIS`,
      'GRAPH-BAR CHART'
    );
    await createExcelSheetFile(currentYearIpAnalysis.secondBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(currentYearIpAnalysis.thirdBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);

    await createExcelSheetFile(noOfActiveApplicationCount, newFilePath, `Active Application Count`);
    await createExcelSheetFile(noOfnewFilingThisYearCount, newFilePath, `New Filing Current Year`);
    await createExcelSheetFile(noOfopenDisclosureCount, newFilePath, `Open Disclosure Count`);
    await createExcelSheetFile(noOfDraftDisclosureCount, newFilePath, `Draft Disclosure Count`);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'completed' });
  } catch (e) {
    console.log('Error in generateSupplementalIpReport.', e);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
