import { populate } from 'dotenv';
import * as organizationProductSubscription from '../../../database/services/common/organizationProductSubscription.services';
import { Request, Response, NextFunction } from 'express';

export const getOrganizationProductSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, organizationId: paramOrgId } = req.query;
    let { userId, organizationId, isSuperUser } = req.user;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = { organizationId };
    if (search) query.name = { $regex: search, $options: 'i' };

    const result = await organizationProductSubscription.getOrganizationProductsSubscription({
      query,
      page,
      limit,
      populate: ['productId'],
    });

    res.status(200).json({
      success: true,
      message: 'Organizations product subscription detail fetched successfully.',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};
