import { Request, Response, NextFunction } from 'express';
import { prepareTodayNotifications } from '../../../cronServices/prepareNotificationsForSlot';
import {
  countPreparedNotifications,
  countPreparedNotificationsAgg,
  listPreparedNotifications,
  listPreparedNotificationsAgg,
} from '../../../database/services/notivix/preparedNotification.service';
import {
  flattenObject,
  formatDate,
  generateNotificationAttachments,
  getRecipientName,
  parseTemplate,
} from '../../../utils/notification.utils';
import { Queue } from "bullmq";
import mongoose from 'mongoose';

export const triggerPrepareTodayNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[${new Date().toISOString()}] On-demand trigger called`);

    const { isForce = false } = req.body;

    const { organizationId } = req.user;

    await prepareTodayNotifications(isForce, organizationId);

    res.status(200).json({
      success: true,
      message: 'prepareTodayNotifications executed successfully',
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
      sortBy = 'sentAt',
      sortOrder = 'desc',
      status,
      organizationId: paramOrgId,
      fromDate,
      toDate,
      search,
      searchFields,
    }: any = req.query;

    // Allow query override of organizationId for super users:
    let { organizationId, isSuperUser, userId } = req.user as any;

    if (isSuperUser && paramOrgId) {
      organizationId = paramOrgId;
    }

    let searchCondition: any = [];
    if (search) {
      const regex = new RegExp(search as string, 'i');

      searchCondition = [
        { 'notificationTypeId.name': { $regex: regex } }, // string field
        { 'templateId.type': { $regex: regex } }, // string field
        { subject: { $regex: regex } },
        { status: { $regex: regex } },
      ];

      // --- Date field: sentAt
      // Convert date to string in format "DD MMM" and match
      searchCondition.push({
        $expr: {
          $regexMatch: {
            input: {
              $dateToString: { format: '%d %b %Y', date: '$sentAt' },
            },
            regex: regex,
          },
        },
      });
      const searchLower = search?.toLowerCase();
      // --- Boolean field: notificationTriggerId.isDryRun
      if (searchLower?.startsWith('yes')) {
        // treat as true
        searchCondition.push({ 'notificationTriggerId.isDryRun': true });
      } else if (searchLower?.startsWith('n')) {
        // treat as false OR missing
        searchCondition.push({
          $or: [
            { 'notificationTriggerId.isDryRun': false },
            { 'notificationTriggerId.isDryRun': { $exists: false } },
            { 'notificationTriggerId.isDryRun': null },
          ],
        });
      }
      if (Array.isArray(searchFields) && searchFields.length > 0) {
        searchFields.forEach((field: string) => {
          searchCondition.push({ [field]: { $regex: regex } });
        });
      }
    }
    const query: any = {};
    if (status) query.status = status;
    if (organizationId) query.organizationId = new mongoose.Types.ObjectId(organizationId);
    if (fromDate || toDate) {
      query.scheduledAt = {};
      if (fromDate) query.scheduledAt.$gte = new Date(fromDate as string);
      if (toDate) query.scheduledAt.$lte = new Date(toDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };
    const [notifications, total] = await Promise.all([
      listPreparedNotificationsAgg({
        query,
        search: search as string,
        skip,
        limit: Number(limit),
        sort,
        searchCondition,
      }),
      countPreparedNotificationsAgg({
        query,
        search: search as string,
        searchCondition,
      }),
    ]);

    const todayDate = formatDate(new Date());

    const data = await Promise.all(
      notifications.map(async (notif: any) => {
        const template = notif.templateId;
        const freqSetting = notif.frequencySettingId;
        const trigger = notif.notificationTriggerId;
        const acknowledge = notif.acknowledgeId;

        let alert_content = '';
        let subject = '';

        const lastUploadedDate = trigger?.actionsLastUploadedDate
          ? formatDate(new Date(trigger.actionsLastUploadedDate))
          : null;

        // generate attachments if required
        // const attachments = freqSetting?.attachmentRequired
        //   ? await generateNotificationAttachments(notif, template)
        //   : [];

        /* -------- SINGLE template -------- */
        if (template?.type === 'single') {
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
        } else if (template?.type === 'overall') {
          /* -------- OVERALL template -------- */
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
                  lastUploadedDate,
                  DaysPassed,
                  AssignedTo: rd.Assignedto || '-',
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

export const resendNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[${new Date().toISOString()}] resendNotification triggered`);

    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "notificationId is required",
      });
    }

    // Create BullMQ connection (same name as worker uses)
    const emailQueue = new Queue("emailQueue", {
      connection: {
        host: "redis", // or your Redis host
      },
    });

    // Add job to queue — worker will handle the actual sending
    await emailQueue.add("sendEmail", { notificationId });

    console.log(`[${new Date().toISOString()}] Queued resend job for notification ${notificationId}`);

    res.status(200).json({
      success: true,
      message: `Resend job queued successfully.`,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] resendNotification failed:`, err);
    next(err);
  }
};
