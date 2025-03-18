import {
  getAccoladeMappingSheet,
  getAgreementSigned,
  getIpAnalysis,
} from '../../database/services/supplementalipReport.services';
import { createExcelSheetFile } from '../../utils/excel.utils';
import * as reportRequestService from '../../database/services/reportRequest.services';
import { CustomReportModelAccessReturnType } from '../../database/models/customReportModels';

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
}) => {
  try {
    const newFilePath = reportRequestPayload.filePath;
    const currentYear = reportRequestPayload.versionValue.split('-')[0];

    const accoladeMappingSheetData = await getAccoladeMappingSheet({
      portfolioDataSourceVersionId,
      disclosureDataSourceVersionId,
      customReportModel,
      currentYear,
      isRowData,
    });

    const currentYearAgreementSigned = await getAgreementSigned({
      sabicContractsDataSourceVersionId,
      shppContractsDataSourceVersionId,
      ksaContractsDataSourceVersionId,
      attorneyMappingDataSourceVersionId,
      agreementTypeMappingDataSourceVersionId,
      currentYear,
      customReportModel,
    });

    const currentYearIpAnalysis = await getIpAnalysis({
      ipAnalystDataSourceVersionId,
      customReportModel,
    });
    await createExcelSheetFile(currentYearAgreementSigned, newFilePath, `Agreement signed in ${currentYear}`);
    await createExcelSheetFile(currentYearIpAnalysis.countData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(
      currentYearIpAnalysis.firstBarGraphChartData,
      newFilePath,
      `CURRENT YEAR IP ANALYSIS`,
      'GRAPH-BAR CHART'
    );
    await createExcelSheetFile(currentYearIpAnalysis.secondBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(currentYearIpAnalysis.thirdBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);

    await reportRequestService.updateReportRequest(requestedReportId, { status: 'completed' });
  } catch (e) {
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
