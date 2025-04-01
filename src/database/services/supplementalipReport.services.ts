import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import createDefaultDataSourceVersionModel from '../models/defaultDataSourceVersionModel';
import { CustomReportModelAccessReturnType } from '../models/customReportModels';
const ObjectId = mongoose.Types.ObjectId;

export async function getAgreementSigned({
  sabicContractsDataSourceVersionId,
  shppContractsDataSourceVersionId,
  ksaContractsDataSourceVersionId,
  attorneyMappingDataSourceVersionId,
  agreementTypeMappingDataSourceVersionId,
  currentYear,
  customReportModel,
}: {
  sabicContractsDataSourceVersionId: string;
  shppContractsDataSourceVersionId: string;
  ksaContractsDataSourceVersionId: string;
  attorneyMappingDataSourceVersionId: string;
  agreementTypeMappingDataSourceVersionId: string;
  currentYear: string;
  customReportModel: CustomReportModelAccessReturnType;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const sabicContractDetails = await customReportModel.DataSourceVersionValueSabicContracts.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(sabicContractsDataSourceVersionId),
          'rowData.SignedOn': yearDateRange,
        },
      },
    ]);

    const rowDataSabicContractDetails = sabicContractDetails?.map((data) => data.rowData);

    const shppContractDetails = await customReportModel.DataSourceVersionValueShppContracts.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(shppContractsDataSourceVersionId),
          'rowData.SignedOn': yearDateRange,
        },
      },
    ]);

    const rowDataShppContractDetails = shppContractDetails?.map((data) => data.rowData);

    const ksaContractDetails = await customReportModel.DataSourceVersionValueKsaContracts.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ksaContractsDataSourceVersionId),
          'rowData.StatusDate': yearDateRange,
          'rowData.AgreementExecuted': { $regex: 'PROC|YES', $options: 'i' },
          'rowData.ReferenceNumber': { $regex: 'PROC|REV', $options: 'i' },
        },
      },
    ]);

    const rowDataKsaContractDetails = ksaContractDetails.map((data) => data.rowData);

    const attorneyMappingContractDetails = await customReportModel.DataSourceVersionValueAttorneyMapping.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(attorneyMappingDataSourceVersionId),
        },
      },
    ]);

    const rowDataAttorneyMappingContractDetails = attorneyMappingContractDetails.map((data) => data.rowData);

    const agreementTypeMappingContractDetails =
      await customReportModel.DataSourceVersionValueAgreementTypemapping.aggregate([
        {
          $match: {
            dataSourceVersionId: new ObjectId(agreementTypeMappingDataSourceVersionId),
          },
        },
      ]);

    const rowDataAgreementTypeMappingContractDetails = agreementTypeMappingContractDetails.map((data) => data.rowData);

    let rowDataSabicContractDetailsCounselMapping = rowDataSabicContractDetails
      .map((data) => {
        let matchingAttorney = rowDataAttorneyMappingContractDetails.find(
          (attorney) =>
            attorney?.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data?.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAttorney && data.Counsel) {
          return { ...data, SBU: matchingAttorney.SBU };
        }
        return null;
      })
      .filter((item) => item !== null);

    let rowDataShppContractDetailsCounselMapping = rowDataShppContractDetails
      .map((data) => {
        let matchingAttorney = rowDataAttorneyMappingContractDetails.find(
          (attorney) =>
            attorney?.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data?.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAttorney && data.Counsel) {
          return { ...data, SBU: matchingAttorney.SBU };
        }
        return null;
      })
      .filter((item) => item !== null);

    let rowDataKsaContractDetailsAttorneyiesMapping = rowDataKsaContractDetails
      .map((data) => {
        let matchingAttorney = rowDataAttorneyMappingContractDetails.find(
          (attorney) =>
            attorney?.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data?.Attorneyies?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAttorney && data.Counsel) {
          return { ...data, SBU: matchingAttorney.SBU };
        }
        return null;
      })
      .filter((item) => item !== null);

    let finalDataSabicContractDetailsAgreementTypeMapping = rowDataSabicContractDetailsCounselMapping
      .map((data) => {
        let matchingAgreement = rowDataAgreementTypeMappingContractDetails.find(
          (agreement) =>
            agreement.AgreementType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.AgreementType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAgreement && data.AgreementType) {
          return { ...data, finalAgreementType: matchingAgreement['Final AgreementType'] };
        }
        return null;
      })
      .filter((item) => item !== null);

    let finalDataShppContractDetailsAgreementTypeMapping = rowDataShppContractDetailsCounselMapping
      .map((data) => {
        let matchingAgreement = rowDataAgreementTypeMappingContractDetails.find(
          (agreement) =>
            agreement.AgreementType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.AgreementType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAgreement && data.AgreementType) {
          return { ...data, finalAgreementType: matchingAgreement['Final AgreementType'] };
        }
        return null;
      })
      .filter((item) => item !== null);

    let finalDataKSAContractDetailsAgreementTypeMapping = rowDataKsaContractDetailsAttorneyiesMapping
      .map((data) => {
        let matchingAgreement = rowDataAgreementTypeMappingContractDetails.find(
          (agreement) =>
            agreement.AgreementType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.AgreementDocumentType?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        );
        if (matchingAgreement && data.AgreementDocumentType) {
          return { ...data, finalAgreementType: matchingAgreement['Final AgreementType'] };
        }
        return null;
      })
      .filter((item) => item !== null);

    const allFinalAgreements = [
      ...finalDataSabicContractDetailsAgreementTypeMapping,
      ...finalDataShppContractDetailsAgreementTypeMapping,
      ...finalDataKSAContractDetailsAgreementTypeMapping,
    ];

    let countFinalAgreementResult = {};
    let countOtherAgreementResult = {};

    allFinalAgreements.forEach((item) => {
      let finalAgreementType = item.finalAgreementType;
      let sbu = item.SBU;
      if (finalAgreementType.toLowerCase() === 'others') {
        const agreementType = item.AgreementType;
        if (!countOtherAgreementResult[agreementType]) {
          countOtherAgreementResult[agreementType] = {};
        }

        if (!countOtherAgreementResult[agreementType][sbu]) {
          countOtherAgreementResult[agreementType][sbu] = 0;
        }

        if (!countOtherAgreementResult[agreementType]['Total']) {
          countOtherAgreementResult[agreementType]['Total'] = 0;
        }

        countOtherAgreementResult[agreementType][sbu] += 1;
        countOtherAgreementResult[agreementType]['Total'] += 1;
      } else {
        if (!countFinalAgreementResult[finalAgreementType]) {
          countFinalAgreementResult[finalAgreementType] = {};
        }

        if (!countFinalAgreementResult[finalAgreementType][sbu]) {
          countFinalAgreementResult[finalAgreementType][sbu] = 0;
        }

        if (!countFinalAgreementResult[finalAgreementType]['Total']) {
          countFinalAgreementResult[finalAgreementType]['Total'] = 0;
        }

        countFinalAgreementResult[finalAgreementType][sbu] += 1;
        countFinalAgreementResult[finalAgreementType]['Total'] += 1;
      }
    });

    const finalAgreementResult: any = Object.entries(countFinalAgreementResult).map(([agreementType, sbuData]) => {
      const { Total, ...rest } = sbuData as Record<string, any>; // Extract Total while keeping other properties

      return {
        'Final AgreementType': agreementType,
        ...rest, // Spread other properties first
        Total, // Then add Total at the end
      };
    });

    const finalAgreementTotalBasedOnSbu = { 'Final AgreementType': 'Total' };

    finalAgreementResult.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== 'Final AgreementType' && typeof value === 'number') {
          finalAgreementTotalBasedOnSbu[key] = (finalAgreementTotalBasedOnSbu[key] || 0) + value;
        }
      });
    });

    finalAgreementResult.push(finalAgreementTotalBasedOnSbu);

    //otherAgreement Result

    const otherAgreementResult: any = Object.entries(countOtherAgreementResult).map(([agreementType, sbuData]) => {
      const { Total, ...rest } = sbuData as Record<string, any>; // Extract Total while keeping other properties

      return {
        AgreementType: agreementType,
        ...rest, // Spread other properties first
        Total, // Then add Total at the end
      };
    });

    const otherAgreementTotalBasedOnSbu = { AgreementType: 'Total' };

    otherAgreementResult.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== 'AgreementType' && typeof value === 'number') {
          otherAgreementTotalBasedOnSbu[key] = (otherAgreementTotalBasedOnSbu[key] || 0) + value;
        }
      });
    });

    otherAgreementResult.push(otherAgreementTotalBasedOnSbu);
    return { finalAgreementResult, otherAgreementResult };
  } catch (e) {
    throw e;
  }
}

