import { Request, Response, NextFunction } from 'express';
import {
  getCurrentYearNewApplicationFiled,
  getDisclosureCount,
  percentageOfCurrentYearInventionDisclosureConvertedToFilings,
} from '../../database/services/monthlyipReport.services';

export const generateMonthlyIpReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { disclosureDataSourceVersionId, portfolioDataSourceVersionId } = req.body;
    const { organizationId, userId } = req.user;

    const currentYear = '2024';
    const newYearApplicationFiledData = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
    });

    const percentageOfCurrentYearInventionDisclosureConvertedToFilingsData =
      await percentageOfCurrentYearInventionDisclosureConvertedToFilings(
        portfolioDataSourceVersionId,
        disclosureDataSourceVersionId,
        currentYear
      );

    //TODO:here currern year filter need to discuss
    const draftedApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: true,
    });

    const openApplicationDisclosureCount = await getDisclosureCount({
      disclosureDataSourceVersionId,
      currentYear,
      isActive: false,
      isDrafted: false,
    });

    const currentYearUsIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearUSIssued: true,
    });

    const currentYearINTIssued = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCurrentYearINTIssued: true,
    });

    const usPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSPendingApplication: true,
    });

    const epPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPPendingApplication: true,
    });

    const cnPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNPendingApplication: true,
    });

    const otherPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherPendingApplication: true,
    });

    const totalPendingApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalPendingApplication: true,
    });

    const usIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isUSIssuedApplication: true,
    });

    const epIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isEPIssuedApplication: true,
    });

    const cnIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isCNIssuedApplication: true,
    });

    const otherIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isOtherIssuedApplication: true,
    });

    const totalIssuedApplication = await getCurrentYearNewApplicationFiled({
      portfolioDataSourceVersionId,
      currentYear,
      isPercentagePart: false,
      isTotalIssuedApplication: true,
    });

    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data: {
        newYearApplicationFiledData,
        percentageOfCurrentYearInventionDisclosureConvertedToFilingsData,
        draftedApplicationDisclosureCount,
        openApplicationDisclosureCount,
        currentYearUsIssued,
        currentYearINTIssued,
        usPendingApplication,
        epPendingApplication,
        cnPendingApplication,
        otherPendingApplication,
        totalPendingApplication,
        usIssuedApplication,
        epIssuedApplication,
        cnIssuedApplication,
        otherIssuedApplication,
        totalIssuedApplication,
      },
    });
  } catch (err) {
    next(err);
  }
};
