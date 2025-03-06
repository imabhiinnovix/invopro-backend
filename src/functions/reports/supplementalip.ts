import { getAgreementSigned, getIpAnalysis } from '../../database/services/supplementalipReport.services';
import { createExcelSheetFile } from '../../utils/excel.utils';

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
    });

    const currentYearIpAnalysis = await getIpAnalysis({
      ipAnalystDataSourceVersionId,
    });
    await createExcelSheetFile(currentYearAgreementSigned, newFilePath, `Agreement signed in ${currentYear}`);
    await createExcelSheetFile(currentYearIpAnalysis.countData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(currentYearIpAnalysis.firstBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(currentYearIpAnalysis.secondBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
    await createExcelSheetFile(currentYearIpAnalysis.thirdBarGraphChartData, newFilePath, `CURRENT YEAR IP ANALYSIS`);
  } catch (e) {
    throw e;
  }
};
