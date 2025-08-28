/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../../../database/services/common/organization.service';
import * as widgetThemeService from '../../../database/services/common/widgetTheme.service';
import * as organizationProductSubscription from '../../../database/services/common/organizationProductSubscription.services';
import { populate } from 'dotenv';
import { stat } from 'fs';
import { Types } from 'mongoose';

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, domain, code, productSubscriptions } = req.body;
    const { userId } = req.user;

    // 1. Create the organization
    const organization = await organizationService.createOrganization({
      name,
      description,
      owner: userId,
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

    if (Array.isArray(productSubscriptions)) {
      // 1. Fetch existing subscriptions
      const { data: existingSubs }: any = await organizationProductSubscription.getOrganizationProductsSubscription({
        query: { organizationId },
        limit: 0, // fetch all
      });

      const incomingIds = productSubscriptions
        .filter((sub) => sub.organizationProductSubscriptionId)
        .map((sub) => sub.organizationProductSubscriptionId.toString());

      // 2. Delete subscriptions that are in DB but not in incoming
      const toDelete = existingSubs.filter((s) => !incomingIds.includes(s._id.toString()));
      if (toDelete.length > 0) {
        await organizationProductSubscription.deleteOrganizationProductSubscriptions(toDelete.map((s) => s._id));
      }

      // 3. Update or create
      for (const sub of productSubscriptions) {
        if (sub.organizationProductSubscriptionId) {
          await organizationProductSubscription.updateOrganizationProductSubscription(
            sub.organizationProductSubscriptionId,
            {
              ...sub,
              organizationId,
            }
          );
        } else {
          await organizationProductSubscription.createOrganizationProductSubscription({
            ...sub,
            organizationId,
          });
        }
      }
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

    let { organizationId, isSuperUser } = req.user;

    const query: any = {};
    if (!isSuperUser) {
      query['_id'] = new Types.ObjectId(organizationId);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

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
