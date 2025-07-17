/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as organizationService from '../../../database/services/common/organization.service';
import * as widgetThemeService from '../../../database/services/reportivix/widgetTheme.service';

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, domain, code } = req.body;
    const { userId } = req.user;

    const organization = await organizationService.createOrganization({
      name,
      description,
      owner: userId,
      domain,
      code,
    });

    // create org by default theme
    let widgetTheme: any = await widgetThemeService.findWidgetTheme({
      isDefault: true,
    });

    widgetTheme = await widgetTheme?.toJSON();

    await widgetThemeService.createWidgetTheme({
      ...widgetTheme,
      _id: undefined,
      organizationId: organization?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization,
    });
  } catch (err) {
    next(err);
  }
};

export const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;

    const data = await organizationService.getOrganizationById(organizationId);

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
    const { name, description, domain } = req.body;

    await organizationService.updateOrganization(req.params.organizationId, {
      ...(name && { name }),
      ...(description && { description }),
      ...(domain && { domain }),
    });
    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrganizationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const { status } = req.body;

    const organization = await organizationService.getOrganizationById(organizationId);

    if (status === 'active') {
      organization.status = 'active';
    } else if (status === 'inactive') {
      organization.status = 'inactive';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value provided.',
      });
    }

    await organization.save();

    return res.status(200).json({ success: true, message: 'Organization status updated successfully' });
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
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await organizationService.getOrganizationList({
        query,
        page,
        limit,
      });
    } else {
      result = await organizationService.getOrganizationList({
        query,
      });
    }

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
