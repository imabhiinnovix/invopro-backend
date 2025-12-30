/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import * as designationService from '../../../database/services/common/designation.services';
import { Types } from 'mongoose';

// Get Designation List
export const getDesignationList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, queryOrganizationId, departmentId, status }: any = req.query;
    let { isSuperUser, organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};

    if (typeof search === 'string' && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (departmentId) {
      query.departmentId = new Types.ObjectId(departmentId);
    }

    if (queryOrganizationId && isSuperUser) {
      query.organizationId = new Types.ObjectId(queryOrganizationId);
    } else {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const { data, totalCount } = await designationService.getAllDesignations({
      query,
      page,
      limit,
      populate: ['departmentId'],
    });

    res.status(200).json({
      success: true,
      message: 'Designations fetched successfully',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

// Create Designation
// Create Designation
export const createDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { queryOrganizationId }: any = req.query;
    const { userId } = req.user;
    let { organizationId, isSuperUser } = req.user;

    if (queryOrganizationId && isSuperUser) {
      organizationId = new Types.ObjectId(queryOrganizationId);
    }

    // DUPLICATE CHECK (same department + active)
    const existingDesig = await designationService.findDesignation({
      organizationId,
      departmentId: req.body.departmentId,
      name: req.body.name,
      status: 'active',
    });

    if (existingDesig.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Designation with this name already exists in this department',
      });
    }

    const desig = await designationService.createDesignation({
      ...req.body,
      organizationId: organizationId,
      createdBy: userId,
      updatedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: desig,
    });
  } catch (err) {
    next(err);
  }
};

// Update Designation
export const updateDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user;

    // pick only provided fields
    const updateData: any = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // always set updatedBy
    updateData.updatedBy = userId;

    // DUPLICATE CHECK (only if name or department changes)
    if (updateData.name || updateData.departmentId) {
      const existingDesig = await designationService.findDesignation({
        _id: { $ne: req.params.designationId },
        organizationId,
        departmentId: updateData.departmentId,
        name: updateData.name,
        status: 'active',
      });

      if (existingDesig.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Designation with this name already exists in this department',
        });
      }
    }

    const desig = await designationService.updateDesignation(req.params.designationId, updateData);

    res.status(200).json({
      success: true,
      message: 'Designation updated successfully',
      data: desig,
    });
  } catch (err) {
    next(err);
  }
};

// Delete Designation
export const deleteDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await designationService.deleteDesignation(req.params.designationId);

    res.status(200).json({
      success: true,
      message: 'Designation deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