export async function getIpAnalysis({
  ipAnalystDataSourceVersionId,
  customReportModel,
}: {
  ipAnalystDataSourceVersionId: string;
  customReportModel: CustomReportModelAccessReturnType;
}) {
  try {
    const projectStarted = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
        },
      },
    ]);
    const projectCompleted = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Completed', $options: 'i' },
        },
      },
    ]);
    const projectInProgress = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'In Progress', $options: 'i' },
        },
      },
    ]);

    const projectYetToStart = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Yet to start', $options: 'i' },
        },
      },
    ]);

    const projectOnHold = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'On Hold', $options: 'i' },
        },
      },
    ]);
    const countProjectStarted = projectStarted.length;
    const countProjectCompleted = projectCompleted.length;
    const countProjectInProgress = projectInProgress.length;
    const countProjectYetToStart = projectYetToStart.length;
    const countProjectOnHold = projectOnHold.length;
    const firstBarGraphChartData = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Completed', $options: 'i' },
        },
      },
      {
        $group: {
          _id: '$rowData.SBU',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          SBU: '$_id',
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);

    const formattedFirstBarGraphChartData = firstBarGraphChartData.map(({ SBU, value }) => ({
      SBU: SBU, // Explicitly setting 'sbu' first
      'Count of Serial No': value,
    }));

    const totalFirstBarGraphChartDataValue = firstBarGraphChartData.reduce((sum, { value }) => sum + value, 0);

    // Add "Total" row
    formattedFirstBarGraphChartData.push({
      SBU: 'Total',
      'Count of Serial No': totalFirstBarGraphChartDataValue,
    });

    const secondBarGraphChartData = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Completed', $options: 'i' },
        },
      },
      {
        $group: {
          _id: '$rowData.Workscope',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          Workscope: '$_id',
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);

    const formattedSecondBarGraphChartData = secondBarGraphChartData.map(({ Workscope, value }) => ({
      Workscope: Workscope, // Explicitly setting 'sbu' first
      'Count of Serial No': value,
    }));

    const totalSecondBarGraphChartDataValue = secondBarGraphChartData.reduce((sum, { value }) => sum + value, 0);

    // Add "Total" row
    formattedSecondBarGraphChartData.push({
      Workscope: 'Total',
      'Count of Serial No': totalSecondBarGraphChartDataValue,
    });

    const thirdBarGraphChartData = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Completed', $options: 'i' },
          'rowData.Workscope': { $regex: 'SEARCH & ANALYSIS', $options: 'i' },
        },
      },
      {
        $group: {
          _id: '$rowData.WorkProduct',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          WorkProduct: '$_id',
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);

    const formattedThirdBarGraphChartData = thirdBarGraphChartData.map(({ WorkProduct, value }) => ({
      'Work Product': WorkProduct, // Explicitly setting 'sbu' first
      'Count of Serial No': value,
    }));

    const totalThirdBarGraphChartDataValue = thirdBarGraphChartData.reduce((sum, { value }) => sum + value, 0);

    // Add "Total" row
    formattedThirdBarGraphChartData.push({
      'Work Product': 'Total',
      'Count of Serial No': totalThirdBarGraphChartDataValue,
    });
    const countData = [
      { 'Current Status': 'Completed', 'Count of Serial No': countProjectCompleted },
      { 'Current Status': 'In progress', 'Count of Serial No': countProjectInProgress },
      { 'Current Status': 'On hold', 'Count of Serial No': countProjectOnHold },
      { 'Current Status': 'Yet to start', 'Count of Serial No': countProjectYetToStart },
      {
        'Current Status': 'Project Started',
        'Count of Serial No':
          countProjectCompleted + countProjectInProgress + countProjectOnHold + countProjectYetToStart,
      },
    ];
    return {
      countData,
      firstBarGraphChartData: formattedFirstBarGraphChartData,
      secondBarGraphChartData: formattedSecondBarGraphChartData,
      thirdBarGraphChartData: formattedThirdBarGraphChartData,
    };
  } catch (e) {
    throw e;
  }
}

