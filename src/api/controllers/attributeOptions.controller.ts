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

    const matchQuery: Record<string, any> = {};
    if (search) {
      matchQuery.attributeName = { $regex: search, $options: 'i' };
    }

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'entities',
          let: { optionIdStr: { $toString: '$_id' }, orgId: '$organizationId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$organizationId', '$$orgId'] } } },
            { $unwind: '$attributes' },
            {
              $match: {
                $expr: { $eq: ['$attributes.optionAttributeId', '$$optionIdStr'] }
              }
            },
            {
              $project: {
                attributeId: '$attributes._id'
              }
            }
          ],
          as: 'attributeMeta'
        }
      },
      {
        $addFields: {
          attributeId: {
            $ifNull: [{ $arrayElemAt: ['$attributeMeta.attributeId', 0] }, null]
          }
        }
      },
      // Populate createdBy
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByUser'
        }
      },
      {
        $addFields: {
          createdBy: {
            $cond: [
              { $gt: [{ $size: '$createdByUser' }, 0] },
              {
                $let: {
                  vars: { user: { $arrayElemAt: ['$createdByUser', 0] } },
                  in: {
                    _id: '$$user._id',
                    firstName: '$$user.firstName',
                    lastName: '$$user.lastName'
                  }
                }
              },
              null
            ]
          }
        }
      },
      // Populate updatedBy
      {
        $lookup: {
          from: 'users',
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedByUser'
        }
      },
      {
        $addFields: {
          updatedBy: {
            $cond: [
              { $gt: [{ $size: '$updatedByUser' }, 0] },
              {
                $let: {
                  vars: { user: { $arrayElemAt: ['$updatedByUser', 0] } },
                  in: {
                    _id: '$$user._id',
                    firstName: '$$user.firstName',
                    lastName: '$$user.lastName'
                  }
                }
              },
              '$$REMOVE'  // This removes the field if condition is false (i.e., no user)
            ]
          }
        }
      },

      {
        $project: {
          attributeMeta: 0,
          createdByUser: 0,
          updatedByUser: 0,
          __v: 0
        }
      }
    ];


    const { data, totalCount } = await attributeOptionService.executeAttributeOptionQuery({
      pipeline,
      paginate: paginate === 'true',
      page,
      limit,
      matchQuery
    });

    res.status(200).json({
      success: true,
      message: 'Attribute fetched successfully',
      data,
      totalCount
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
