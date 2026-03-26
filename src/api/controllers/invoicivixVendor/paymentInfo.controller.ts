/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../../../database/services/invoicivixVendor/paymentInfo.service';
import Payment from '../../../database/models/invoicivixVendor/paymentInfo';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { populate } from 'dotenv';

/**
 * ================================
 * CREATE PAYMENT
 * ================================
 */
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const {
      purchaseOrderId,
      transactionId,
      referenceNo,
      referenceDate,
      invoiceNumber = [],
      creditNoteNumber = [],
      paymentDate,
      paymentCurrency,
      grossPaymentAmount,
      taxDeduction,
      actualPaymentAmount,
      bankSwiftCode,
      remarks
    } = req.body;

    if (!purchaseOrderId || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'purchaseOrderId and transactionId required',
      });
    }

    /**
     * Duplicate transaction check
     */
    const existingTxn = await paymentService.findOneByQuery({
      organizationId,
      transactionId,
      status: 'active',
    });

    if (existingTxn) {
      return res.status(400).json({
        success: false,
        message: 'transactionId already exists',
      });
    }

    /**
     * Duplicate invoice check (same PO)
     */
    if (invoiceNumber.length) {
      const duplicateInvoice = await Payment.findOne({
        organizationId,
        purchaseOrderId: new Types.ObjectId(purchaseOrderId),
        status: 'active',
        invoiceNumber: { $in: invoiceNumber },
      });

      if (duplicateInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate invoice for same PO',
        });
      }
    }

    /**
     * FILE UPLOAD
     */
    let fileName = '';
    let filePath = '';

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      const file = files[0];

      const dir = path.join(
        'uploads',
        organizationId.toString(),
        'po',
        purchaseOrderId,
        'payments'
      );

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const newPath = path.join(dir, file.filename);
      fs.renameSync(file.path, newPath);

      fileName = file.originalname;
      filePath = newPath.replace(/\\/g, '/');
    }

    const payment = await paymentService.createPayment({
      organizationId,
      purchaseOrderId: new Types.ObjectId(purchaseOrderId),
      transactionId,
      referenceNo,
      referenceDate,
      invoiceNumber,
      creditNoteNumber,
      paymentDate,
      paymentCurrency,
      grossPaymentAmount,
      taxDeduction,
      actualPaymentAmount,
      bankSwiftCode,
      paymentStatus: 'settled',
      remarks,
      bankDebitAdviceFileName: fileName,
      bankDebitAdviceFilePath: filePath,
    });

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * LIST
 * ================================
 */
export const getPaymentList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, purchaseOrderId } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const query: any = { status: 'active' };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (purchaseOrderId) {
      query.purchaseOrderId = new Types.ObjectId(purchaseOrderId as string);
    }

    if (search) {
      query.transactionId = { $regex: search, $options: 'i' };
    }

    const result = await paymentService.getPaymentList({
      query,
      page,
      limit,
      populate: ["vendorId", "purchaseOrderId"]
    });

    res.status(200).json({
      success: true,
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * SUMMARY
 * ================================
 */
export const getPaymentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { vendorName } = req.query;

    const data = await paymentService.getPaymentSummary({
      organizationId,
      vendorName
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET BY ID
 * ================================
 */
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    const data = await paymentService.findPaymentById(paymentId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * UPDATE
 * ================================
 */
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    // Find existing payment
    const existing = await paymentService.findPaymentById(paymentId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const { organizationId } = req.user;

    const payload: any = { ...req.body };

    delete payload.paymentStatus; // do not allow status update here

    if (payload.purchaseOrderId) {
      payload.purchaseOrderId = new Types.ObjectId(payload.purchaseOrderId);
    }

    /**
     * FILE UPLOAD HANDLING
     */
    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      const file = files[0];

      const dir = path.join(
        'uploads',
        organizationId.toString(),
        'po',
        existing.purchaseOrderId.toString(),
        'payments'
      );

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const newPath = path.join(dir, file.filename);
      fs.renameSync(file.path, newPath);

      payload.bankDebitAdviceFileName = file.originalname;
      payload.bankDebitAdviceFilePath = newPath.replace(/\\/g, '/');
    }

    const updated = await paymentService.updatePayment(paymentId, payload);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE
 * ================================
 */
export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    await paymentService.deletePayment(paymentId);

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};