function categorizeStdProjectsAndRemoveRowDataExtraKey(projects) {
  return projects.map((project) => {
    let row = project.rowData;
    let sbu = (row.SBU || '').toLowerCase().replace(/\s+/g, '');
    let bu = (row.BU || '').toLowerCase().replace(/\s+/g, '');
    let techGroup = (row.TechGroup || '').toLowerCase().replace(/\s+/g, '');
    const tandI = (row.TI || '').toLowerCase().replace(/\s+/g, '');
    let std = 'OTHER';

    if (
      techGroup.includes('crd') ||
      sbu.includes('corporateresearchanddevelopment') ||
      sbu.includes('crd') ||
      tandI.includes('crd') ||
      tandI.includes('corporateresearchanddevelopment')
    ) {
      std = 'CORPORATE';
    } else if (sbu.includes('specialties') || tandI.includes('specialties')) {
      std = 'SPECIALITIES';
    } else if (sbu.includes('agri-nutrients') || tandI.includes('agri-nutrients')) {
      std = 'AGRI-NUTRIENTS';
    } else if (sbu.includes('hadeed') || tandI.includes('hadeed')) {
      std = 'METAL';
    } else if (
      tandI.includes('chemicals') ||
      tandI.includes('petrochemicals') ||
      tandI.includes('functionalchemicals') ||
      sbu.includes('petrochemicals') ||
      bu.includes('chemicals') ||
      bu.includes('functionalchemicals') ||
      bu.includes('ksa')
    ) {
      std = 'PETCHEM-CHEMICALS';
    } else if (
      tandI.includes('polymers') ||
      tandI.includes('functionalforms') ||
      sbu.includes('functionalforms') ||
      sbu.includes('petrochemicals') ||
      (bu && bu !== '' && !['tbd', 'technologyventuring', ''].includes(sbu))
    ) {
      std = 'PETCHEM-POLYMERS';
    }

    return {
      ...row,
      STD: std,
    };
  });
}

