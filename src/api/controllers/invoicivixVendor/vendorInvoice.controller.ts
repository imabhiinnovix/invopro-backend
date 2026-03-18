/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as vendorInvoiceService from '../../../database/services/invoicivixVendor/vendorInvoice.service';
import { Types } from 'mongoose';
import { findVendorById } from '../../../database/services/invoicivixVendor/vendor.service';

export const createVendorInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, userId } = req.user;
    const {
      vendorId,
      invoiceNumber,
      invoiceDate,
      invoiceTotalServiceFee,
      invoiceTotalOfficialFee,
      invoiceStatus,
      status
    } = req.body;

    // ✅ Validate vendor
    const vendor = await findVendorById(vendorId);
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found"
      });
    }

    // ✅ Duplicate invoice check
    const existingInvoice = await vendorInvoiceService.findOneByQuery({
      organizationId,
      invoiceNumber
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: "Invoice number already exists"
      });
    }

    // ✅ Calculate total
    const totalValue =
      (invoiceTotalServiceFee || 0) +
      (invoiceTotalOfficialFee || 0);

    const invoice = await vendorInvoiceService.createVendorInvoice({
      organizationId,
      userId,
      vendorId,
      invoiceNumber,
      invoiceDate,
      invoiceTotalServiceFee,
      invoiceTotalOfficialFee,
      invoiceTotalValue: totalValue,
      invoiceStatus,
      status
    });

    res.status(201).json({
      success: true,
      message: "Vendor Invoice created successfully",
      data: invoice
    });

  } catch (err) {
    next(err);
  }
};

export const getVendorInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await vendorInvoiceService.findVendorInvoiceById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (err) {
    next(err);
  }
};

export const updateVendorInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatePayload = { ...req.body };

    // ✅ Recalculate total if fees updated
    if (
      updatePayload.invoiceTotalServiceFee !== undefined ||
      updatePayload.invoiceTotalOfficialFee !== undefined
    ) {
      updatePayload.invoiceTotalValue =
        (updatePayload.invoiceTotalServiceFee || 0) +
        (updatePayload.invoiceTotalOfficialFee || 0);
    }

    const invoice = await vendorInvoiceService.updateVendorInvoice(
      req.params.invoiceId,
      updatePayload
    );

    res.status(200).json({
      success: true,
      message: 'Vendor Invoice updated successfully',
      data: invoice
    });

  } catch (err) {
    next(err);
  }
};

export const deleteVendorInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await vendorInvoiceService.deleteVendorInvoice(req.params.invoiceId);

    res.status(200).json({
      success: true,
      message: 'Vendor Invoice deleted successfully',
      data: invoice
    });

  } catch (err) {
    next(err);
  }
};

export const getVendorInvoiceList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, vendorId } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if (vendorId) query.vendorId = vendorId;
    if (!isSuperUser) query.organizationId = new Types.ObjectId(organizationId);

    if (search) {
      query.invoiceNumber = { $regex: search, $options: 'i' };
    }

    const result = await vendorInvoiceService.getVendorInvoiceList({
      query,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      message: 'Vendor Invoices fetched successfully',
      data: result.data,
      totalCount: result.totalCount
    });

  } catch (err) {
    next(err);
  }
};