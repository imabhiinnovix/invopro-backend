import { Request, Response, NextFunction } from 'express';
import * as entityService from '../../database/services/entity.services';

export const createEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, attributes } = req.body;
    const { organizationId, userId } = req.user;

    const entity = await entityService.createEntity({
      name,
      description,
      attributes,
      organizationId,
      createdBy: userId,
      isActive: true,
    });
    res.status(201).json({
      success: true,
      message: 'Entity created successfully',
      data: entity,
    });
  } catch (err) {
    next(err);
  }
};

export const listEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await entityService.getEntityList({
        query,
        page,
        limit,
      });
    } else {
      result = await entityService.getEntityList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Entity fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};