export async function getAccoladeMappingSheet({
  portfolioDataSourceVersionId,
  disclosureDataSourceVersionId,
  shppAccoladeDataSourceVersionId,
  sabicAccoladeDataSourceVersionId,
  customReportModel,
  currentYear,
  isRowData,
}: {
  portfolioDataSourceVersionId: string;
  disclosureDataSourceVersionId: string;
  shppAccoladeDataSourceVersionId: string;
  sabicAccoladeDataSourceVersionId: string;
  currentYear: string;
  customReportModel: CustomReportModelAccessReturnType;
  isRowData?: boolean;
}) {
  try {
    const yearDateRange = {
      $gte: `${currentYear}-01-01T00:00:00.000Z`,
      $lte: `${currentYear}-12-31T00:00:00.000Z`,
    };

    const activeApplicationRawData = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.In Force': 1,
          'rowData.AccoladeID': {
            $ne: null,
            $not: { $regex: 'TSR', $options: 'i' },
          },
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const newFilingThisYearRawData = await customReportModel.DataSourceVersionValuePortfolio.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(portfolioDataSourceVersionId),
          'rowData.IsFirstFiling': 1,
          'rowData.Filing Date': yearDateRange,
          'rowData.AccoladeID': {
            $ne: null,
            $not: { $regex: 'TSR', $options: 'i' },
          },
        },
      },
      {
        $group: {
          _id: '$rowData.Case_Reference1',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const openDisclosureRawData = await customReportModel.DataSourceVersionValueDisclosure.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(disclosureDataSourceVersionId),
          'rowData.DisclosureStatus': {
            $in: [
              'Open',
              'Rated to Search',
              'Rated To Search',
              'Rated to Hold',
              'Rated To Hold',
              'Rated to Draft OC',
              'Rated To Draft OC',
              'Rated to Draft IH',
              'Rated To Draft IH',
              'Filing Requested',
              'RATED TO DRAFT IN HOUSE',
              'Submitted',
              'Review Rate to Draft',
              'Review Rated to Draft',
            ],
          },
          'rowData.Accolade': {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.DisclosureNumber',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const draftDisclosureRawData = await customReportModel.DataSourceVersionValueDisclosure.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(disclosureDataSourceVersionId),
          'rowData.DisclosureStatus': {
            $in: [
              'Rated to Draft OC',
              'Rated To Draft OC',
              'Rated to Draft IH',
              'Rated To Draft IH',
              'RATED TO DRAFT IN HOUSE',
            ],
          },
          'rowData.Accolade': {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.DisclosureNumber',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const shppAccoladeRawData = await customReportModel.DataSourceVersionValueShppAccolade.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(shppAccoladeDataSourceVersionId),
          'rowData.ProjectID': {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.ProjectID',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const sabicAccoladeRawData = await customReportModel.DataSourceVersionValueSabicAccolade.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(sabicAccoladeDataSourceVersionId),
          'rowData.ProjectID': {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: '$rowData.ProjectID',
          rowData: { $first: '$rowData' },
        },
      },
      {
        $project: {
          rowData: 1,
        },
      },
    ]);

    const shppAccoladeStdData = categorizeStdProjectsAndRemoveRowDataExtraKey(shppAccoladeRawData);
    const sabicAccoladeStdData = categorizeStdProjectsAndRemoveRowDataExtraKey(sabicAccoladeRawData);
    const combinedAccoladeStdData = [...shppAccoladeStdData, ...sabicAccoladeStdData];
    const allStdData: any[] = [];

    const activeApplicationAccoladeStdData = activeApplicationRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      if (matchingStd) {
        allStdData.push(matchingStd);
      }
      return { accoladeStdData: matchingStd ? matchingStd : '', activeApplicationData: row.rowData };
    });

    const newFilingThisYearAccoladeStdData = newFilingThisYearRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      if (matchingStd) {
        allStdData.push(matchingStd);
      }
      return { accoladeStdData: matchingStd ? matchingStd : '', newFilingThisYearData: row.rowData };
    });

    const openDisclosureAccoladeStdData = openDisclosureRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      if (matchingStd) {
        allStdData.push(matchingStd);
      }
      return { accoladeStdData: matchingStd ? matchingStd : '', openDisclosureData: row.rowData };
    });

    const draftDisclosureAccoladeStdData = draftDisclosureRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      if (matchingStd) {
        allStdData.push(matchingStd);
      }
      return { accoladeStdData: matchingStd ? matchingStd : '', draftDisclosureData: row.rowData };
    });

    return {
      activeApplicationAccoladeStdData,
      newFilingThisYearAccoladeStdData,
      openDisclosureAccoladeStdData,
      draftDisclosureAccoladeStdData,
      allStdData,
    };
  } catch (e) {
    console.log('Error in getAccoladeMappingSheet', e);
    throw e;
  }
}

