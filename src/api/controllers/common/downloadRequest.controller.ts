/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

import {
  listDownloadRequest,
  getDownloadRequest,
} from "../../../database/services/common/downloadRequest.service";

/**
 * ----------------------------------------------------
 * LIST DOWNLOAD REQUESTS  (WITH REQUIRED PAGINATION FORMAT)
 * ----------------------------------------------------
 */
export const listDownloadRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sort
    } = req.query;

    const {organizationId, userId} = req.user;

    const query: any = {organizationId, userId};

    // Optional search by file name
    if (search) {
      query.fileName = { $regex: search, $options: "i" };
    }

    // Optional status filter
    if (status) {
      query.status = status;
    }

    const { data, totalCount } = await listDownloadRequest({
      query,
      page: Number(page),
      limit: Number(limit),
      sort: sort ? sort : {createdAt: -1},
      populate: ["userId", "organizationId", "dataSourceId"],
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalRecords: totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ----------------------------------------------------
 * DOWNLOAD GENERATED FILE (by ID)
 * ----------------------------------------------------
 */
export const downloadRequestFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const {organizationId, userId} = req.user;

    const doc = await getDownloadRequest({ _id: id, organizationId, userId });

    if (!doc.filePath || !doc.fileName) {
      return res.status(400).json({
        success: false,
        message: "File not generated yet",
      });
    }

    const fileFullPath = path.join(doc.filePath, doc.fileName);

    if (!fs.existsSync(fileFullPath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    // Send file to user
    res.download(fileFullPath, doc.fileName, (err) => {
      if (err) return next(err);
    });
  } catch (err) {
    next(err);
  }
};