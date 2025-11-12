import { Request, Response, NextFunction } from 'express';
import * as NotificationTypeService from '../../../database/services/notivix/notificationType.service';
import { getAISummary } from '../../../database/services/notivix/aiModel.service';

export const createNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, dataSourceId, triggerFieldId, conditionGroups, conditionSummaryGroups } = req.body;
    const { organizationId, userId } = req.user;

    // 1 Create record first — without waiting for AI
    const data = await NotificationTypeService.createNotificationType({
      organizationId,
      userId,
      name,
      dataSourceId,
      triggerFieldId,
      conditionGroups,
      summary: "", // temporarily empty
    });

    // 2️ Call AI service asynchronously — don’t await
    getAISummary(conditionSummaryGroups)
      .then(async (summary) => {
        if (summary) {
          // save summary later (background)
          await NotificationTypeService.updateNotificationType(
            { _id: data._id, organizationId },
            { summary }
          );
        }
      })
      .catch((err) => {
        console.error("AI summary background task failed:", err.message);
      });

    // 3️ Respond immediately
    res.status(201).json({
      success: true,
      message: "Notification Type Created Successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, dataSourceId, triggerFieldId, conditionGroups, conditionSummaryGroups } = req.body;
    const { organizationId, userId } = req.user;

    // 1️ Update main record immediately
    const data = await NotificationTypeService.updateNotificationType(
      { _id: req.params.id, organizationId },
      {
        name,
        dataSourceId,
        triggerFieldId,
        conditionGroups,
        updatedBy: userId,
      }
    );

    // 2️ Trigger AI in background
    getAISummary(conditionSummaryGroups)
      .then(async (summary) => {
        if (summary) {
          await NotificationTypeService.updateNotificationType(
            { _id: req.params.id, organizationId },
            { summary }
          );
        }
      })
      .catch((err) => {
        console.error("AI summary background task failed:", err.message);
      });

    res.status(200).json({
      success: true,
      message: "Notification Type Updated Successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    await NotificationTypeService.deleteNotificationType({
      _id: req.params.id,
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Type Deleted Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const listNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { search, dataSourceId, page = 1, limit = 10, sort } = req.query;

    const parsedPage = parseInt(page as string, 10) || 1;
    const parsedLimit = parseInt(limit as string, 10) || 10;

    const query: any = { organizationId, status: 'active' };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (dataSourceId) {
      query.dataSourceId = dataSourceId;
    }

    const result = await NotificationTypeService.listNotificationType({
      query,
      page: parsedPage,
      limit: parsedLimit,
      sort: sort ? JSON.parse(sort as string) : { updatedAt: -1 },
      populate: ['dataSourceId','userId'],
    });

    const totalPages = Math.ceil(result.totalCount / parsedLimit);

    res.status(200).json({
      success: true,
      message: 'Notification Types Retrieved Successfully',
      data: result.data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        totalRecords: result.totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getNotificationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;

    const data = await NotificationTypeService.getNotificationType({
      _id: req.params.id,
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: 'Notification Type Retrieved Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getNotificationTypeSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user;
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: "Notification Type ID (_id) is required",
      });
    }

    // 🔍 Fetch summary from DB
    const notificationType = await NotificationTypeService.getNotificationType(
      { _id, organizationId }
    );

    if (!notificationType) {
      return res.status(404).json({
        success: false,
        message: "Notification Type not found",
      });
    }

    const result = notificationType.summary || "Notification emails trigger if a record meets active status/flag criteria, *and* satisfies complex conditions based on its processing phase (e.g., National Phase), type (e.g., EP, IN, WO), and involved IP teams. A date-based trigger requires a specific field to be 6-15 days old with another blank, plus a final 'Y' condition.";

    // ✅ Return summary
    res.status(200).json({
      success: true,
      message: "Notification Type Summary Retrieved Successfully",
      data: { result },
    });
  } catch (err) {
    next(err);
  }
};
