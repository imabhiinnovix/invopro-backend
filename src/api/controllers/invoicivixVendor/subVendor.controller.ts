/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as subVendorService from '../../../database/services/invoicivixVendor/subVendor.service';
import { Types } from 'mongoose';

export const createSubVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, userId } = req.user;

    const {
      name,
      vendorCountry,
      description,
      status,
      email,
      phone,
      countryISOCode,
      countryDialCode,
      mobile,
      primaryContactName,
      secondaryContactName,
      secondaryContactCountryISOCode,
      secondaryContactCountryDialCode,
      secondaryContactMobile,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      taxId,
      pan,
      defaultCurrency,
      vendorId,
      bankName,
      bankAddress1,
      bankAddress2,
      bankState,
      bankCountry,
      bankSwiftCode,
      bankRoutingNumber,
      bankAccountNumber,
      beneficiaryContactName,
      beneficiaryContactEmail,
      bankCity,
      bankZip,
      intermediaryBankName,
      intermediaryBankAddress1,
      intermediaryBankAddress2,
      intermediaryBankSwiftCode,
      intermediaryBeneficiaryAccountNumber,
      intermediaryBeneficiaryContactName,
      intermediaryBeneficiaryContactEmail,
      intermediaryBankCountry,
      intermediaryBankState,
      intermediaryBankCity,
      intermediaryBankZip,
    } = req.body;

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

    const countryCode = vendorCountry?.toUpperCase() || 'XX';

    const year = new Date().getFullYear();

    const baseCode = `${namePrefix}-${countryCode}-${year}-SUB`;

    const count = await subVendorService.countByQuery({
      organizationId,
      code: { $regex: `^${baseCode}` }
    });

    const sequence = String(count + 1).padStart(3, '0');

    const code = `${baseCode}-${sequence}`;

    /**
     * LOGO UPLOAD
     */

    let logoPath = '';
    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path.replace(/\\/g, '/')}`;
    }

    /**
     * CREATE SUB VENDOR
     */

    const subVendor = await subVendorService.createSubVendor({
      organizationId,
      userId,
      vendorId:
        vendorId && Types.ObjectId.isValid(vendorId)
          ? new Types.ObjectId(vendorId)
          : undefined,

      name,
      vendorCountry,
      code,
      description,
      status,

      logo: logoPath,

      email,
      phone,
      countryISOCode,
      countryDialCode,
      mobile,

      primaryContactName,

      secondaryContactName,
      secondaryContactCountryISOCode,
      secondaryContactCountryDialCode,
      secondaryContactMobile,

      address1,
      address2,
      city,
      state,
      zip,
      country,

      taxId,
      pan,

      defaultCurrency,

      bankName,
      bankAddress1,
      bankAddress2,
      bankState,
      bankCountry,
      bankSwiftCode,
      bankRoutingNumber,
      bankAccountNumber,

      beneficiaryContactName,
      beneficiaryContactEmail,

      bankCity,
      bankZip,

      intermediaryBankName,
      intermediaryBankAddress1,
      intermediaryBankAddress2,
      intermediaryBankSwiftCode,
      intermediaryBeneficiaryAccountNumber,
      intermediaryBeneficiaryContactName,
      intermediaryBeneficiaryContactEmail,

      intermediaryBankCountry,
      intermediaryBankState,
      intermediaryBankCity,
      intermediaryBankZip
    });

    res.status(201).json({
      success: true,
      message: 'SubVendor created successfully',
      data: subVendor
    });

  } catch (err) {
    next(err);
  }
};

export const getSubVendorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subVendor = await subVendorService.findSubVendorById(req.params.subVendorId);

    if (!subVendor) {
      return res.status(404).json({
        success: false,
        message: 'SubVendor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subVendor
    });

  } catch (err) {
    next(err);
  }
};

export const updateSubVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {

    let logoPath = '';

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      logoPath = `${process.env.BASE_BACKEND_URL}/${files[0].path.replace(/\\/g, '/')}`;
    }

    const updatePayload: any = {
      ...req.body
    };

    if (logoPath) {
      updatePayload.logo = logoPath;
    }

    const subVendor = await subVendorService.updateSubVendor(
      req.params.subVendorId,
      updatePayload
    );

    res.status(200).json({
      success: true,
      message: 'SubVendor updated successfully',
      data: subVendor
    });

  } catch (err) {
    next(err);
  }
};

export const deleteSubVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const subVendor = await subVendorService.deleteSubVendor(
      req.params.subVendorId
    );

    res.status(200).json({
      success: true,
      message: 'SubVendor deleted successfully',
      data: subVendor
    });

  } catch (err) {
    next(err);
  }
};

export const getSubVendorList = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { search, vendorId } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit =
      parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if(vendorId){
      query.vendorId = vendorId;
    }

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const result = await subVendorService.getSubVendorList({
      query,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      message: 'SubVendors fetched successfully',
      data: result.data,
      totalCount: result.totalCount
    });

  } catch (err) {
    next(err);
  }
};