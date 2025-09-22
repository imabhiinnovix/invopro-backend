/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import * as departmentService from '../../../database/services/common/department.services';
import { Types } from 'mongoose';

// Get Department List
export const getDepartmentList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, queryOrganizationId, status }: any = req.query;
    const { isSuperUser, organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};

    if (typeof search === 'string' && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (queryOrganizationId && isSuperUser) {
      query.organizationId = new Types.ObjectId(queryOrganizationId);
    } else {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const { data, totalCount } = await departmentService.getAllDepartments({ query, page, limit });

    res.status(200).json({
      success: true,
      message: 'Departments fetched successfully',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

// Create Department
export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { queryOrganizationId }: any = req.query;
    const { userId } = req.params;
    let { organizationId, isSuperUser } = req.user;

    if (queryOrganizationId && isSuperUser) {
      organizationId = new Types.ObjectId(queryOrganizationId);
    }
    const dept = await departmentService.createDepartment({
      ...req.body,
      organizationId: organizationId,
      createdBy: userId,
      updatedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: dept,
    });
  } catch (err) {
    next(err);
  }
};

// Update Department
export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // pick only provided fields
    const updateData: any = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // always set updatedBy
    updateData.updatedBy = userId;

    const dept = await departmentService.updateDepartment(req.params.departmentId, updateData);

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: dept,
    });
  } catch (err) {
    next(err);
  }
};

// Delete Department
export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await departmentService.deleteDepartment(req.params.departmentId);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
