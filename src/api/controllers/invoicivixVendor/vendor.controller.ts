/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as vendorService from '../../../database/services/invoicivixVendor/vendor.service';
import { Types } from 'mongoose';
import { findDataSourceByCodeAndOrganization } from '../../../database/services/common/dataSource.services';
import { createSingleRowVersionValue } from '../common/dataSourceVersion.controller';
import { createSingleRowVersionValueService, updateSingleRowVersionValueService } from '../../../database/services/common/defaultDataSourceVersionValue.services';

/**
 * ================================
 * CREATE VENDOR
 * ================================
 */
export const createVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, userId, isSuperUser } = req.user;

    const {
      name,
      aliasName,
      description,
      status,

      // Contact
      email,
      phone,
      countryCode,
      mobile,

      // Address
      address1,
      address2,
      city,
      state,
      zip,
      country,

      // Tax
      taxId,
      pan,

      // Billing
      defaultCurrency,

      // Engagement
      isEngagementLetter,
      engagementLetterId,

      // Primary Bank
      primaryBankDetails,

      // Intermediary Bank
      intermediaryBankName,
      intermediaryBankAddress1,
      intermediaryBankAddress2,
      intermediaryBankSwiftCode,
      intermediaryBeneficiaryAccountNumber,
      intermediaryBeneficiaryContactName,
      intermediaryBeneficiaryContactEmail,
    } = req.body;

    // Check duplicate vendor code
    /**
     * CODE GENERATION
     * FORMAT:
     * NAME4-COUNTRY-YEAR-SUB-001
     */

    const namePrefix = name
      ?.replace(/[^a-zA-Z]/g, '')
      ?.substring(0, 4)
      ?.toUpperCase()
      ?.padEnd(4, 'X');

    const countryPrefix = country?.toUpperCase() || 'XX';

    const year = new Date().getFullYear();

    const baseCode = `${namePrefix}-${countryPrefix}-${year}-VEN`;

    const count = await vendorService.countByQuery({
      organizationId,
      code: { $regex: `^${baseCode}` }
    });

    const sequence = String(count + 1).padStart(3, '0');

    const code = `${baseCode}-${sequence}`;

    // Logo upload
    let logoPath = '';
    const files = req.files as Express.Multer.File[];
    if (files?.length) {
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path.replace(
        /\\/g,
        '/'
      )}`;
    }

    const vendor = await vendorService.createVendor({
      organizationId,
      userId,

      name,
      aliasName,
      code,
      description,
      status,

      logo: logoPath,

      email,
      phone,
      countryCode,
      mobile,

      address1,
      address2,
      city,
      state,
      zip,
      country,

      taxId,
      pan,
      defaultCurrency,

      isEngagementLetter,
      engagementLetterId:
        engagementLetterId && Types.ObjectId.isValid(engagementLetterId)
          ? new Types.ObjectId(engagementLetterId)
          : null,

      // Primary Bank
      primaryBankDetails,

      // Intermediary Bank
      intermediaryBankName,
      intermediaryBankAddress1,
      intermediaryBankAddress2,
      intermediaryBankSwiftCode,
      intermediaryBeneficiaryAccountNumber,
      intermediaryBeneficiaryContactName,
      intermediaryBeneficiaryContactEmail,
    });

    const dataSource: any = await findDataSourceByCodeAndOrganization('vendor', organizationId);
    if(dataSource){
      await createSingleRowVersionValueService({
          dataSourceId: dataSource._id,
          user: req.user,
          rowData: {
            "vendor name": name,
            "vendor code": code,
            "vendor alias name": aliasName ?? ''
          }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET VENDOR BY ID
 * ================================
 */
export const getVendorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorService.findVendorById(vendorId, [
    //   { path: 'engagementLetterId' },
    ]);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor fetched successfully',
      data: vendor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * UPDATE VENDOR
 * ================================
 */
export const updateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { vendorId } = req.params;

    const { organizationId } = req.user;

    // Logo upload
    let logoPath = '';
    const files = req.files as Express.Multer.File[];
    if (files?.length) {
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path.replace(
        /\\/g,
        '/'
      )}`;
    }

    const updatePayload: any = {
      ...req.body,
    };

    if (logoPath) {
      updatePayload.logo = logoPath;
    }

    if (updatePayload.engagementLetterId) {
      updatePayload.engagementLetterId = Types.ObjectId.isValid(
        updatePayload.engagementLetterId
      )
        ? new Types.ObjectId(updatePayload.engagementLetterId)
        : null;
    }

    const vendor = await vendorService.updateVendor(
      vendorId,
      updatePayload
    );

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: 'Vendor not found' });
    }

    const dataSource: any = await findDataSourceByCodeAndOrganization(
      'vendor',
      organizationId
    );

    if (dataSource) {
      await updateSingleRowVersionValueService({
        dataSourceId: dataSource._id,
        user: req.user,
        query: {
          "rowData.vendor code": vendor.code, // 🔥 key part
          "status": 'active'
        },
        rowData: {
          "vendor name": vendor.name,
          "vendor alias name": vendor.aliasName ?? '',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE VENDOR
 * ================================
 */
export const deleteVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorService.deleteVendor(vendorId);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET VENDOR LIST (Pagination + Search)
 * ================================
 */
export const getVendorList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, paginate = true } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit =
      parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const result = await vendorService.getVendorList({
      query,
      page,
      limit,
      populate: [{ path: 'engagementLetterId' }],
      paginate
    });

    res.status(200).json({
      success: true,
      message: 'Vendors fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};