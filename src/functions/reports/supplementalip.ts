import {
  getAccoladeMappingSheet,
  getActivePatentValueCoverage,
  getAgreementSigned,
  getIpAnalysis,
  getNewCoverage,
  getNewPatentValueCoverage,
  getStrategicReportingClass,
} from '../../database/services/supplementalipReport.services';
import { createExcelSheetFile, createUpdateExcelTable } from '../../utils/excel.utils';
import * as reportRequestService from '../../database/services/reportRequest.services';
import { CustomReportModelAccessReturnType } from '../../database/models/customReportModels';
import { ReportHeaders } from '../../utils/common.type';
import { processReportHeaders } from '../../utils/common.report';
import { createUpdateCustomDataSourceVersionValueFunction } from '../../api/controllers/dataSourceVersion.controller';

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
  // newly added supplementalIp fields
  supplementalIpAgreementsFinalAgreementTypeDataSourceId,
  supplementalIpAgreementsOthersDataSourceId,
  supplementalIpBangaloreIpGroupCurrentStatusDataSourceId,
  supplementalIpBangaloreIpGroupSbuDataSourceId,
  supplementalIpBangaloreIpGroupWorkScopeDataSourceId,
  supplementalIpBangaloreIpGroupWorkProductDataSourceId,
  supplementalIpAccoladeMappingSheetDataSourceId,
  supplementalIpPatentValueCoverageActiveDataSourceId,
  patentValueCoverageNewDataSourceId,
  supplementalIpStrategicReportingClassDataSourceId,
  supplementalIpNewCoverageDataSourceId,
  customReportModel,
  isRowData,
  headers,
  userId,
  orgCode,
  organizationId,
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
  // newly added supplementalIp types
  supplementalIpAgreementsFinalAgreementTypeDataSourceId: string;
  supplementalIpAgreementsOthersDataSourceId: string;
  supplementalIpBangaloreIpGroupCurrentStatusDataSourceId: string;
  supplementalIpBangaloreIpGroupSbuDataSourceId: string;
  supplementalIpBangaloreIpGroupWorkScopeDataSourceId: string;
  supplementalIpBangaloreIpGroupWorkProductDataSourceId: string;
  supplementalIpAccoladeMappingSheetDataSourceId: string;
  supplementalIpPatentValueCoverageActiveDataSourceId: string;
  patentValueCoverageNewDataSourceId: string;
  supplementalIpStrategicReportingClassDataSourceId: string;
  supplementalIpNewCoverageDataSourceId: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
  headers: ReportHeaders;
  userId: string;
  orgCode: string;
  organizationId: string;
}) => {
  try {
    const newFilePath = reportRequestPayload.filePath;
    const currentYear = reportRequestPayload.versionValue.split('-')[0];
    const customReportId = reportRequestPayload.customReportId;
    const versionValue = reportRequestPayload.versionValue;

    const currentYearAgreementSigned: any = await getAgreementSigned({
      sabicContractsDataSourceVersionId,
      shppContractsDataSourceVersionId,
      ksaContractsDataSourceVersionId,
      attorneyMappingDataSourceVersionId,
      agreementTypeMappingDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData,
    });

    const proceessedFinalAgreement = processReportHeaders({
      data: isRowData ? [] : currentYearAgreementSigned?.finalAgreementResult,
      headers: [
        { reportHeader: 'Final AgreementType', attributeValues: ['Final AgreementType'] },
        ...headers['finalAgreementTypes']['columns'],
        { reportHeader: 'Total', attributeValues: ['Total'] },
      ],
    });

    const dataSourceVersionDetailsFinalAgreement = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpAgreementsFinalAgreementTypeDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: proceessedFinalAgreement,
      userId,
      organizationId,
      orgCode,
    });

    const proceessedOtherAgreement = processReportHeaders({
      data: isRowData ? [] : currentYearAgreementSigned?.otherAgreementResult,
      headers: [
        { reportHeader: 'AgreementType', attributeValues: ['AgreementType'] },
        ...headers['agreementTypes']['columns'],
        { reportHeader: 'Total', attributeValues: ['Total'] },
      ],
    });

    const dataSourceVersionDetailsAgreementOthers = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpAgreementsOthersDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: proceessedOtherAgreement,
      userId,
      organizationId,
      orgCode,
    });

    const currentYearIpAnalysis = await getIpAnalysis({
      ipAnalystDataSourceVersionId,
      customReportModel,
    });

    const dataSourceVersionDetailspBangaloreIpGroupCurrentStatus =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: supplementalIpBangaloreIpGroupCurrentStatusDataSourceId,
        customReportId: customReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: currentYearIpAnalysis.countData,
        userId,
        organizationId,
        orgCode,
      });

    const dataSourceVersionDetailspBangaloreIpGroupSbuData = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpBangaloreIpGroupSbuDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: currentYearIpAnalysis.firstBarGraphChartData,
      userId,
      organizationId,
      orgCode,
    });

    const dataSourceVersionDetailspBangaloreIpGroupWorkScopeData =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: supplementalIpBangaloreIpGroupWorkScopeDataSourceId,
        customReportId: customReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: currentYearIpAnalysis.secondBarGraphChartData,
        userId,
        organizationId,
        orgCode,
      });

    const dataSourceVersionDetailspBangaloreIpGroupWorkProductData =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: supplementalIpBangaloreIpGroupWorkProductDataSourceId,
        customReportId: customReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: currentYearIpAnalysis.thirdBarGraphChartData,
        userId,
        organizationId,
        orgCode,
      });

    //Supplement ip part-2
    const accoladeMappingSheetData: any = await getAccoladeMappingSheet({
      portfolioDataSourceVersionId,
      disclosureDataSourceVersionId,
      shppAccoladeDataSourceVersionId,
      sabicAccoladeDataSourceVersionId,
      customReportModel,
      currentYear,
      isRowData,
    });

    // if (isRowData) {
    //   // rawDataActiveFilling, rawDataNewFilling, rawDataOpenDisclosure, rawDataDraftDisclosure
    //   return accoladeMappingSheetData.rawDataDraftDisclosure;
    // }

    const noOfActiveApplicationGroup: Record<string, number> = {};

    accoladeMappingSheetData.activeApplicationRawData.forEach((entry) => {
      const accoladeID = entry.rowData.AccoladeID;
      if (accoladeID) {
        noOfActiveApplicationGroup[accoladeID] = (noOfActiveApplicationGroup[accoladeID] || 0) + 1;
      }
    });

    const noOfnewFilingThisYearGroup: Record<string, number> = {};

    accoladeMappingSheetData.newFilingThisYearRawData.forEach((entry) => {
      const accoladeID = entry.rowData.AccoladeID;
      if (accoladeID) {
        noOfnewFilingThisYearGroup[accoladeID] = (noOfnewFilingThisYearGroup[accoladeID] || 0) + 1;
      }
    });

    const openDisclosureMap: Record<string, { count: number; cases: string[] }> = {};

    accoladeMappingSheetData.openDisclosureRawData.forEach((entry) => {
      const { Accolade, DisclosureNumber } = entry.rowData;

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

    const draftDisclosureMap: Record<string, { count: number; cases: string[] }> = {};

    accoladeMappingSheetData.draftDisclosureRawData.forEach((entry) => {
      const { Accolade, DisclosureNumber } = entry.rowData;

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

    const allAccoladeMappingSheet: any[] = [];
    for (let i = 0; i < accoladeMappingSheetData.combinedAccoladeStdData.length; i++) {
      const stdData = accoladeMappingSheetData.combinedAccoladeStdData[i];
      const projectId = stdData.ProjectID;
      allAccoladeMappingSheet.push({
        ...stdData,
        noOfActiveApplications: noOfActiveApplicationGroup[projectId],
        noOfNewApplications: noOfnewFilingThisYearGroup[projectId],
        noOfActiveDisclosures: openDisclosureMap[projectId]?.count,
        listOfActiveDisclosures: openDisclosureMap[projectId]?.cases.join(','),
        noOfRTDDisclosures: draftDisclosureMap[projectId]?.count,
        'List of RTD Disclosures': draftDisclosureMap[projectId]?.cases.join(','),
      });
    }

    const accoladeMappingSheetHeaders = [
      {
        reportHeader: 'SBU',
        attributeValues: ['SBU'],
      },
      {
        reportHeader: 'BU',
        attributeValues: ['BU'],
      },
      {
        reportHeader: 'TechGroup',
        attributeValues: ['TechGroup'],
      },
      {
        reportHeader: 'ProductLine',
        attributeValues: ['ProductLine'],
      },
      {
        reportHeader: 'ProjectID',
        attributeValues: ['ProjectID'],
      },
      {
        reportHeader: 'STDSBU',
        attributeValues: ['STD'],
      },
      {
        reportHeader: 'StrategicReportingClass',
        attributeValues: ['StrategicReportingClass'],
      },
      {
        reportHeader: 'SustainabilityImpactClassification',
        attributeValues: ['SustainabilityImpactClassification'],
      },
      {
        reportHeader: 'SustainabilityScore',
        attributeValues: ['SUSTotalSCORE'],
      },
      {
        reportHeader: 'NoofActiveApplications',
        attributeValues: ['noOfActiveApplications'],
      },
      {
        reportHeader: 'NoofNewApplications',
        attributeValues: ['noOfNewApplications'],
      },
      {
        reportHeader: 'NoofActiveDisclosures',
        attributeValues: ['noOfActiveDisclosures'],
      },
      {
        reportHeader: 'ListofActiveDisclosures',
        attributeValues: ['listOfActiveDisclosures'],
      },
      {
        reportHeader: 'NoofRTDDisclosures',
        attributeValues: ['noOfRTDDisclosures'],
      },
      {
        reportHeader: 'ListofRTDDisclosures',
        attributeValues: ['List of RTD Disclosures'],
      },
      {
        reportHeader: 'ProjectName',
        attributeValues: ['ProjectName'],
      },
      {
        reportHeader: 'RiskAdjustedNPV',
        attributeValues: ['RiskAdjustedNPV'],
      },
      {
        reportHeader: 'NPV',
        attributeValues: ['NPV'],
      },
      {
        reportHeader: 'ProjectCurrentStageName',
        attributeValues: ['ProjectCurrentStageName'],
      },
      {
        reportHeader: 'ProjectLastGateDecision',
        attributeValues: ['ProjectLastGateDecision'],
      },
      {
        reportHeader: 'ProjectClosed',
        attributeValues: ['ProjectClosed'],
      },
      {
        reportHeader: 'ProjectStageRelativePosition',
        attributeValues: ['ProjectStageRelativePosition'],
      },
      {
        reportHeader: 'TopProject',
        attributeValues: ['TopProject'],
      },
      {
        reportHeader: 'ProjectLeaderName',
        attributeValues: ['ProjectLeaderName'],
      },
      {
        reportHeader: 'ProjectType',
        attributeValues: ['ProjectType'],
      },
      {
        reportHeader: 'TI',
        attributeValues: ['TI'],
      },
      {
        reportHeader: 'IPLegalCounsilMemberAssigned',
        attributeValues: ['IPLegalCounsilMemberAssigned'],
      },
      {
        reportHeader: 'SVR',
        attributeValues: ['SVR'],
      },
      {
        reportHeader: 'Unique Chemistry',
        attributeValues: ['UniqueChemistry'],
      },
    ];

    const proceessedMappingSheetData = processReportHeaders({
      data: allAccoladeMappingSheet,
      headers: accoladeMappingSheetHeaders,
    });

    const dataSourceVersionDetailsAccoladeMappingSheetData = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpAccoladeMappingSheetDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: proceessedMappingSheetData,
      userId,
      organizationId,
      orgCode,
    });

    const activePatentValueCoverage = getActivePatentValueCoverage({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const dataSourceVersionDetailsPatentValueCoverageActiveData =
      await createUpdateCustomDataSourceVersionValueFunction({
        dataSourceId: supplementalIpPatentValueCoverageActiveDataSourceId,
        customReportId: customReportId,
        reportRequestId: requestedReportId,
        versionValue,
        versionData: activePatentValueCoverage,
        userId,
        organizationId,
        orgCode,
      });
    const newPatentValueCoverage = getNewPatentValueCoverage({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const dataSourceVersionDetailsPatentValueCoverageNewData = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: patentValueCoverageNewDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: newPatentValueCoverage,
      userId,
      organizationId,
      orgCode,
    });
    const strategicReportingClassData = getStrategicReportingClass({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const dataSourceVersionDetailsStrategicReportingClassData = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpStrategicReportingClassDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: strategicReportingClassData,
      userId,
      organizationId,
      orgCode,
    });

    const newCoverageData = getNewCoverage({ allAccoladeMappingSheetData: allAccoladeMappingSheet });
    const dataSourceVersionDetailspNewCoverageData = await createUpdateCustomDataSourceVersionValueFunction({
      dataSourceId: supplementalIpNewCoverageDataSourceId,
      customReportId: customReportId,
      reportRequestId: requestedReportId,
      versionValue,
      versionData: newCoverageData,
      userId,
      organizationId,
      orgCode,
    });

    await reportRequestService.updateReportRequest(requestedReportId, {
      status: 'completed',
      dataSourceVersion: [
        {
          sheetName: 'Agreements',
          sheetCode: 'agreements',
          tabName: 'Agreements:Final',
          mappingFuctionName: '',
          designCode: 'final',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsFinalAgreement.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsFinalAgreement.versionCode,
          dataSourceId: supplementalIpAgreementsFinalAgreementTypeDataSourceId,
        },
        {
          sheetName: 'Agreements',
          sheetCode: 'agreements',
          tabName: 'Agreements:Other',
          mappingFuctionName: '',
          designCode: 'other',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsAgreementOthers.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsAgreementOthers.versionCode,
          dataSourceId: supplementalIpAgreementsOthersDataSourceId,
        },
        {
          sheetName: 'BANGALORE IP GROUP',
          sheetCode: 'bangaloreipgroup',
          tabName: 'BANGALORE IP GROUP:Status',
          mappingFuctionName: '',
          designCode: 'status',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailspBangaloreIpGroupCurrentStatus.dataSourceVersionId,
          versionCode: dataSourceVersionDetailspBangaloreIpGroupCurrentStatus.versionCode,
          dataSourceId: supplementalIpBangaloreIpGroupCurrentStatusDataSourceId,
        },
        {
          sheetName: 'BANGALORE IP GROUP',
          sheetCode: 'bangaloreipgroup',
          tabName: 'BANGALORE IP GROUP:SBU',
          mappingFuctionName: '',
          designCode: 'sbu',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailspBangaloreIpGroupSbuData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailspBangaloreIpGroupSbuData.versionCode,
          dataSourceId: supplementalIpBangaloreIpGroupSbuDataSourceId,
        },
        {
          sheetName: 'BANGALORE IP GROUP',
          sheetCode: 'bangaloreipgroup',
          tabName: 'BANGALORE IP GROUP:Workscope',
          mappingFuctionName: '',
          designCode: 'workscope',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailspBangaloreIpGroupWorkScopeData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailspBangaloreIpGroupWorkScopeData.versionCode,
          dataSourceId: supplementalIpBangaloreIpGroupWorkScopeDataSourceId,
        },
        {
          sheetName: 'BANGALORE IP GROUP',
          sheetCode: 'bangaloreipgroup',
          tabName: 'BANGALORE IP GROUP:Work Product',
          mappingFuctionName: '',
          designCode: 'workproduct',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailspBangaloreIpGroupWorkProductData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailspBangaloreIpGroupWorkProductData.versionCode,
          dataSourceId: supplementalIpBangaloreIpGroupWorkProductDataSourceId,
        },
        {
          sheetName: 'Accolade Mapping Sheet',
          sheetCode: 'accolademappingsheet',
          tabName: 'Accolade Mapping Sheet',
          mappingFuctionName: 'transformSupplementalIpAccoladeMappingSheet',
          designCode: 'accolademappingsheet',
          allowPdfDownload: false,
          dataSourceVersionId: dataSourceVersionDetailsAccoladeMappingSheetData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsAccoladeMappingSheetData.versionCode,
          dataSourceId: supplementalIpAccoladeMappingSheetDataSourceId,
        },
        {
          sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
          sheetCode: 'patentvaluecoverageactive',
          tabName: 'PATENT VALUE COVERAGE-ACTIVE',
          mappingFuctionName: 'transformSupplementalIpPatentValueCoverageActive',
          designCode: 'patentvaluecoverageactive',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsPatentValueCoverageActiveData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsPatentValueCoverageActiveData.versionCode,
          dataSourceId: supplementalIpPatentValueCoverageActiveDataSourceId,
        },
        {
          sheetName: 'PATENT VALUE COVERAGE-NEW',
          sheetCode: 'patentvaluecoveragenew',
          tabName: 'PATENT VALUE COVERAGE-NEW',
          mappingFuctionName: 'transformSupplementalIPatentValueCoverageNew',
          designCode: 'patentvaluecoveragenew',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsPatentValueCoverageNewData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsPatentValueCoverageNewData.versionCode,
          dataSourceId: supplementalIpNewCoverageDataSourceId,
        },
        {
          sheetName: 'Strategic Reporting Class',
          sheetCode: 'strategicreportingclass',
          tabName: 'Strategic Reporting Class',
          mappingFuctionName: 'transformSupplementalIpStrategicReportingClass',
          designCode: 'strategicreportingclass',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailsStrategicReportingClassData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailsStrategicReportingClassData.versionCode,
          dataSourceId: supplementalIpStrategicReportingClassDataSourceId,
        },
        {
          sheetName: 'New Coverage',
          sheetCode: 'newcoverage',
          tabName: 'New Coverage',
          mappingFuctionName: 'transformSupplementalIpNewCoverage',
          designCode: 'newcoverage',
          allowPdfDownload: true,
          dataSourceVersionId: dataSourceVersionDetailspNewCoverageData.dataSourceVersionId,
          versionCode: dataSourceVersionDetailspNewCoverageData.versionCode,
          dataSourceId: supplementalIpNewCoverageDataSourceId,
        },
      ],
    });

    // await createUpdateExcelTable({
    //   data: proceessedFinalAgreement,
    //   filePath: newFilePath,
    //   sheetName: 'Agreements',
    //   gap: 2,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: [
    //     'Final AgreementType',
    //     ...headers['finalAgreementTypes']['columns'].map((data) => data.reportHeader),
    //     'Total',
    //   ],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: [{ 'Final AgreementType': '', Others: '' }],
    //   filePath: newFilePath,
    //   sheetName: 'Agreements',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   headers: ['Final AgreementType', 'Others'],
    //   onlyHeader: true,
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: proceessedOtherAgreement,
    //   filePath: newFilePath,
    //   sheetName: 'Agreements',
    //   gap: 2,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: ['AgreementType', ...headers['agreementTypes']['columns'].map((data) => data.reportHeader), 'Total'],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: currentYearIpAnalysis.countData,
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 2,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: ['Current Status', 'Count of Serial No'],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: [{ 'Current Status': '', Completed: '' }],
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   headers: ['Current Status', 'Completed'],
    //   onlyHeader: true,
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: currentYearIpAnalysis.firstBarGraphChartData,
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: ['SBU', 'Count of Serial No'],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: [{ 'Current Status': '', Completed: '' }],
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   headers: ['Current Status', 'Completed'],
    //   onlyHeader: true,
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: currentYearIpAnalysis.secondBarGraphChartData,
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: ['Workscope', 'Count of Serial No'],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: [{ 'Current Status': 'Workscope', Completed: 'SEARCH & ANALYSIS' }],
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   cellBackGroundColor: 'fff2cc',
    //   cellBold: true,
    //   headers: ['Current Status', 'Completed'],
    //   onlyHeader: false,
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: currentYearIpAnalysis.thirdBarGraphChartData,
    //   filePath: newFilePath,
    //   sheetName: 'BANGALORE IP GROUP',
    //   gap: 1,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: ['Work Product', 'Count of Serial No'],
    //   isWhiteBackGround: true,
    // });

    // await createUpdateExcelTable({
    //   data: proceessedMappingSheetData,
    //   filePath: newFilePath,
    //   sheetName: 'Accolade Mapping Sheet',
    //   gap: 0,
    //   startTableColumn: 'A',
    //   headerBackgroundColor: '9dc3e6',
    //   headers: accoladeMappingSheetHeaders.map((data) => data.reportHeader),
    //   isWhiteBackGround: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 1,
    //   startTableColumn: 'B',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Closed= OPEN',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: activePatentValueCoverage,
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: [
    //     'SBU',
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
    //     'No Disclosure for filing',
    //     '% OF RANPVE COVERED-No Disclosure for filing',
    //     'Disclosure for Filing',
    //     '% OF RANPVE COVERED-Disclosure available for filing',
    //     'Patent application filing in progress(Rated to Draft)',
    //     '% COVERED-Patent application filing in progress',
    //   ],
    //   isWhiteBackGround: true,
    //   cellFormats: {
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
    //     'No Disclosure for filing': '"$" #,##0,, "M"',
    //     '% OF RANPVE COVERED-No Disclosure for filing': '0%',
    //     'Disclosure for Filing': '"$" #,##0,, "M"',
    //     '% OF RANPVE COVERED-Disclosure available for filing': '0%',
    //     'Patent application filing in progress(Rated to Draft)': '"$" #,##0,, "M"',
    //     '% COVERED-Patent application filing in progress': '0%',
    //   },
    //   startCellNumber: 2,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 1,
    //   startTableColumn: 'B',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Closed= OPEN',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Current Stage Name= STAGE 3-STAGE 5',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: newPatentValueCoverage,
    //   filePath: newFilePath,
    //   sheetName: 'PATENT VALUE COVERAGE-NEW',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: [
    //     'SBU',
    //     'TOTAL FIRST FILINGS',
    //     'FILINGS HAVING AT LEAST ONE ACCOLADE NUMBER /TSR',
    //     'FILINGS HAVING NO ACCOLADE NUMBER /TSR',
    //     'NO. OF ACCOLADE PROJECTS COVERED',
    //     'RANPV OF PHASE 3-5 PROJECTS ($M)',
    //     'RANPV OF PHASE 3-5 PROJECTS COVERED BY NEW PATENT FILINGS ($M)',
    //     '% OF TOTAL RANPV COVERED BY NEW PATENT FILINGS',
    //   ],
    //   isWhiteBackGround: true,
    //   cellFormats: {
    //     'RANPV OF PHASE 3-5 PROJECTS ($M)': '"$" #,##0,, "M"',
    //     'RANPV OF PHASE 3-5 PROJECTS COVERED BY NEW PATENT FILINGS ($M)': '"$" #,##0,, "M"',
    //     '% OF TOTAL RANPV COVERED BY NEW PATENT FILINGS': '0%',
    //   },
    //   startCellNumber: 2,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'Strategic Reporting Class',
    //   gap: 1,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Closed= OPEN',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'Strategic Reporting Class',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'Strategic Reporting Class',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: strategicReportingClassData,
    //   filePath: newFilePath,
    //   sheetName: 'Strategic Reporting Class',
    //   gap: 3,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: [
    //     'Strategic Reporting Class',
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
    //     '# OF ACCOLADE PROJECTS',
    //   ],
    //   isWhiteBackGround: true,
    //   cellFormats: {
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
    //     '# OF ACCOLADE PROJECTS': '0',
    //   },
    //   startCellNumber: 2,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 1,
    //   startTableColumn: 'B',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Closed= OPEN',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 2,
    //   mergeEndColumn: 5,
    //   titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
    //   cellBold: false,
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 2,
    //   startTableColumn: 'C',
    //   headerBackgroundColor: 'bfbfbf',
    //   titleHeaderBackgroundColor: 'bfbfbf',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 3,
    //   mergeEndColumn: 5,
    //   titleHeading: 'CURRENT',
    //   cellBold: true,
    //   titleCellAlignment: 'center',
    // });

    // await createUpdateExcelTable({
    //   data: [],
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: -1,
    //   startTableColumn: 'F',
    //   headerBackgroundColor: 'fff2cc',
    //   titleHeaderBackgroundColor: 'fff2cc',
    //   headers: [],
    //   isWhiteBackGround: true,
    //   startCellNumber: 6,
    //   mergeEndColumn: 8,
    //   titleHeading: 'NEW',
    //   cellBold: true,
    //   titleCellAlignment: 'center',
    // });
    // await createUpdateExcelTable({
    //   data: newCoverageData,
    //   filePath: newFilePath,
    //   sheetName: 'New Coverage',
    //   gap: 0,
    //   startTableColumn: 'B',
    //   headerBackgroundColor: '9dc3e6',
    //   lastRowColor: '9dc3e6',
    //   headers: [
    //     'SBU',
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
    //     'NEW RANPV OF PHASE 1-5 PROJECTS ($M)',
    //     'NEW RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
    //     'NEW % OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
    //   ],
    //   isWhiteBackGround: true,
    //   cellFormats: {
    //     'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
    //     'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
    //     '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
    //     'NEW RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
    //     'NEW RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
    //     'NEW % OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
    //   },
    //   startCellNumber: 2,
    // });
    // await reportRequestService.updateReportRequest(requestedReportId, { status: 'completed' });
  } catch (e) {
    console.log('Error in generateSupplementalIpReport.', e);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