export function getActivePatentValueCoverage({
  allAccoladeMappingSheetData,
}: {
  allAccoladeMappingSheetData: Record<string, any>[];
}) {
  try {
    const filteredProjects = allAccoladeMappingSheetData.filter((project) => {
      return (
        project.ProjectClosed?.toLowerCase() === 'open' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'hold' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'stop' &&
        /stage [1-5]/i.test(project.ProjectCurrentStageName) &&
        project.StrategicReportingClass?.toLowerCase() !== 'asset support' &&
        !project.ProjectType?.toLowerCase().includes('tsr')
      );
    });

    const allRANPVGroup: Record<string, number> = {};
    const activePatentFillingRANPVGroup: Record<string, number> = {};
    const noOfActiveDisclosuresRANPVGroup: Record<string, number> = {};
    const noDisclosuresForFilingRANPVGroup: Record<string, number> = {};
    const noOfRTDDisclosuresRANPVGroup: Record<string, number> = {};

    filteredProjects.forEach((project) => {
      const { STD, RiskAdjustedNPV, noOfActiveApplications, noOfActiveDisclosures, noOfRTDDisclosures } = project;

      if (!allRANPVGroup[STD]) {
        allRANPVGroup[STD] = 0;
      }
      if (!allRANPVGroup['Total']) {
        allRANPVGroup['Total'] = 0;
      }

      if (noOfActiveApplications) {
        if (!activePatentFillingRANPVGroup[STD]) {
          activePatentFillingRANPVGroup[STD] = 0;
        }
        if (!activePatentFillingRANPVGroup['Total']) {
          activePatentFillingRANPVGroup['Total'] = 0;
        }
        activePatentFillingRANPVGroup[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        activePatentFillingRANPVGroup['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      }

      if (noOfActiveDisclosures) {
        if (!noOfActiveDisclosuresRANPVGroup[STD]) {
          noOfActiveDisclosuresRANPVGroup[STD] = 0;
        }
        if (!noOfActiveDisclosuresRANPVGroup['Total']) {
          noOfActiveDisclosuresRANPVGroup['Total'] = 0;
        }
        noOfActiveDisclosuresRANPVGroup[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        noOfActiveDisclosuresRANPVGroup['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      } else {
        if (!noDisclosuresForFilingRANPVGroup[STD]) {
          noDisclosuresForFilingRANPVGroup[STD] = 0;
        }
        if (!noDisclosuresForFilingRANPVGroup['Total']) {
          noDisclosuresForFilingRANPVGroup['Total'] = 0;
        }
        noDisclosuresForFilingRANPVGroup[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        noDisclosuresForFilingRANPVGroup['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      }

      if (noOfRTDDisclosures) {
        if (!noOfRTDDisclosuresRANPVGroup[STD]) {
          noOfRTDDisclosuresRANPVGroup[STD] = 0;
        }
        if (!noOfRTDDisclosuresRANPVGroup['Total']) {
          noOfRTDDisclosuresRANPVGroup['Total'] = 0;
        }
        noOfRTDDisclosuresRANPVGroup[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        noOfRTDDisclosuresRANPVGroup['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      }

      allRANPVGroup[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      allRANPVGroup['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
    });

    let patentValueCoverageActive = Object.entries(allRANPVGroup).map(([STD, sum]: [string, number]) => ({
      SBU: STD,
      'RANPV OF PHASE 1-5 PROJECTS ($M)': sum,
      'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M)': activePatentFillingRANPVGroup[STD],
      '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': activePatentFillingRANPVGroup[STD] / sum,
      'No Disclosure for filing': noDisclosuresForFilingRANPVGroup[STD],
      '% OF RANPVE COVERED-No Disclosure for filing': noDisclosuresForFilingRANPVGroup[STD] / sum,
      'Disclosure for Filing': noOfActiveDisclosuresRANPVGroup[STD],
      '% OF RANPVE COVERED-Disclosure available for filing': noOfActiveDisclosuresRANPVGroup[STD] / sum,
      'Patent application filing in progress(Rated to Draft)': noOfRTDDisclosuresRANPVGroup[STD],
      '% COVERED-Patent application filing in progress': noOfRTDDisclosuresRANPVGroup[STD] / sum,
    }));

    patentValueCoverageActive = [
      ...patentValueCoverageActive.filter((item) => item.SBU !== 'Total'), // Keep all except "Total"
      ...patentValueCoverageActive.filter((item) => item.SBU === 'Total'), // Add "Total" at the end
    ];
    return patentValueCoverageActive;
  } catch (e) {
    console.log('Error in getActivePatentValueCoverage function.', e);
    throw e;
  }
}

export function getNewPatentValueCoverage({
  allAccoladeMappingSheetData,
  newFilingThisYearAccoladeStdData,
}: {
  allAccoladeMappingSheetData: Record<string, any>[];
  newFilingThisYearAccoladeStdData?: Record<string, Record<string, any>[]>;
}) {
  try {
    const filteredProjects = allAccoladeMappingSheetData.filter((project) => {
      return (
        project.ProjectClosed?.toLowerCase() === 'open' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'hold' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'stop' &&
        /stage [3-5]/i.test(project.ProjectCurrentStageName) &&
        project.StrategicReportingClass?.toLowerCase() !== 'asset support' &&
        !project.ProjectType?.toLowerCase().includes('tsr')
      );
    });
    const noOfTotalFirstFilling: Record<string, number> = {};
    const noOfAccoladeProjectsCovered: Record<string, number> = {};
    const newFillingRANPV: Record<string, number> = {};
    const totalRANPV: Record<string, number> = {};
    filteredProjects.forEach((project) => {
      const { STD, RiskAdjustedNPV, noOfNewApplications } = project;
      if (!noOfTotalFirstFilling[STD]) {
        noOfTotalFirstFilling[STD] = 0;
      }
      if (!noOfTotalFirstFilling['Total']) {
        noOfTotalFirstFilling['Total'] = 0;
      }
      if (noOfNewApplications && noOfNewApplications > 0) {
        noOfTotalFirstFilling[STD] += noOfNewApplications;
        noOfTotalFirstFilling['Total'] += noOfNewApplications;
      }

      if (!noOfAccoladeProjectsCovered[STD]) {
        noOfAccoladeProjectsCovered[STD] = 0;
      }
      if (!noOfAccoladeProjectsCovered['Total']) {
        noOfAccoladeProjectsCovered['Total'] = 0;
      }
      if (noOfNewApplications && noOfNewApplications > 0) {
        noOfAccoladeProjectsCovered[STD] += 1;
        noOfAccoladeProjectsCovered['Total'] += 1;
      }

      if (!newFillingRANPV[STD]) {
        newFillingRANPV[STD] = 0;
      }
      if (!newFillingRANPV['Total']) {
        newFillingRANPV['Total'] = 0;
      }
      if (noOfNewApplications && noOfNewApplications > 0) {
        newFillingRANPV[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        newFillingRANPV['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      }

      if (!totalRANPV[STD]) {
        totalRANPV[STD] = 0;
      }
      if (!totalRANPV['Total']) {
        totalRANPV['Total'] = 0;
      }

      totalRANPV[STD] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      totalRANPV['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
    });

    let patentValueCoverageNew = Object.entries(totalRANPV).map(([STD, sum]: [string, number]) => ({
      SBU: STD,
      'TOTAL FIRST FILINGS': noOfTotalFirstFilling[STD],
      'FILINGS HAVING AT LEAST ONE ACCOLADE NUMBER /TSR': '',
      'FILINGS HAVING NO ACCOLADE NUMBER /TSR': '',
      'NO. OF ACCOLADE PROJECTS COVERED': noOfAccoladeProjectsCovered[STD],
      'RANPV OF PHASE 3-5 PROJECTS ($M)': sum,
      'RANPV OF PHASE 3-5 PROJECTS COVERED BY NEW PATENT FILINGS ($M)': newFillingRANPV[STD],
      '% OF TOTAL RANPV COVERED BY NEW PATENT FILINGS': newFillingRANPV[STD] / sum,
    }));

    patentValueCoverageNew = [
      ...patentValueCoverageNew.filter((item) => item.SBU !== 'Total'), // Keep all except "Total"
      ...patentValueCoverageNew.filter((item) => item.SBU === 'Total'), // Add "Total" at the end
    ];

    return patentValueCoverageNew;
  } catch (e) {
    console.log('Error in getNewPatentValueCoverage function.', e);
    throw e;
  }
}

export function getStrategicReportingClass({
  allAccoladeMappingSheetData,
}: {
  allAccoladeMappingSheetData: Record<string, any>[];
}) {
  try {
    const filteredProjects = allAccoladeMappingSheetData.filter((project) => {
      return (
        project.ProjectClosed?.toLowerCase() === 'open' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'hold' &&
        project.ProjectLastGateDecision?.toLowerCase() !== 'stop' &&
        /stage [1-5]/i.test(project.ProjectCurrentStageName) &&
        project.StrategicReportingClass &&
        project.StrategicReportingClass?.toLowerCase() !== '[empty]' &&
        project.StrategicReportingClass?.toLowerCase() !== 'empty' &&
        project.StrategicReportingClass?.toLowerCase() !== 'no'
      );
    });

    const totalRANPV: Record<string, number> = {};
    const activeFillingRANPV: Record<string, number> = {};
    const countAccoladeNumber: Record<string, number> = {};

    filteredProjects.forEach((project) => {
      const { StrategicReportingClass, RiskAdjustedNPV, noOfActiveApplications } = project;
      if (!totalRANPV[StrategicReportingClass]) {
        totalRANPV[StrategicReportingClass] = 0;
      }
      if (!totalRANPV['Total']) {
        totalRANPV['Total'] = 0;
      }

      if (noOfActiveApplications) {
        if (!activeFillingRANPV[StrategicReportingClass]) {
          activeFillingRANPV[StrategicReportingClass] = 0;
        }
        if (!activeFillingRANPV['Total']) {
          activeFillingRANPV['Total'] = 0;
        }
        activeFillingRANPV[StrategicReportingClass] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
        activeFillingRANPV['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      }

      if (!countAccoladeNumber[StrategicReportingClass]) {
        countAccoladeNumber[StrategicReportingClass] = 0;
      }
      if (!countAccoladeNumber['Total']) {
        countAccoladeNumber['Total'] = 0;
      }

      countAccoladeNumber[StrategicReportingClass] += 1;
      countAccoladeNumber['Total'] += 1;

      totalRANPV[StrategicReportingClass] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
      totalRANPV['Total'] += RiskAdjustedNPV ? RiskAdjustedNPV : 0;
    });

    let strategicReportingClass = Object.entries(totalRANPV).map(
      ([StrategicReportingClass, sum]: [string, number]) => ({
        'Strategic Reporting Class': StrategicReportingClass,
        'RANPV OF PHASE 1-5 PROJECTS ($M) ': sum,
        'RANPV OF PHASE 1-5 PROJECTS COVERED BY ACTIVE PATENT FILINGS ($M) ':
          activeFillingRANPV[StrategicReportingClass],
        '% OF TOTAL RANPV COVERED BY ACTIVE PATENT FILINGS': activeFillingRANPV[StrategicReportingClass] / sum,
        '# OF ACCOLADE PROJECTS': countAccoladeNumber[StrategicReportingClass],
      })
    );

    strategicReportingClass = [
      ...strategicReportingClass.filter((item) => item['Strategic Reporting Class'] !== 'Total'), // Keep all except "Total"
      ...strategicReportingClass.filter((item) => item['Strategic Reporting Class'] === 'Total'), // Add "Total" at the end
    ];
  } catch (e) {
    console.log('Error in  getStrategicReportingClass', e);
    throw e;
  }
}
