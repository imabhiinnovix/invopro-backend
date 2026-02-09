import { Request, Response, NextFunction } from 'express';
import * as entityService from '../../../database/services/common/entity.services';

export const createEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, mappingName, description, attributes } = req.body;
    const { organizationId, userId } = req.user;
    const entityDetails = await entityService.findEntityByNameAndOrganization(name, organizationId);
    if (entityDetails) {
      return res.status(400).json({ success: false, message: 'Entity Name already exists' });
    }

    const newEntity = await entityService.createEntity({
      name,
      mappingName,
      description,
      attributes,
      organizationId,
      createdBy: userId,
      isActive: true,
    });

     // 3. Auto-create datasource for this entity
    await entityService.autoCreateDataSourceForEntity(newEntity, req.user);

    res.status(201).json({
      success: true,
      message: 'Entity created successfully',
    });
  } catch (err) {
    console.log('error',err);
    next(err);
  }
};

export const updateEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, mappingName, description, attributes } = req.body;
    const { userId, organizationId } = req.user;
    const entityDetails: any = await entityService.findEntityByNameAndOrganization(name, organizationId);
    if (entityDetails && entityDetails._id.toString() != req.params.entityId) {
      return res.status(400).json({ success: false, message: 'Entity Name already exists' });
    }
    await entityService.updateEntity(req.params.entityId, {
      name,
      mappingName,
      description,
      attributes,
      updatedBy: userId,
    });
    res.status(201).json({
      success: true,
      message: 'Entity Updated Successfully',
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
    const { organizationId } = req.user;
    const query: any = { organizationId, isActive: true, isVisible: true };
    if (search) query.name = { $regex: search, $options: 'i' };

    let result: any = {};
    if (paginate) {
      result = await entityService.getEntityList({
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
      result = await entityService.getEntityList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Entity Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getEntityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityData = await entityService.findEntityById(req.params.entityId);
    const entityFieldOptions = await entityService.getEntityFieldOptions(req.params.entityId);
    // Convert to plain object with type assertion so TypeScript allows adding custom props
    const entityObject = (entityData?.toObject ? entityData.toObject() : entityData) as any;

    // Append the custom field
    entityObject.entityFieldOptions = entityFieldOptions;
    res.status(200).json({
      success: true,
      message: 'Entity Data Fetched Successfully',
      data: entityObject,
    });
  } catch (err) {
    next(err);
  }
};
