import { Request, Response, NextFunction } from 'express';
import * as attributeOptionService from '../../../database/services/common/attributeOption.services';
import { getUniqueColumnValuesFromXLSXFile } from '../../../utils/excel.utils';
import { unlink } from 'fs/promises';
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
      attributeValue: attributeValue || [],
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
                $expr: { $eq: ['$attributes.optionAttributeId', '$$optionIdStr'] },
              },
            },
            {
              $project: {
                attributeId: '$attributes._id',
              },
            },
          ],
          as: 'attributeMeta',
        },
      },
      {
        $addFields: {
          attributeId: {
            $ifNull: [{ $arrayElemAt: ['$attributeMeta.attributeId', 0] }, null],
          },
        },
      },
      // Populate createdBy
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByUser',
        },
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
                    lastName: '$$user.lastName',
                  },
                },
              },
              null,
            ],
          },
        },
      },
      // Populate updatedBy
      {
        $lookup: {
          from: 'users',
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedByUser',
        },
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
                    lastName: '$$user.lastName',
                  },
                },
              },
              '$$REMOVE', // This removes the field if condition is false (i.e., no user)
            ],
          },
        },
      },

      {
        $project: {
          attributeMeta: 0,
          createdByUser: 0,
          updatedByUser: 0,
          __v: 0,
        },
      },
    ];

    const { data, totalCount } = await attributeOptionService.executeAttributeOptionQuery({
      pipeline,
      paginate: paginate === 'true',
      page,
      limit,
      matchQuery,
    });

    res.status(200).json({
      success: true,
      message: 'Attribute fetched successfully',
      data,
      totalCount,
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

export const createAttributeOptionWithFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attributeName, columnNumber, startRow } = req.body;
    const { organizationId, userId } = req.user;
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();
    if (!files || files.length == 0) {
      return res.status(400).json({ success: false, message: 'Excel file path is required.' });
    }

    const { path: filePath } = files[0];
    const colIndex = Number(columnNumber);
    const rowStart = Number(startRow);

    if (!attributeName || !colIndex || !rowStart) {
      await unlink(filePath).catch((unlinkErr) => {
        console.error('Failed to delete uploaded file:', unlinkErr.message);
      });
      return res.status(400).json({
        success: false,
        message: 'attributeName, columnNumber, and startRow are required.',
      });
    }

    const attributeValue = await getUniqueColumnValuesFromXLSXFile(filePath, colIndex, rowStart);

    const existing = await attributeOptionService.findAttributeByNameAndOrganization(attributeName, organizationId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attribute Option Name Already Exists' });
    }

    const attribute = await attributeOptionService.createAttribute({
      attributeName,
      attributeValue,
      organizationId,
      createdBy: userId,
      isActive: true,
    });

    await unlink(filePath).catch((unlinkErr) => {
      console.error('Failed to delete uploaded file:', unlinkErr.message);
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

export const updateAttributeOptionWithFile = async (req: Request, res: Response, next: NextFunction) => {
  const { attributeName, columnNumber, startRow, attributeOptionId } = req.body;
  const { organizationId, userId } = req.user;

  const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: 'Excel file is required.' });
  }

  const { path: filePath } = files[0];
  const colIndex = Number(columnNumber);
  const rowStart = Number(startRow);

  if (!attributeName || !colIndex || !rowStart) {
    await unlink(filePath).catch((err) => {
      console.error('Failed to delete uploaded file:', err.message);
    });
    return res.status(400).json({
      success: false,
      message: 'attributeName, columnNumber, and startRow are required.',
    });
  }

  try {
    const attributeValue = await getUniqueColumnValuesFromXLSXFile(filePath, colIndex, rowStart);

    const existing = await attributeOptionService.findAttributeOptionById(attributeOptionId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Attribute Option not found.' });
    }

    // Check if another attribute with same name exists
    const duplicate = await attributeOptionService.findAttributeByNameAndOrganization(attributeName, organizationId);
    if (duplicate && String(duplicate._id) !== attributeOptionId) {
      return res
        .status(400)
        .json({ success: false, message: 'Another attribute option with this name already exists.' });
    }

    const updated = await attributeOptionService.updateAttribute(attributeOptionId, {
      attributeName,
      attributeValue,
      updatedBy: userId,
    });

    res.status(200).json({
      success: true,
      message: 'Attribute updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  } finally {
    await unlink(filePath).catch((err) => {
      console.error('Failed to delete uploaded file:', err.message);
    });
  }
};
