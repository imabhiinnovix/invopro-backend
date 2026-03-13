/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as vendorAttorneyService from '../../../database/services/invoicivixVendor/vendorAttorney.service';
import { Types } from 'mongoose';
import { findDataSourceByCodeAndOrganization } from '../../../database/services/common/dataSource.services';
import { createSingleRowVersionValueService } from '../../../database/services/common/defaultDataSourceVersionValue.services';
import { findVendorById } from '../../../database/services/invoicivixVendor/vendor.service';

export const createVendorAttorney = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, userType, vendorId, status } = req.body;

    // Get vendor
    const vendor = await findVendorById(vendorId);
    if (!vendor) {
      return res.status(400).json({ success: false, message: "Vendor not found" });
    }

    // First 4 letters of Vendor
    const vendorPrefix = vendor.name.replace(/\s/g, "").substring(0, 4).toUpperCase();

    // First 4 letters of Attorney Name
    const attorneyPrefix = name.replace(/\s/g, "").substring(0, 4).toUpperCase();

    // Count existing attorneys for auto increment
    const count = await vendorAttorneyService.countByQuery({ organizationId, vendorId });

    const autoNumber = String(count + 1).padStart(3, "0");

    const code = `${vendorPrefix}${attorneyPrefix}${autoNumber}`;

    const attorney = await vendorAttorneyService.createVendorAttorney({
      organizationId,
      userId,
      vendorId,
      name,
      code,
      userType,
      status
    });

    const dataSource: any = await findDataSourceByCodeAndOrganization('externalcounsel', organizationId);

    if (dataSource) {
      await createSingleRowVersionValueService({
        dataSourceId: dataSource._id,
        user: req.user,
        rowData: {
          'Law Firm Personnel': name,
          'Law Firm Personnel Code': code
        }
      });
    }

    res.status(201).json({
      success: true,
      message: "Vendor Attorney created successfully",
      data: attorney
    });

  } catch (err) {
    next(err);
  }
};

export const getVendorAttorneyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attorney = await vendorAttorneyService.findVendorAttorneyById(req.params.attorneyId);
    if (!attorney) return res.status(404).json({ success: false, message: 'Vendor Attorney not found' });
    res.status(200).json({ success: true, data: attorney });
  } catch (err) { next(err); }
};

export const updateVendorAttorney = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatePayload = { ...req.body };
    const attorney = await vendorAttorneyService.updateVendorAttorney(req.params.attorneyId, updatePayload);
    res.status(200).json({ success: true, message: 'Vendor Attorney updated successfully', data: attorney });
  } catch (err) { next(err); }
};

export const deleteVendorAttorney = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attorney = await vendorAttorneyService.deleteVendorAttorney(req.params.attorneyId);
    res.status(200).json({ success: true, message: 'Vendor Attorney deleted successfully', data: attorney });
  } catch (err) { next(err); }
};

export const getVendorAttorneyList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, vendorId } = req.query;
    const { organizationId, isSuperUser } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if(vendorId) query.vendorId = vendorId;
    if (!isSuperUser) query.organizationId = new Types.ObjectId(organizationId);
    if (search) query.name = { $regex: search, $options: 'i' };

    const result = await vendorAttorneyService.getVendorAttorneyList({ query, page, limit });
    res.status(200).json({ success: true, message: 'Vendor Attorneys fetched successfully', data: result.data, totalCount: result.totalCount });
  } catch (err) { next(err); }
};