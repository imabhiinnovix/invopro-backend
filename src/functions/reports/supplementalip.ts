import {
  getAccoladeMappingSheet,
  getActivePatentValueCoverage,
  getAgreementSigned,
  getIpAnalysis,
  getNewCoverage,
  getNewPatentValueCoverage,
  getStrategicReportingClass,
} from '../../database/services/common/supplementalipReport.services';
import { createExcelSheetFile, createUpdateExcelTable } from '../../utils/excel.utils';
import * as reportRequestService from '../../database/services/reportivix/reportRequest.services';
import { CustomReportModelAccessReturnType } from '../../database/models/reportivix/customReportModels';
import { ReportHeaders } from '../../utils/common.type';
import { processReportHeaders } from '../../utils/common.report';
import { createUpdateCustomDataSourceVersionValueFunction } from '../../api/controllers/common/dataSourceVersion.controller';
import {
  getCurrentYearNewApplicationFiled,
  getFormattedDataToProcessReportHeaders,
} from '../../database/services/reportivix/monthlyipReport.services';
import { ICustomReport } from '../../database/models/reportivix/customReport';

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
  customReportDetails,
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
  customReportDetails: ICustomReport;
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

    const finalAgreementSBUHeadersFilter = customReportDetails.filters.find(
      (filter) => filter.sheetCode === 'agreements' && filter.section === 'finalAgreementTypes'
    );
    const finalAgreementSBUHeaders = finalAgreementSBUHeadersFilter?.['columns']
      ? finalAgreementSBUHeadersFilter?.['columns']
      : [];

    const proceessedFinalAgreement = processReportHeaders({
      data: isRowData ? [] : currentYearAgreementSigned?.finalAgreementResult,
      headers: [
        { reportHeader: 'Final AgreementType', attributeValues: ['Final AgreementType'] },
        ...finalAgreementSBUHeaders,
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

    const agreementTypesSBUHeadersFilter = customReportDetails.filters.find(
      (filter) => filter.sheetCode === 'agreements' && filter.section === 'agreementTypes'
    );
    const agreementTypesSBUHeaders = agreementTypesSBUHeadersFilter?.['columns']
      ? agreementTypesSBUHeadersFilter?.['columns']
      : [];
    const proceessedOtherAgreement = processReportHeaders({
      data: isRowData ? [] : currentYearAgreementSigned?.otherAgreementResult,
      headers: [
        { reportHeader: 'AgreementType', attributeValues: ['AgreementType'] },
        ...agreementTypesSBUHeaders,
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
    // const newPatentValueCoverage = getNewPatentValueCoverage({
    //   allAccoladeMappingSheetData: allAccoladeMappingSheet,
    // });

    const patentValueCoverageNewSBUHeadersFilter = customReportDetails.filters.find(
      (filter) => filter.sheetCode === 'patentvaluecoveragenew' && filter.section === 'patentvaluecoveragenew'
    );
    const patentValueCoverageNewSBUHeaders = patentValueCoverageNewSBUHeadersFilter?.['columns']
      ? patentValueCoverageNewSBUHeadersFilter?.['columns']
      : [];
    const patentValueCoverageNewSBUHeadersAll = patentValueCoverageNewSBUHeaders.flatMap(
      (item) => item.attributeValues
    );
    const newPatentValueCoverageRawData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      customReportModel,
      isRowData: true,
      sbuHeaders: patentValueCoverageNewSBUHeadersAll,
    });

    const newPatentValueCoverage: any[] = [];
    const total = {
      SBU: 'Total',
      TOTALFIRSTFILINGS: 0,
      FILINGSHAVINGATLEASTONEACCOLADENUMBERorTSR: 0,
      FILINGSHAVINGNOACCOLADENUMBERorTSR: 0,
      NOOFACCOLADEPROJECTSCOVERED: 0,
    };

    for (const sbuHeader of patentValueCoverageNewSBUHeaders) {
      const { reportHeader, attributeValues } = sbuHeader;

      // Filter cases matching current SBU group
      const filteredCases = newPatentValueCoverageRawData.filter(
        (entry) => entry && attributeValues.includes(entry.SBU)
      );

      const totalFirstFilings = filteredCases.length;

      const filingsWithAccolade = filteredCases.filter((entry) => !!entry.AccoladeID).length;
      const filingsWithoutAccolade = filteredCases.filter((entry) => !entry.AccoladeID).length;

      const accoladeProjects = new Set(filteredCases.map((entry) => entry.AccoladeID).filter((id) => !!id)).size;

      newPatentValueCoverage.push({
        SBU: reportHeader,
        TOTALFIRSTFILINGS: totalFirstFilings,
        FILINGSHAVINGATLEASTONEACCOLADENUMBERorTSR: filingsWithAccolade,
        FILINGSHAVINGNOACCOLADENUMBERorTSR: filingsWithoutAccolade,
        NOOFACCOLADEPROJECTSCOVERED: accoladeProjects,
      });

      total['TOTALFIRSTFILINGS'] += totalFirstFilings;
      total['FILINGSHAVINGATLEASTONEACCOLADENUMBERorTSR'] += filingsWithAccolade;
      total['FILINGSHAVINGNOACCOLADENUMBERorTSR'] += filingsWithoutAccolade;
      total['NOOFACCOLADEPROJECTSCOVERED'] += accoladeProjects;
    }

    newPatentValueCoverage.push(total);

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
    const reportSettingDetails = customReportDetails.reportSettings;
    const sheetCodeNameMap = reportSettingDetails.reduce((acc, { sheetCode, sheetName }) => {
      acc[sheetCode] = sheetName;
      return acc;
    }, {});
    await reportRequestService.updateReportRequest(requestedReportId, {
      status: 'completed',
      dataSourceVersion: [
        {
          sheetName: sheetCodeNameMap['agreements'],
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
          sheetName: sheetCodeNameMap['agreements'],
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
          sheetName: sheetCodeNameMap['bangaloreipgroup'],
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
          sheetName: sheetCodeNameMap['bangaloreipgroup'],
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
          sheetName: sheetCodeNameMap['bangaloreipgroup'],
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
          sheetName: sheetCodeNameMap['bangaloreipgroup'],
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
          sheetName: sheetCodeNameMap['accolademappingsheet'],
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
          sheetName: sheetCodeNameMap['patentvaluecoverageactive'],
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
          sheetName: sheetCodeNameMap['patentvaluecoveragenew'],
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
          sheetName: sheetCodeNameMap['strategicreportingclass'],
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
          sheetName: sheetCodeNameMap['newcoverage'],
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
  } catch (e) {
    console.log('Error in generateSupplementalIpReport.', e);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
