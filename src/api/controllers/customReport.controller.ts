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
    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data: usPendingApplication,
    });
  } catch (err) {
    next(err);
  }
};
