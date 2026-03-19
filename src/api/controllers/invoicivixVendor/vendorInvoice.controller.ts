import { Request, Response, NextFunction } from 'express';
import * as vendorInvoiceService from '../../../database/services/invoicivixVendor/vendorInvoice.service';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { findVendorById } from '../../../database/services/invoicivixVendor/vendor.service';

/**
 * ================================
 * CREATE VENDOR INVOICE
 * Supports multiple files upload
 * ================================
 */
export const createVendorInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, userId } = req.user;
    const { vendorId, versionValue } = req.body;

    // ✅ Validate vendor
    const vendor = await findVendorById(vendorId);
    if (!vendor) return res.status(400).json({ success: false, message: 'Vendor not found' });

    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const uploadedInvoices: any[] = [];

    for (const file of files) {
      // Destination folder: uploads/{organizationId}/vendors/{vendorId}/invoices/{versionValue}
      const uploadRoot = 'uploads';
      const destinationDir = path.join(
        uploadRoot,
        organizationId.toString(),
        'vendors',
        vendorId.toString(),
        'invoices',
        versionValue
      );

      if (!fs.existsSync(destinationDir)) fs.mkdirSync(destinationDir, { recursive: true });

      const newFileAbsolutePath = path.join(destinationDir, file.filename);
      fs.renameSync(file.path, newFileAbsolutePath);

      const fileName = file.originalname;
      const filePath = newFileAbsolutePath.replace(/\\/g, '/');

      // ✅ Check duplicate for this vendor + version + file
      const existing = await vendorInvoiceService.findOneByQuery({
        vendorId,
        versionValue,
        fileName,
        status: 'active',
      });
      if (existing) continue; // skip duplicate file

      const invoice = await vendorInvoiceService.createVendorInvoice({
        organizationId,
        userId,
        vendorId: new Types.ObjectId(vendorId),
        versionValue,
        fileName,
        filePath,
        status: 'active',
        createdBy: userId,
      });

      uploadedInvoices.push(invoice);
    }

    res.status(201).json({
      success: true,
      message: 'Vendor Invoices uploaded successfully',
      data: uploadedInvoices,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET VENDOR INVOICE BY ID
 * ================================
 */
export const getVendorInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await vendorInvoiceService.findVendorInvoiceById(req.params.invoiceId);

    if (!invoice) return res.status(404).json({ success: false, message: 'Vendor Invoice not found' });

    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE VENDOR INVOICE (soft delete)
 * ================================
 */
export const deleteVendorInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await vendorInvoiceService.deleteVendorInvoice(req.params.invoiceId);

    if (!invoice) return res.status(404).json({ success: false, message: 'Vendor Invoice not found' });

    // Delete file from storage
    if (invoice.filePath && fs.existsSync(invoice.filePath)) {
      fs.unlinkSync(invoice.filePath);
    }

    res.status(200).json({ success: true, message: 'Vendor Invoice deleted successfully', data: invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET VENDOR INVOICE LIST
 * ================================
 */
export const getVendorInvoiceList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, vendorId, versionValue } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };
    if (!isSuperUser) query.organizationId = new Types.ObjectId(organizationId);
    if (vendorId) query.vendorId = new Types.ObjectId(vendorId as string);
    if (versionValue) query.versionValue = { $regex: versionValue as string, $options: 'i' };
    if (search) query.fileName = { $regex: search as string, $options: 'i' };

    const result = await vendorInvoiceService.getVendorInvoiceList({ query, page, limit, populate: ["vendorId"]  });

    res.status(200).json({
      success: true,
      message: 'Vendor Invoices fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};