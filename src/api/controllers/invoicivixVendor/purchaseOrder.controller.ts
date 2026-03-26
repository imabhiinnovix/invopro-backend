/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as poService from '../../../database/services/invoicivixVendor/purchaseOrder.service';
import { Types } from 'mongoose';

/**
 * CREATE
 */
export const createPO = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const {
      poNumber,
      poDate,
      poValue,
      poCurrency,
      vendorId,

      entityCode,
      entityName,
      entityAddress,

      poCreatedBy,
      poCreationDate,

      poApprovedBy,
      poApprovedDate,

      billingEntityName,
      billingEntityAddress,
      billingEntityTaxId,

      remarks
    } = req.body;
    console.log('req.body',req.body);
    /**
     * 🔴 Required Validation
     */
    if (!poNumber || !poValue || !vendorId) {
      return res.status(400).json({
        success: false,
        message: 'poNumber, poValue and vendorId are required',
      });
    }

    /**
     * 🔴 Duplicate PO check (per org)
     */
    const existingPO = await poService.findPurchaseOrderByQuery({
      organizationId,
      poNumber,
      status: 'active',
    });

    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: 'PO Number already exists',
      });
    }

    /**
     * 🧠 Create Payload (EXPLICIT MAPPING)
     */
    const payload = {
      organizationId: new Types.ObjectId(organizationId),

      poNumber,
      poDate,

      poValue,
      poCurrency,

      balance_po_amount: poValue, // 🔥 auto set

      vendorId: new Types.ObjectId(vendorId),

      entityCode,
      entityName,
      entityAddress,

      poCreatedBy,
      poCreationDate,

      poApprovedBy,
      poApprovedDate,

      billingEntityName,
      billingEntityAddress,
      billingEntityTaxId,

      remarks,

      status: 'active',
    };

    const data = await poService.createPurchaseOrder(payload);

    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * LIST
 */
export const getPOList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const query: any = {
      organizationId,
      status: 'active',
    };

    if (req.query.vendorId) {
      query.vendorId = new Types.ObjectId(req.query.vendorId as string);
    }

    const result = await poService.getPurchaseOrderList({
      query,
      page,
      limit,
      populate: ["vendorId"]
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
 * GET BY ID
 */
export const getPOById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await poService.findPurchaseOrderById(req.params.poId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'PO not found',
      });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE
 */
export const updatePO = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await poService.updatePurchaseOrder(
      req.params.poId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'PO updated',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE
 */
export const deletePO = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await poService.deletePurchaseOrder(req.params.poId);

    res.status(200).json({
      success: true,
      message: 'PO deleted',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * SUMMARY
 */
export const getPOSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await poService.getPOSummary({ organizationId });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};