/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../../../database/services/common/organization.service';
import * as widgetThemeService from '../../../database/services/reportivix/widgetTheme.service';
import * as organizationProductSubscription from '../../../database/services/common/organizationProductSubscription.services';
import { populate } from 'dotenv';
import { stat } from 'fs';

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, domain, code, productSubscriptions, owner } = req.body;

    // 1. Create the organization
    const organization = await organizationService.createOrganization({
      name,
      description,
      owner,
      domain,
      code,
    });

    if ((productSubscriptions && Array.isArray(productSubscriptions)) || productSubscriptions.length > 0) {
      const productDetails: any = [];
      for (const subscription of productSubscriptions) {
        const { productId, totalLicenses, licenseExpiresAt } = subscription;

        productDetails.push({
          organizationId: organization._id,
          productId,
          totalLicenses,
          licenseExpiresAt,
        });
      }
      await organizationProductSubscription.createManyOrganizationProductSubscription(productDetails);
    }

    // 3. Apply default widget theme
    let widgetTheme: any = await widgetThemeService.findWidgetTheme({ isDefault: true });
    widgetTheme = widgetTheme?.toJSON();

    await widgetThemeService.createWidgetTheme({
      ...widgetTheme,
      _id: undefined,
      organizationId: organization._id,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully with product subscriptions',
      data: organization,
    });
  } catch (err) {
    next(err);
  }
};
export const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId: paramOrgId } = req.params;
    let { organizationId, isSuperUser } = req.user;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    const data = await organizationService.findOrganizationById(organizationId, [
      { path: 'owner', select: 'firstName lastName' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Organization fetched successfully',
      data: data,
    });
  } catch (err) {
    next(err);
  }
};
export const updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, domain, productSubscriptions, owner, status } = req.body;
    const organizationId = req.params.organizationId;

    // 1. Update organization
    await organizationService.updateOrganization(organizationId, {
      ...(name && { name }),
      ...(description && { description }),
      ...(domain && { domain }),
      ...(owner && { owner }),
      ...(status && { status }),
    });

    // 2. Delete previous product subscriptions
    await organizationProductSubscription.deleteManyOrganizationProductSubscription(organizationId);

    // 3. Insert new product subscriptions (if provided)
    if (Array.isArray(productSubscriptions) && productSubscriptions.length > 0) {
      const subscriptionsToInsert = productSubscriptions.map((sub) => ({
        ...sub,
        organizationId,
      }));
      await organizationProductSubscription.createManyOrganizationProductSubscription(subscriptionsToInsert);
    }

    res.status(200).json({
      success: true,
      message: 'Organization and product subscriptions updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const organization = await organizationService.getOrganizationById(organizationId);

    if (organization?.isMaster) {
      return res.status(400).json({ success: false, message: 'Master organization cannot be deleted' });
    }

    await organizationService.deleteOrganization(req.params.organizationId);
    res.status(200).json({ success: true, message: 'Organization deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getOrganizationList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    const result = await organizationService.getOrganizationList({
      query,
      page,
      limit,
      populate: [{ path: 'owner', select: 'firstName lastName' }],
    });

    res.status(200).json({
      success: true,
      message: 'Organizations fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};
