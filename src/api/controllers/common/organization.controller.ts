/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../../../database/services/common/organization.service';
import * as widgetThemeService from '../../../database/services/common/widgetTheme.service';
import * as organizationProductSubscription from '../../../database/services/common/organizationProductSubscription.services';
import { populate } from 'dotenv';
import { stat } from 'fs';
import { Types } from 'mongoose';
import { seedRolesAndPermissions } from '../../../seeders/seedRoleAndPermission';
import { hashPassword } from '../../../utils/bcrypt.utils';
import { createUser, findUserByEmail } from '../../../database/services/common/user.service';
import { getUserRole } from '../../../database/services/common/userRole.service';

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      domain,
      code,
      productSubscriptions,
      email,
      password,
      firstName,
      lastName,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      gst,
      pan,
    } = req.body;

    const { userId } = req.user;

    // Handle logo upload
    let logoPath = '';
    const files = req.files as Express.Multer.File[];
    if (files?.length) {
      // Assuming first uploaded file is the logo
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path.replace(/\\/g, '/')}`;
    }

    // 1️⃣ Create the organization
    const organization: Record<string, any> = await organizationService.createOrganization({
      name,
      description,
      owner: userId,
      domain,
      code,
      logo: logoPath,
    });

    // 2️⃣ Add default fields (ignore existing)
    const defaultOrgFields: Record<string, any> = {
      name,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      phone: phone || '',
      logo: logoPath,
      address1: address1 || '',
      address2: address2 || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
      country: country || '',
      gst: gst || '',
      pan: pan || '',
    };
    await organizationService.updateOrganization(organization._id, defaultOrgFields);

    // 3️⃣ Seed roles and permissions
    await seedRolesAndPermissions({ organizationId: [organization._id] });

    // 4️⃣ Product subscriptions
    let createdProductSubs: any[] = [];
    if (Array.isArray(productSubscriptions) && productSubscriptions.length > 0) {
      const productDetails = productSubscriptions.map((sub: any) => ({
        organizationId: organization._id,
        productId: sub.productId,
        totalLicenses: sub.totalLicenses,
        licenseExpiresAt: sub.licenseExpiresAt,
      }));
      createdProductSubs = await organizationProductSubscription.createManyOrganizationProductSubscription(productDetails);
    }

    // 5️⃣ Apply default widget theme
    let widgetTheme: any = await widgetThemeService.findWidgetTheme({ isDefault: true });
    widgetTheme = widgetTheme?.toJSON();
    if (widgetTheme) {
      await widgetThemeService.createWidgetTheme({
        ...widgetTheme,
        _id: undefined,
        organizationId: organization._id,
      });
    }

    // 6️⃣ Create SuperAdmin user
    if (email && password) {
      const existingUser = await findUserByEmail(email.toLowerCase());
      if (!existingUser) {
        const hashedPassword = await hashPassword(password);

        // Get SuperAdmin role using userRoleService
        const superAdminRole = await getUserRole({
          organizationId: organization._id,
          name: 'Super Admin',
        });

        if (!superAdminRole) {
          throw new Error('Super Admin role not found for this organization.');
        }

        await createUser({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName || 'Super',
          lastName: lastName || 'Admin',
          roleIds: [superAdminRole._id],
          organizationId: organization._id,
          status: 'active',
          isVerified: true,
          mobile: phone || '',
          address: address1 || '',
          country: country || '',
          state: state || '',
          city: city || '',
          postalCode: zip || '',
          logo: logoPath,
          gst: gst || '',
          pan: pan || '',
          organizationProductSubscriptionIds: createdProductSubs.map((sub) => sub._id),
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Organization created successfully with product subscriptions and SuperAdmin user',
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
    const {
      name,
      description,
      domain,
      productSubscriptions,
      owner,
      status,
      firstName,
      lastName,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      gst,
      pan,
    } = req.body;

    let { organizationId } = req.user as any;
    const { organizationId: paramOrgId } = req.params;
    const { isSuperUser } = req.user as any;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    // Handle logo upload
    let logoPath = '';
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path}`;
    }

    // 1️⃣ Update organization (email is excluded)
    const updatePayload: any = {
      ...(name && { name }),
      ...(description && { description }),
      ...(domain && { domain }),
      ...(owner && { owner }),
      ...(status && { status }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(address1 && { address1 }),
      ...(address2 && { address2 }),
      ...(city && { city }),
      ...(state && { state }),
      ...(zip && { zip }),
      ...(country && { country }),
      ...(gst && { gst }),
      ...(pan && { pan }),
      ...(logoPath && { logo: logoPath }),
      // email intentionally excluded
    };

    await organizationService.updateOrganization(organizationId, updatePayload);

    // 2️⃣ Handle product subscriptions if superuser
    if (Array.isArray(productSubscriptions) && isSuperUser) {
      const { data: existingSubs }: any = await organizationProductSubscription.getOrganizationProductsSubscription({
        query: { organizationId },
        limit: 0,
      });

      const incomingIds = productSubscriptions
        .filter((sub) => sub.organizationProductSubscriptionId)
        .map((sub) => sub.organizationProductSubscriptionId.toString());

      // Delete removed subscriptions
      const toDelete = existingSubs.filter((s) => !incomingIds.includes(s._id.toString()));
      if (toDelete.length > 0) {
        await organizationProductSubscription.deleteOrganizationProductSubscriptions(toDelete.map((s) => s._id));
      }

      // Update or create subscriptions
      for (const sub of productSubscriptions) {
        if (sub.organizationProductSubscriptionId) {
          await organizationProductSubscription.updateOrganizationProductSubscription(
            sub.organizationProductSubscriptionId,
            { ...sub, organizationId }
          );
        } else {
          await organizationProductSubscription.createOrganizationProductSubscription({ ...sub, organizationId });
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
    const limit = parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

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
