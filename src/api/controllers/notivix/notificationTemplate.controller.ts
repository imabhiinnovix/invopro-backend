import { Request, Response, NextFunction } from 'express';
import * as notificationTemplateService from '../../../database/services/notivix/notificationTemplate.service';
import { safeFileName } from '../../../utils/common.utils';
import path from 'path';
import fsPromises from 'fs/promises';
import { Types } from 'mongoose';


export const createNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      dataSourceId,
      code,
      subject,
      body,
      type,
      groupBy: groupByRaw,
      attachmentSettings: attachmentSettingsRaw,
    } = req.body;
    const { organizationId, userId } = req.user as any;

    // parse attachmentSettings if client sent JSON string
    let attachmentSettings: any[] = [];
    if (attachmentSettingsRaw) {
      attachmentSettings = typeof attachmentSettingsRaw === 'string'
        ? JSON.parse(attachmentSettingsRaw)
        : attachmentSettingsRaw;
    }

      // parse groupBy if client sent JSON string
      let groupBy: any[] = [];
      if (groupByRaw) {
        groupBy = typeof groupByRaw === 'string'
          ? JSON.parse(groupByRaw)
          : groupByRaw;
      }

    // files uploaded by multer (field name 'attachments')
    const files = (req.files as Express.Multer.File[]) || [];

    const timestamp = Date.now().toString();

    for (const attachment of attachmentSettings) {
      // only handle pdf/image here (excel uses fieldList only)
      if (attachment.type === 'pdf' || attachment.type === 'image') {
        if (!attachment.fileName) {
          // client must provide fileName to match uploaded files
          continue;
        }

        // Find uploaded file by originalname === fileName
        const matched = files.find((f) => f.originalname === attachment.fileName);
        if (!matched) {
          // You can choose to throw 400 here instead; currently we skip if not found.
          continue;
        }

        const safeName = safeFileName(matched.originalname);
        const newFileName = `${timestamp}_${safeName}`;
        const newFilePath = path.join(
          'uploads',
          String(organizationId),
          String(dataSourceId),
          'notificationTemplates',
          newFileName
        );

        await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
        // move file from multer uploads/ to final destination
        await fsPromises.rename(matched.path, newFilePath);

        // store filePath (use leading slash if desired)
        attachment.filePath = `${newFilePath.replace(/\\/g, '/')}`;
        // ensure fileName stored is original name
        attachment.fileName = matched.originalname;
      }
      // excel: assume attachment.fieldList already present
    }
    const result = await notificationTemplateService.createNotificationTemplate({
      organizationId,
      userId,
      dataSourceId: new Types.ObjectId(dataSourceId),
      name,
      code,
      subject,
      body,
      type,
      groupBy,
      attachmentSettings,
    });

    res.status(201).json({
      success: true,
      message: 'Notification Template Created Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const listNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { page = 1, limit = 10, sort, search, paginate = true } = req.query as any;

    const { organizationId } = req.user;
    const query: any = { organizationId, status: 'active' };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (!paginate || paginate === 'false') {
      page = 1;
      limit = Number.MAX_SAFE_INTEGER; // effectively unlimited
    }

    const result = await notificationTemplateService.getNotificationTemplates({
      query,
      page: Number(page),
      limit: Number(limit),
      sort: sort ? JSON.parse(sort) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationTemplateService.getNotificationTemplateById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification Template Not Found',
      });
    }

    res.json({
      success: true,
      message: 'Notification Template Retrieved Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const updateNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      dataSourceId,
      code,
      subject,
      body,
      type,
      groupBy: groupByRaw,
      attachmentSettings: attachmentSettingsRaw,
    } = req.body;

    const { organizationId, userId } = req.user as any;
    const files = (req.files as Express.Multer.File[]) || [];

    let attachmentSettings: any[] = [];
    if (attachmentSettingsRaw) {
      attachmentSettings = typeof attachmentSettingsRaw === 'string'
        ? JSON.parse(attachmentSettingsRaw)
        : attachmentSettingsRaw;
    }

    // parse groupBy if client sent JSON string
    let groupBy: any[] = [];
    if (groupByRaw) {
      groupBy = typeof groupByRaw === 'string'
        ? JSON.parse(groupByRaw)
        : groupByRaw;
    }

    const timestamp = Date.now().toString();

    for (const attachment of attachmentSettings) {
      if ((attachment.type === 'pdf' || attachment.type === 'image') && !attachment.filePath) {
        if (!attachment.fileName) continue;
        const matched = files.find((f) => f.originalname === attachment.fileName);
        if (!matched) continue;

        const safeName = safeFileName(matched.originalname);
        const newFileName = `${timestamp}_${safeName}`;
        const newFilePath = path.join(
          'uploads',
          String(organizationId),
          String(dataSourceId),
          'notificationTemplates',
          newFileName
        );

        await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
        await fsPromises.rename(matched.path, newFilePath);

        attachment.filePath = `${newFilePath.replace(/\\/g, '/')}`;
        attachment.fileName = matched.originalname;
      }
    }

    const result = await notificationTemplateService.updateNotificationTemplate(req.params.id, {
      organizationId,
      userId,
      dataSourceId: dataSourceId ? new Types.ObjectId(dataSourceId) : undefined,
      name,
      code,
      subject,
      body,
      type,
      groupBy,
      attachmentSettings,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Notification Template Not Found' });
    }

    res.status(200).json({
      success: true,
      message: 'Notification Template Updated Successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



export const deleteNotificationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationTemplateService.deleteNotificationTemplate(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification Template Not Found',
      });
    }

    res.json({
      success: true,
      message: 'Notification Template Deleted Successfully',
    });
  } catch (error) {
    next(error);
  }
};

