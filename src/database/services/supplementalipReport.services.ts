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
            attorney.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
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
            attorney.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
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
            attorney.Counsel?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
            data.Attorneyies?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
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
          SBU: '$_id',
          _id: 0,
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);
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
          Workscope: '$_id',
          _id: 0,
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);

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
          WorkProduct: '$_id',
          _id: 0,
          value: 1,
        },
      },
      {
        $sort: { value: -1 }, // Sorting in descending order
      },
    ]);
    const countData = [
      { 'Projects Started': countProjectStarted },
      { Completed: countProjectCompleted },
      { 'In-Progress': projectInProgress.length },
      { 'Yet to start/ On Hold': countProjectYetToStartOrOnHold },
    ];
    return {
      countData,
      firstBarGraphChartData,
      secondBarGraphChartData,
      thirdBarGraphChartData,
    };
  } catch (e) {
    throw e;
  }
}
