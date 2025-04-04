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

    // const noOfActiveApplicationCount = Object.entries(noOfActiveApplicationGroup).map(([AccoladeID, Count]) => ({
    //   AccoladeID,
    //   Count,
    // }));

    const noOfnewFilingThisYearGroup: Record<string, number> = {};

    accoladeMappingSheetData.newFilingThisYearAccoladeStdData.forEach((entry) => {
      const accoladeID = entry.newFilingThisYearData.AccoladeID;
      if (accoladeID) {
        noOfnewFilingThisYearGroup[accoladeID] = (noOfnewFilingThisYearGroup[accoladeID] || 0) + 1;
      }
    });

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
    // const noOfopenDisclosureCount = Object.entries(openDisclosureMap).map(([Accolade, { count, cases }]) => ({
    //   Accolade,
    //   Count: count,
    //   DisclosureNumbers: cases.join(', '),
    // }));

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
    // const noOfDraftDisclosureCount = Object.entries(draftDisclosureMap).map(([Accolade, { count, cases }]) => ({
    //   Accolade,
    //   Count: count,
    //   DisclosureNumbers: cases.join(', '),
    // }));

    const checkExistingProjectId = {};
    const allAccoladeMappingSheet: any[] = [];
    for (let i = 0; i < accoladeMappingSheetData.allStdData.length; i++) {
      const stdData = accoladeMappingSheetData.allStdData[i];
      const projectId = stdData.ProjectID;
      if (!checkExistingProjectId[projectId]) {
        allAccoladeMappingSheet.push({
          ...stdData,
          noOfActiveApplications: noOfActiveApplicationGroup[projectId],
          noOfNewApplications: noOfnewFilingThisYearGroup[projectId],
          noOfActiveDisclosures: openDisclosureMap[projectId]?.count,
          listOfActiveDisclosures: openDisclosureMap[projectId]?.cases.join(','),
          noOfRTDDisclosures: draftDisclosureMap[projectId]?.count,
          'List of RTD Disclosures': draftDisclosureMap[projectId]?.cases.join(','),
        });

        checkExistingProjectId[projectId] = true;
      }
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
        reportHeader: 'Tech Group',
        attributeValues: ['TechGroup'],
      },
      {
        reportHeader: 'Product Line',
        attributeValues: ['ProductLine'],
      },
      {
        reportHeader: 'Project ID',
        attributeValues: ['ProjectID'],
      },
      {
        reportHeader: 'STD. SBU',
        attributeValues: ['STD'],
      },
      {
        reportHeader: 'Strategic Reporting Class',
        attributeValues: ['StrategicReportingClass'],
      },
      {
        reportHeader: 'Sustainability Impact Classification',
        attributeValues: ['SustainabilityImpactClassification'],
      },
      {
        reportHeader: 'Sustainability Score',
        attributeValues: ['SUSTotalSCORE'],
      },
      {
        reportHeader: 'No. of Active Applications',
        attributeValues: ['noOfActiveApplications'],
      },
      {
        reportHeader: 'No. of New Applications',
        attributeValues: ['noOfNewApplications'],
      },
      {
        reportHeader: 'No. of Active Disclosures',
        attributeValues: ['noOfActiveDisclosures'],
      },
      {
        reportHeader: 'List of Active Disclosures',
        attributeValues: ['listOfActiveDisclosures'],
      },
      {
        reportHeader: 'No. of RTD Disclosures',
        attributeValues: ['noOfRTDDisclosures'],
      },
      {
        reportHeader: 'List of RTD Disclosures',
        attributeValues: ['List of RTD Disclosures'],
      },
      {
        reportHeader: 'Project Name',
        attributeValues: ['ProjectName'],
      },
      {
        reportHeader: 'Risk-Adjusted NPV',
        attributeValues: ['RiskAdjustedNPV'],
      },
      {
        reportHeader: 'NPV',
        attributeValues: ['NPV'],
      },
      {
        reportHeader: 'Project Current Stage Name',
        attributeValues: ['ProjectCurrentStageName'],
      },
      {
        reportHeader: 'Project Last Gate Decision',
        attributeValues: ['ProjectLastGateDecision'],
      },
      {
        reportHeader: 'Project Closed',
        attributeValues: ['ProjectClosed'],
      },
      {
        reportHeader: 'Project Stage Relative Position',
        attributeValues: ['ProjectStageRelativePosition'],
      },
      {
        reportHeader: 'Top Project',
        attributeValues: ['TopProject'],
      },
      {
        reportHeader: 'Project Leader Name',
        attributeValues: ['ProjectLeaderName'],
      },
      {
        reportHeader: 'Project Type',
        attributeValues: ['ProjectType'],
      },
      {
        reportHeader: 'T&I',
        attributeValues: ['TI'],
      },
      {
        reportHeader: 'IP Legal Counsil Member Assigned',
        attributeValues: ['IPLegalCounsilMemberAssigned'],
      },
      {
        reportHeader: 'SVR',
        attributeValues: ['SVR'],
      },
    ];

    const proceessedMappingSheetData = processReportHeaders({
      data: allAccoladeMappingSheet,
      headers: accoladeMappingSheetHeaders,
    });

    const activePatentValueCoverage = getActivePatentValueCoverage({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const newPatentValueCoverage = getNewPatentValueCoverage({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const strategicReportingClassData = getStrategicReportingClass({
      allAccoladeMappingSheetData: allAccoladeMappingSheet,
    });

    const newCoverageData = getNewCoverage({ allAccoladeMappingSheetData: allAccoladeMappingSheet });

    await createUpdateExcelTable({
      data: proceessedFinalAgreement,
      filePath: newFilePath,
      sheetName: 'Agreements',
      gap: 2,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: [
        'Final AgreementType',
        ...headers['finalAgreementTypes']['columns'].map((data) => data.reportHeader),
        'Total',
      ],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: [{ 'Final AgreementType': '', Others: '' }],
      filePath: newFilePath,
      sheetName: 'Agreements',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      headers: ['Final AgreementType', 'Others'],
      onlyHeader: true,
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: proceessedOtherAgreement,
      filePath: newFilePath,
      sheetName: 'Agreements',
      gap: 2,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: ['AgreementType', ...headers['agreementTypes']['columns'].map((data) => data.reportHeader), 'Total'],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: currentYearIpAnalysis.countData,
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 2,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: ['Current Status', 'Count of Serial No'],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: [{ 'Current Status': '', Completed: '' }],
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      headers: ['Current Status', 'Completed'],
      onlyHeader: true,
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: currentYearIpAnalysis.firstBarGraphChartData,
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: ['SBU', 'Count of Serial No'],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: [{ 'Current Status': '', Completed: '' }],
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      headers: ['Current Status', 'Completed'],
      onlyHeader: true,
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: currentYearIpAnalysis.secondBarGraphChartData,
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: ['Workscope', 'Count of Serial No'],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: [{ 'Current Status': 'Workscope', Completed: 'SEARCH & ANALYSIS' }],
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      cellBackGroundColor: 'fff2cc',
      cellBold: true,
      headers: ['Current Status', 'Completed'],
      onlyHeader: false,
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: currentYearIpAnalysis.thirdBarGraphChartData,
      filePath: newFilePath,
      sheetName: 'BANGALORE IP GROUP',
      gap: 1,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: ['Work Product', 'Count of Serial No'],
      isWhiteBackGround: true,
    });

    await createUpdateExcelTable({
      data: proceessedMappingSheetData,
      filePath: newFilePath,
      sheetName: 'Accolade Mapping Sheet',
      gap: 0,
      startTableColumn: 'A',
      headerBackgroundColor: '9dc3e6',
      headers: accoladeMappingSheetHeaders.map((data) => data.reportHeader),
      isWhiteBackGround: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 1,
      startTableColumn: 'B',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Closed= OPEN',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: activePatentValueCoverage,
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-ACTIVE',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: [
        'SBU',
        'RANPV OF PHASE 1-5 PROJECTS ($M)',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
        'No Disclosure for filing',
        '% OF RANPVE COVERED-No Disclosure for filing',
        'Disclosure for Filing',
        '% OF RANPVE COVERED-Disclosure available for filing',
        'Patent application filing in progress(Rated to Draft)',
        '% COVERED-Patent application filing in progress',
      ],
      isWhiteBackGround: true,
      cellFormats: {
        'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
        'No Disclosure for filing': '"$" #,##0,, "M"',
        '% OF RANPVE COVERED-No Disclosure for filing': '0%',
        'Disclosure for Filing': '"$" #,##0,, "M"',
        '% OF RANPVE COVERED-Disclosure available for filing': '0%',
        'Patent application filing in progress(Rated to Draft)': '"$" #,##0,, "M"',
        '% COVERED-Patent application filing in progress': '0%',
      },
      startCellNumber: 2,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 1,
      startTableColumn: 'B',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Closed= OPEN',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Current Stage Name= STAGE 3-STAGE 5',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: newPatentValueCoverage,
      filePath: newFilePath,
      sheetName: 'PATENT VALUE COVERAGE-NEW',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: [
        'SBU',
        'TOTAL FIRST FILINGS',
        'FILINGS HAVING AT LEAST ONE ACCOLADE NUMBER /TSR',
        'FILINGS HAVING NO ACCOLADE NUMBER /TSR',
        'NO. OF ACCOLADE PROJECTS COVERED',
        'RANPV OF PHASE 3-5 PROJECTS ($M)',
        'RANPV OF PHASE 3-5 PROJECTS COVERED BY NEW PATENT FILINGS ($M)',
        '% OF TOTAL RANPV COVERED BY NEW PATENT FILINGS',
      ],
      isWhiteBackGround: true,
      cellFormats: {
        'RANPV OF PHASE 3-5 PROJECTS ($M)': '"$" #,##0,, "M"',
        'RANPV OF PHASE 3-5 PROJECTS COVERED BY NEW PATENT FILINGS ($M)': '"$" #,##0,, "M"',
        '% OF TOTAL RANPV COVERED BY NEW PATENT FILINGS': '0%',
      },
      startCellNumber: 2,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Strategic Reporting Class',
      gap: 1,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Closed= OPEN',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Strategic Reporting Class',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'Strategic Reporting Class',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: strategicReportingClassData,
      filePath: newFilePath,
      sheetName: 'Strategic Reporting Class',
      gap: 3,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: [
        'Strategic Reporting Class',
        'RANPV OF PHASE 1-5 PROJECTS ($M)',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
        '# OF ACCOLADE PROJECTS',
      ],
      isWhiteBackGround: true,
      cellFormats: {
        'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
      },
      startCellNumber: 2,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 1,
      startTableColumn: 'B',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Closed= OPEN',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Last Gate Decision= Exclude HOLD/STOP',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Current Stage Name= STAGE 1-STAGE 5',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Strategic Reporting Class = Exclude ASSET SUPPORT',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 2,
      mergeEndColumn: 5,
      titleHeading: '·        Project Type= Exclude the items that CONTAINS TSR',
      cellBold: false,
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 2,
      startTableColumn: 'C',
      headerBackgroundColor: 'bfbfbf',
      titleHeaderBackgroundColor: 'bfbfbf',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 3,
      mergeEndColumn: 5,
      titleHeading: 'CURRENT',
      cellBold: true,
      titleCellAlignment: 'center',
    });

    await createUpdateExcelTable({
      data: [],
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: -1,
      startTableColumn: 'F',
      headerBackgroundColor: 'fff2cc',
      titleHeaderBackgroundColor: 'fff2cc',
      headers: [],
      isWhiteBackGround: true,
      startCellNumber: 6,
      mergeEndColumn: 8,
      titleHeading: 'NEW',
      cellBold: true,
      titleCellAlignment: 'center',
    });
    await createUpdateExcelTable({
      data: newCoverageData,
      filePath: newFilePath,
      sheetName: 'New Coverage',
      gap: 0,
      startTableColumn: 'B',
      headerBackgroundColor: '9dc3e6',
      lastRowColor: '9dc3e6',
      headers: [
        'SBU',
        'RANPV OF PHASE 1-5 PROJECTS ($M)',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
        'NEW RANPV OF PHASE 1-5 PROJECTS ($M)',
        'NEW RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)',
        'NEW % OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS',
      ],
      isWhiteBackGround: true,
      cellFormats: {
        'RANPV OF PHASE 1-5 PROJECTS ($M)': '"$" #,##0,, "M"',
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': '"$" #,##0,, "M"',
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': '0%',
      },
      startCellNumber: 2,
    });
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'completed' });
  } catch (e) {
    console.log('Error in generateSupplementalIpReport.', e);
    await reportRequestService.updateReportRequest(requestedReportId, { status: 'failed' });
  }
};
