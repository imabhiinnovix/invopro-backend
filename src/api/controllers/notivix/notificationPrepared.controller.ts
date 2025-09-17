import { Request, Response, NextFunction } from "express";
import { prepareTodayNotifications } from "../../../cronServices/prepareNotificationsForSlot";
import { countPreparedNotifications, listPreparedNotifications } from "../../../database/services/notivix/preparedNotification.service";
import { flattenObject, formatDate, generateNotificationAttachments, getRecipientName, parseTemplate } from "../../../utils/notification.utils";

export const triggerPrepareTodayNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(`[${new Date().toISOString()}] On-demand trigger called`);

    const { isForce = false } = req.body;

    await prepareTodayNotifications(isForce);

    res.status(200).json({
      success: true,
      message: "prepareTodayNotifications executed successfully",
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] On-demand trigger failed:`, err);
    next(err);
  }
};


export const listNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "scheduledAt",
      sortOrder = "desc",
      status,
      organizationId,
      fromDate,
      toDate,
    } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (organizationId) query.organizationId = organizationId;
    if (fromDate || toDate) {
      query.scheduledAt = {};
      if (fromDate) query.scheduledAt.$gte = new Date(fromDate as string);
      if (toDate) query.scheduledAt.$lte = new Date(toDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === "asc" ? 1 : -1,
    };

    // ✅ Fetch notifications and total count
    const [notifications, total] = await Promise.all([
      listPreparedNotifications({
        query,
        populate: [
          "templateId",
          "notificationTriggerId",
          "notificationTypeId",
          "frequencySettingId",
          "mediumSettingId",
          "acknowledgeId", // <-- populate acknowledgeId
        ],
        skip,
        limit: Number(limit),
        sort,
      }),
      countPreparedNotifications(query),
    ]);

    const todayDate = formatDate(new Date());

    const data = await Promise.all(
      notifications.map(async (notif: any) => {
        const template = notif.templateId;
        const freqSetting = notif.frequencySettingId;
        const trigger = notif.notificationTriggerId;
        const acknowledge = notif.acknowledgeId;

        let alert_content = "";
        let subject = "";

        const lastUploadedDate = trigger?.actionsLastUploadedDate
          ? formatDate(new Date(trigger.actionsLastUploadedDate))
          : null;

        // generate attachments if required
        // const attachments = freqSetting?.attachmentRequired
        //   ? await generateNotificationAttachments(notif, template)
        //   : [];

        /* -------- SINGLE template -------- */
        if (template?.type === "single") {
          const rowKey = Object.keys(notif.payload || {})[0];
          const rowData = notif.payload?.[rowKey]?.[0]?.rowData || {};
          const recipientTo = notif.recipients?.recipient_to?.[0];

          const context: Record<string, any> = {
            ...rowData,
            todayDate,
            lastUploadedDate,
            acknowledgeIdentifierKey: acknowledge?.identifierKey,
            acknowledgeId: acknowledge?._id,
            baseFrontendUrl: process.env.BASE_FRONTEND_URL,
            recipientName: getRecipientName(recipientTo),
          };

          if (context.DueDate) {
            const dueDate = new Date(context.DueDate);
            context.DueDate = formatDate(dueDate);

            const diffDays = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
            if (diffDays < 0) {
              context.DaysRemaining = Math.abs(diffDays);
            } else {
              context.DaysPassed = diffDays;
            }
          }

          const parseSubject = parseTemplate(template.subject, context);
          const body = parseTemplate(template.body, context);
          alert_content = body;
          subject = parseSubject;
        }

        /* -------- OVERALL template -------- */
        else if (template?.type === "overall") {
          const groups: Array<{ groupKey: string; rows: Record<string, any>[] }> = [];
          let firstRow: Record<string, any> | null = null;

          for (const [groupKey, rows] of Object.entries(notif.payload || {})) {
            const rowArray = rows as Array<{ rowData: Record<string, any> }>;
            if (!firstRow && rowArray.length > 0) firstRow = flattenObject(rowArray[0].rowData);

            groups.push({
              groupKey,
              rows: rowArray.map((r) => {
                const rd = r.rowData || {};
                const flattened = flattenObject(rd);
                const dueDate = rd.DueDate ? new Date(rd.DueDate) : null;

                let DaysRemaining: number | null = null;
                let DaysPassed: number | null = null;
                if (dueDate) {
                  const diffDays = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
                  if (diffDays < 0) DaysRemaining = Math.abs(diffDays);
                  else DaysPassed = diffDays;
                }

                return {
                  ...flattened,
                  DaysRemaining,
                  DaysPassed,
                  AssignedTo: rd.Assignedto || "-",
                  DueDate: dueDate ? formatDate(dueDate) : null,
                };
              }),
            });
          }

          const recipientTo = notif.recipients?.recipient_to?.[0];
          const context = {
            ...(firstRow || {}),
            groups,
            todayDate,
            lastUploadedDate,
            acknowledgeIdentifierKey: acknowledge?.identifierKey,
            acknowledgeId: acknowledge?._id,
            baseFrontendUrl: process.env.BASE_FRONTEND_URL,
            recipientName: getRecipientName(recipientTo),
          };

          const parseSubject = parseTemplate(template.subject, context);
          const body = parseTemplate(template.body, context);
          alert_content = body;
          subject = parseSubject;
        }

        return {
          ...(notif.toObject?.() || notif),
          subject,
          alert_content,
          // attachments, // return attachments
        };
      })
    );

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to fetch prepared notifications`, err);
    next(err);
  }
};

