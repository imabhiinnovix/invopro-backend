import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fsPromises from 'fs/promises';
import * as dashboardFontService from '../../../database/services/common/dashboardFont.services';

export async function createDashboardFont(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, organizationId } = req.user;
    const { fontName } = req.body;
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();

    if (!files || files.length === 0) {
      throw new Error('No file uploaded');
    }

    for (const file of files) {
      const { originalname, path: tempPath } = file;
      const fileExtension = originalname.split('.').pop()?.toLowerCase();

      // Only allow font file types (you can adjust allowed types)
      const allowedExtensions = ['ttf', 'otf', 'woff', 'woff2'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        await fsPromises.unlink(tempPath);
        throw new Error(`Invalid font file format: ${fileExtension}`);
      }

      // Store file under uploads/{org}/{user}/fonts
      const newFilePath = path.join('uploads', organizationId.toString(), userId.toString(), 'fonts', originalname);
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(tempPath, newFilePath);

      await dashboardFontService.createFont({
        name: fontName,
        filePath: newFilePath,
        organizationId,
      });

      return res.status(201).json({
        success: true,
        message: 'Dashboard font uploaded successfully',
      });
    }
  } catch (e) {
    console.error(e);
    next(e);
  }
}

export async function updateDashboardFont(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, organizationId } = req.user;
    const { fontId, fontName } = req.body;

    const file = (req as any).file || (Array.isArray(req.files) ? req.files[0] : Object.values(req.files || {})[0]);
    let fontData: any = {};

    if (file) {
      const { originalname, path: tempPath } = file;
      const fileExtension = originalname.split('.').pop()?.toLowerCase();

      // Allowed font types
      const allowedExtensions = ['ttf', 'otf', 'woff', 'woff2'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        await fsPromises.unlink(tempPath);
        throw new Error(`Invalid font file format: ${fileExtension}`);
      }

      // Get old font to delete the old file
      const oldFont = await dashboardFontService.findFontById(fontId);
      if (!oldFont) throw new Error('Font not found');

      // Remove old file if exists
      if (oldFont.filePath) {
        try {
          await fsPromises.unlink(oldFont.filePath);
        } catch (err) {
          console.warn('Old font file not found for deletion:', oldFont.filePath);
        }
      }

      // Store new file
      const newFilePath = path.join('uploads', organizationId.toString(), userId.toString(), 'fonts', originalname);
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(tempPath, newFilePath);

      fontData.filePath = newFilePath;
    }

    fontData.name = fontName;

    await dashboardFontService.updateFont(fontId, fontData);

    return res.status(200).json({
      success: true,
      message: 'Dashboard font updated successfully',
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
}

export const getDashboardFontList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { page = 1, limit = 10, sortField = 'updatedAt', sortOrder = -1, select = '', paginate = true } = req.query;

    // Build query: fetch only fonts of the current organization
    const query: any = { organizationId };

    // Sorting object
    const sort: Record<string, any> = { [sortField as string]: Number(sortOrder) };

    const result = await dashboardFontService.getFontList({
      query,
      select,
      page: Number(page),
      limit: Number(limit),
      sort,
      paginate: paginate === 'true' || paginate === true,
    });

    return res.status(200).json({
      success: true,
      message: 'Dashboard fonts retrieved successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
