import { Request, Response, NextFunction } from 'express';
import * as attributeOptionService from '../../database/services/attributeOption.services';

export const createAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attributeName, attributeValue } = req.body;
    const { organizationId, userId } = req.user;

    const attributeData = await attributeOptionService.findAttributeByNameAndOrganization(
      attributeName,
      organizationId
    );
    if (attributeData) {
      return res.status(400).json({ success: false, message: 'Attribute Option Name Already Exists' });
    }
    const attribute = await attributeOptionService.createAttribute({
      attributeName,
      attributeValue,
      organizationId,
      createdBy: userId,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: 'Attribute created successfully',
      data: attribute,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attributeName, attributeValue } = req.body;
    const { userId, organizationId } = req.user;

    const attributeData = await attributeOptionService.findAttributeByNameAndOrganization(
      attributeName,
      organizationId
    );
    if (attributeData && attributeData._id != req.params.attributeId) {
      return res.status(400).json({ success: false, message: 'Attribute Option Name Already Exists' });
    }

    await attributeOptionService.updateAttribute(req.params.attributeId, {
      attributeName,
      attributeValue,
      updatedBy: userId,
    });
    res.status(201).json({
      success: true,
      message: 'Attribute Option Updated Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const listAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.attributeName = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await attributeOptionService.getAttributeList({
        query,
        page,
        limit,
        populate: [
          {
            path: 'createdBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'updatedBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
        ],
      });
    } else {
      result = await attributeOptionService.getAttributeList({
        query,
        populate: [
          {
            path: 'createdBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'updatedBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
        ],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attribute fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getAttributeOptionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attributeData = await attributeOptionService.findAttributeOptionById(req.params.attributeId);
    res.status(200).json({
      success: true,
      message: 'Attribute Option Fetched Successfully',
      data: attributeData,
    });
  } catch (err) {
    next(err);
  }
};
