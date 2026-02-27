/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as legalDocumentService from '../../../database/services/invoicivixVendor/legalDocument.service';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';

/**
 * ================================
 * CREATE LEGAL DOCUMENT
 * ================================
 */
export const createLegalDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.user;

    const {
      vendorId,
      documentName,
      documentDescription,
      referenceNumber,
      startDate,
      endDate,
      status,
    } = req.body;

    // Check duplicate reference number
    const existing = await legalDocumentService.findOneByQuery({
                        organizationId,
                        vendorId,
                        referenceNumber,
                    });

    if (existing) {
    return res.status(400).json({
        success: false,
        message: 'Legal Document with same reference number already exists',
    });
    }

    let legalDocumentFileName = '';
    let legalDocumentFilePath = '';

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      const file = files[0];

      const uploadRoot = 'uploads';

      const destinationDir = path.join(
        uploadRoot,
        organizationId.toString(),
        'vendors',
        vendorId,
        'legal_documents'
      );

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      const newFileAbsolutePath = path.join(destinationDir, file.filename);

      fs.renameSync(file.path, newFileAbsolutePath);

      legalDocumentFileName = file.originalname;
      legalDocumentFilePath =
        newFileAbsolutePath.replace(/\\/g, '/');
    }

    const legalDocument =
      await legalDocumentService.createLegalDocument({
        organizationId,
        vendorId: new Types.ObjectId(vendorId),
        documentName,
        documentDescription,
        referenceNumber,
        startDate,
        endDate,
        status,
        legalDocumentFileName,
        legalDocumentFilePath,
      });

    res.status(201).json({
      success: true,
      message: 'Legal Document created successfully',
      data: legalDocument,
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
export const getLegalDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { legalDocumentId } = req.params;

    const data = await legalDocumentService.findLegalDocumentById(
      legalDocumentId,
      [{ path: 'vendorId', select: 'name code' }]
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Legal Document not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Legal Document fetched successfully',
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
export const updateLegalDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { legalDocumentId } = req.params;

    const existing =
      await legalDocumentService.findLegalDocumentById(
        legalDocumentId
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Legal Document not found',
      });
    }

    const updatePayload: any = { ...req.body };

    const files = req.files as Express.Multer.File[];

    if (files?.length) {
      const file = files[0];

      const vendorId =
        updatePayload.vendorId || existing.vendorId.toString();

      const uploadRoot = 'uploads';

      const destinationDir = path.join(
        uploadRoot,
        req.user.organizationId.toString(),
        'vendors',
        vendorId,
        'legal_documents'
      );

      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      const newFileAbsolutePath = path.join(destinationDir, file.filename);

      fs.renameSync(file.path, newFileAbsolutePath);

      // Delete old file
      if (existing.legalDocumentFilePath) {
        if (fs.existsSync(existing.legalDocumentFilePath)) {
          fs.unlinkSync(existing.legalDocumentFilePath);
        }
      }

      updatePayload.legalDocumentFileName = file.originalname;
      updatePayload.legalDocumentFilePath =
        newFileAbsolutePath.replace(/\\/g, '/');
    }

    if (updatePayload.vendorId) {
      updatePayload.vendorId = new Types.ObjectId(updatePayload.vendorId);
    }

    const updated =
      await legalDocumentService.updateLegalDocument(
        legalDocumentId,
        updatePayload
      );

    res.status(200).json({
      success: true,
      message: 'Legal Document updated successfully',
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
export const deleteLegalDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { legalDocumentId } = req.params;

    const existing =
      await legalDocumentService.findLegalDocumentById(
        legalDocumentId
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Legal Document not found',
      });
    }

    if (existing.legalDocumentFilePath) {
      if (fs.existsSync(existing.legalDocumentFilePath)) {
        fs.unlinkSync(existing.legalDocumentFilePath);
      }
    }

    await legalDocumentService.deleteLegalDocument(
      legalDocumentId
    );

    res.status(200).json({
      success: true,
      message: 'Legal Document deleted successfully',
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
export const getLegalDocumentList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, vendorId } = req.query;
    const { organizationId, isSuperUser } = req.user;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit =
      parseInt(req.query.limit as string, 10) ||
      Number.MAX_SAFE_INTEGER;

    const query: any = { status: 'active' };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (vendorId) {
      query.vendorId = new Types.ObjectId(vendorId as string);
    }

    if (search) {
      query.documentName = { $regex: search, $options: 'i' };
    }

    const result =
      await legalDocumentService.getLegalDocumentList({
        query,
        page,
        limit,
        populate: [{ path: 'vendorId', select: 'name code' }],
      });

    res.status(200).json({
      success: true,
      message: 'Legal Documents fetched successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};