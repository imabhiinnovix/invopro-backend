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
          'rowData.AgreementExecuted': { $in: ['Yes', 'yes', 'PROC', 'proc', 'Proc'] },
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

    allFinalAgreements.forEach((item) => {
      let agreementType = item.finalAgreementType;
      let sbu = item.SBU;

      if (!countFinalAgreementResult[agreementType]) {
        countFinalAgreementResult[agreementType] = {};
      }

      if (!countFinalAgreementResult[agreementType][sbu]) {
        countFinalAgreementResult[agreementType][sbu] = 0;
      }

      if (!countFinalAgreementResult[agreementType]['Total']) {
        countFinalAgreementResult[agreementType]['Total'] = 0;
      }

      countFinalAgreementResult[agreementType][sbu] += 1;
      countFinalAgreementResult[agreementType]['Total'] += 1;
    });

    const finalAgreementResult: any = Object.entries(countFinalAgreementResult).map(([agreementType, sbuData]) => {
      const { Total, ...rest } = sbuData as Record<string, any>; // Extract Total while keeping other properties

      return {
        AgreementType: agreementType,
        ...rest, // Spread other properties first
        Total, // Then add Total at the end
      };
    });

    const totalBasedOnSbu = { AgreementType: 'Total' };

    finalAgreementResult.forEach((entry) => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== 'AgreementType' && typeof value === 'number') {
          totalBasedOnSbu[key] = (totalBasedOnSbu[key] || 0) + value;
        }
      });
    });

    finalAgreementResult.push(totalBasedOnSbu);
    return finalAgreementResult;
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

    const projectYetToStartOrOnHold = await customReportModel.DataSourceVersionValueIpAnalystDashboard.aggregate([
      {
        $match: {
          dataSourceVersionId: new ObjectId(ipAnalystDataSourceVersionId),
          'rowData.CurrentStatus': { $regex: 'Yet to start|On Hold', $options: 'i' },
        },
      },
    ]);
    const countProjectStarted = projectStarted.length;
    const countProjectCompleted = projectCompleted.length;
    const countProjectInProgress = projectInProgress.length;
    const countProjectYetToStartOrOnHold = projectYetToStartOrOnHold.length;
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
      value: value,
    }));

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
      value: value,
    }));

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
      WorkProduct: WorkProduct, // Explicitly setting 'sbu' first
      value: value,
    }));
    const countData = [
      { 'Projects Status': 'Started', Count: countProjectStarted },
      { 'Projects Status': 'Yet to start/ On Hold', Count: countProjectYetToStartOrOnHold },
      { 'Projects Status': 'In-Progress', Count: projectInProgress.length },
      { 'Projects Status': 'Completed', Count: countProjectCompleted },
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

    const activeApplicationAccoladeStdData = activeApplicationRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      return { accoladeStdData: matchingStd ? matchingStd : '', activeApplicationData: row.rowData };
    });

    const newFilingThisYearAccoladeStdData = newFilingThisYearRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      return { accoladeStdData: matchingStd ? matchingStd : '', newFilingThisYearData: row.rowData };
    });

    const openDisclosureAccoladeStdData = openDisclosureRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      return { accoladeStdData: matchingStd ? matchingStd : '', openDisclosureData: row.rowData };
    });

    const draftDisclosureAccoladeStdData = draftDisclosureRawData.map((row) => {
      const matchingStd = combinedAccoladeStdData.find((std) => std.ProjectID === row.rowData.AccoladeID);
      return { accoladeStdData: matchingStd ? matchingStd : '', draftDisclosureData: row.rowData };
    });

    return {
      activeApplicationAccoladeStdData,
      newFilingThisYearAccoladeStdData,
      openDisclosureAccoladeStdData,
      draftDisclosureAccoladeStdData,
    };
  } catch (e) {
    console.log('Error in getAccoladeMappingSheet', e);
    throw e;
  }
}
