/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from 'express';
import * as businessUnitService from '../../../database/services/common/businessUnit.services';
import { Types } from 'mongoose';

/**
 * =========================
 * Get Business Unit List
 * =========================
 */
export const getBusinessUnitList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const { data, totalCount } =
      await businessUnitService.getAllBusinessUnits({
        query,
        page,
        limit,
      });

    res.status(200).json({
      success: true,
      message: 'Business Units fetched successfully',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * =========================
 * Create Business Unit
 * =========================
 */
export const createBusinessUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { queryOrganizationId }: any = req.query;
    const { userId } = req.params;
    let { organizationId, isSuperUser } = req.user;

    if (queryOrganizationId && isSuperUser) {
      organizationId = new Types.ObjectId(queryOrganizationId);
    }

    const businessUnit = await businessUnitService.createBusinessUnit({
      ...req.body,
      organizationId,
      createdBy: userId,
      updatedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Business Unit created successfully',
      data: businessUnit,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * =========================
 * Update Business Unit
 * =========================
 */
export const updateBusinessUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    // Pick only provided fields
    const updateData: any = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    updateData.updatedBy = userId;

    const businessUnit = await businessUnitService.updateBusinessUnit(
      req.params.businessUnitId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: 'Business Unit updated successfully',
      data: businessUnit,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * =========================
 * Delete Business Unit
 * =========================
 */
export const deleteBusinessUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await businessUnitService.deleteBusinessUnit(
      req.params.businessUnitId
    );

    res.status(200).json({
      success: true,
      message: 'Business Unit deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};