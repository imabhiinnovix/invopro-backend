import { Request, Response, NextFunction } from 'express';
import * as attributeOptionService from '../../database/services/attributeOption.services';

export const createAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attributeName, attributeValue } = req.body;
    const { organizationId, userId } = req.user;

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
    const { userId } = req.user;

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
    if (search) query.name = { $regex: search, $options: 'i' };

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
