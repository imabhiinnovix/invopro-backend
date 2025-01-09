import { Request, Response, NextFunction } from 'express';
import { getCurrentYearNewApplicationFiled } from '../../database/services/monthlyipReport.services';

export const generateMonthlyIpReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { disclosureDataSourceVersionId, portfolioDataSourceVersionId } = req.body;
    const { organizationId, userId } = req.user;

    const newYearApplicationFiled = await getCurrentYearNewApplicationFiled(portfolioDataSourceVersionId, '2024');

    // const petChemTotal =
    //   newYearApplicationFiled//   return res.status(400).json({ success: false, message: 'Data Source Option Code Already Exists' }); // if (dataSourceData) { // const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    //   // }
    // const dataSource = await dataSourceService.createDataSourcce({
    //   entityId,
    //   name,
    //   code,
    //   versionType, //enum monthly
    //   organizationId,
    //   createdBy: userId,
    //   isActive: true,
    // });

    res.status(201).json({
      success: true,
      message: 'Report Generated Successfully',
      data: newYearApplicationFiled,
    });
  } catch (err) {
    next(err);
  }
};
